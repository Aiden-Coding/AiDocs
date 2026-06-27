# LMAX Disruptor 极致无锁环形队列架构

在极高并发的系统设计中，诸如微秒级极端交易系统、大型消息中转站或高性能日志收集器，线程的任何阻塞和锁竞争都是对系统性能的致命摧残。

虽然 Java 并发包（JUC）提供了丰富的队列（如 `ArrayBlockingQueue`、`LinkedBlockingQueue` 等），但在极限压测下，它们往往会沦为系统的性能死穴。英国 LMAX 交易系统公司开源的 **Disruptor** 则采用了一种打破常规的**环形无锁架构**，实现了每秒单线程处理超 600 万订单的业界神话。

本篇将对比 JUC 传统队列，深度解构 Disruptor 独步天下的环形无锁架构设计。

---

## 一、 JUC 传统队列的高并发之痛

为了保证多线程安全，Java 并发包中传统的 `BlockingQueue` 实现（如 `ArrayBlockingQueue`）存在着三个难以在极限并发下克服的硬件级性能障碍：

1. **显式重锁竞争**：

   传统队列的入队（`put`）和出队（`take`）底层通常依赖 `ReentrantLock` 锁。在高并发读写交织时，线程会频繁进行锁竞争、阻塞与挂起，导致大量 CPU 上下文切换。

2. **缓存行伪共享（False Sharing）**：

   队列内部必须维护头部指针 `head` 和尾部指针 `tail`。由于这两个变量通常分配在连续的内存上，极易处于同一个 CPU 缓存行内。当生产者更新 `tail` 且消费者更新 `head` 时，两者的 CPU 缓存行会频繁互相失效，触发缓存伪共享（False Sharing），导致总线风暴。

3. **高频 GC 垃圾回收压力**：

   如 `LinkedBlockingQueue` 这种链表队列，每次入队都会 `new` 一个临时的 `Node` 节点对象，出队后又将其废弃。在千万级的高并发吞吐中，这会导致 JVM 频繁触发 Minor GC，甚至带来不可预测的 GC 停顿。

---

## 二、 Disruptor 的破局之策：环形无锁架构

为了彻底解决上述痛点，Disruptor 抛弃了传统的队列结构，重新设计了基于 **环形缓冲区（RingBuffer）** 的并发模型。

```mermaid
graph TD
    subgraph RingBuffer (环形缓冲区 - 预分配的数组)
        slot0[Slot 0]
        slot1[Slot 1]
        slot2[Slot 2]
        slot3[Slot 3]
        slot4[Slot 4]
        slot5[Slot 5]
    end
    
    Producer[Producer] -->|1. 申请写入序号 Sequence| RingBuffer
    RingBuffer -->|2. 覆盖写入 Event| slot2
    slot2 -->|3. 消费者依据 SequenceBarrier 消费| Consumer[Consumer]
```

### 1. RingBuffer：预分配的环形数组

Disruptor 的核心数据结构是 `RingBuffer`。它在物理上是一个普通的底层数组，但逻辑上被设计为首尾相连的环。

* **零 GC 垃圾回收**：

  在系统启动初始化时，`RingBuffer` 就会预先将数组中的所有插槽（Slots）实例化好（例如预先创建好所有 Event 实例）。当生产者写入数据时，**只覆盖 Event 中的属性**，而不创建新的对象。消费者读取完后也不会销毁对象。这使得整个运行周期中，堆中几乎没有新对象创建，实现了完美的 **零 GC**。

* **极速位运算定位**：

  Disruptor 要求 `RingBuffer` 的大小必须是 **2 的幂次方**（如 1024, 2048 等）。这样，通过递增序号定位数组插槽时，可以直接使用位运算代替传统的模运算：
  ```text
  index = Sequence & (bufferSize - 1)
  ```
  位运算在 CPU 执行周期上比 `%` 取模运算快几十倍。

---

### 2. Sequence：单向递增序号与缓存行填充

在 Disruptor 中，没有任何 head/tail 节点指针。取而代之的是，每一个生产者和消费者都各自独立拥有一套自增的 **`Sequence`（序号）**。

* **完全单向递增**：

  Sequence 只是一个从 0 开始且不断累加的 `long` 类型值。由于它永远单向递增，即使发生整型溢出，其底层的二进制回环也能通过位掩码正确映射到环形数组中。

* **消除伪共享**：

  为了避免多个 Sequence 在多核下发生伪共享，Disruptor 对 `Sequence` 进行了彻底的**缓存行对齐填充（Padding）**。它在核心的 `value` 变量前后各声明了 7 个无用的 `long` 变量，确保 `value` 独占一个 64 字节的缓存行，这使得线程在更新自己的 Sequence 时，完全不会干扰其他线程的缓存行。

---

### 3. 单生产者无锁写入机制

如果在整个系统中只有一个生产者往 `RingBuffer` 写入数据，Disruptor 的性能将发挥到极致：**它不包含任何锁，甚至不包含 CAS！**

1. **检查可用空间**：生产者读取消费者中最小的 Sequence，确定环形数组未满。
2. **直接内存写入**：直接获取下一个 `Sequence`，并将数据覆盖写入对应的数组插槽（由于单生产者，不存在其他线程来争抢该插槽，故无需加锁和 CAS）。
3. **发布事件**：利用 **内存屏障（Memory Barrier / Volatile Write）** 写入当前 Sequence，使消费者立刻可见。

> 在多生产者环境下，Disruptor 则会采用 CAS（Compare-And-Swap）来确保获取写入 Sequence 的原子性，但依然没有使用互斥锁（Mutex Lock）。

---

### 4. SequenceBarrier（序列屏障）协调机制

消费者要消费数据，必须知道哪些插槽里的数据已经被生产者发布完毕。
Disruptor 引入了 **`SequenceBarrier`（序列屏障）** 来实现生产与消费速率的精密协调。

* 消费者通过 `SequenceBarrier` 跟踪生产者当前发布的最新 `Sequence` 进度。
* 如果消费者的 Sequence 小于生产者已发布的 Sequence，消费者就可以无锁地连续批量读取这一段数据（批量消费优化）。
* 如果消费者速度过快，追上了生产者，`SequenceBarrier` 就会根据指定的**等待策略**让消费者挂起或自旋。

---

## 三、 消费者的等待策略（WaitStrategy）对比

当缓冲区中没有可消费的数据时，消费者的等待方式直接决定了系统的吞吐量和 CPU 开销。Disruptor 提供了多种等待策略供业务选择：

| 等待策略 | 底层原理 | 特性与开销 | 适用场景 |
| :--- | :--- | :--- | :--- |
| **`BlockingWaitStrategy`** | 使用 `ReentrantLock` 和 `Condition` 变量。 | 最节约 CPU。但由于涉及系统内核切换，延迟最高，吞吐一般。 | 吞吐要求不高，CPU 资源极度紧张的常规应用。 |
| **`YieldingWaitStrategy`** | 先自旋 100 次，若仍无数据，调用 `Thread.yield()` 让出 CPU 时间片。 | 平衡了 CPU 占用和响应延迟。延迟通常在微秒级。 | 大多数中高并发、关注低延迟的业务系统。 |
| **`BusySpinWaitStrategy`** | 底层是一个纯粹的死循环（`while` 自旋），完全不释放 CPU。 | 延迟低到极致，但会 100% 榨干一个 CPU 核心的性能。 | 极度延迟敏感的场景，如高频金融量化交易、底层核心网卡收包。 |
| **`SleepingWaitStrategy`** | 类似 `Yield`，自旋未果后进行多次 `sleep(0)` 或 `sleep(1)`。 | CPU 开销极低，但在没有新数据时会增加微秒到毫秒级的延迟抖动。 | 异步日志记录、监控指标收集等对延迟抖动不敏感的辅助系统。 |

---

## 四、 核心实战代码示例

下面是一个简单的单生产者、单消费者架构下的 Disruptor 极速上手示例：

```java
import com.lmax.disruptor.RingBuffer;
import com.lmax.disruptor.dsl.Disruptor;
import com.lmax.disruptor.dsl.ProducerType;
import com.lmax.disruptor.YieldingWaitStrategy;
import java.util.concurrent.Executors;

public class DisruptorDemo {

    // 1. 定义事件（数据载体）
    static class OrderEvent {
        private String orderId;
        public void setOrderId(String orderId) { this.orderId = orderId; }
        public String getOrderId() { return orderId; }
    }

    public static void main(String[] args) throws Exception {
        // 2. 指定 RingBuffer 大小（必须是 2 的幂）
        int bufferSize = 1024;

        // 3. 构建 Disruptor 实例
        Disruptor<OrderEvent> disruptor = new Disruptor<>(
                OrderEvent::new,                   // Event 实例化工厂，预先分配堆内存
                bufferSize,                        // 缓冲区大小
                Executors.defaultThreadFactory(),  // 消费者执行线程池
                ProducerType.SINGLE,               // 声明单生产者模式（规避 CAS，榨干性能）
                new YieldingWaitStrategy()         // 采用 Yielding 等待策略
        );

        // 4. 绑定消费者处理器
        disruptor.handleEventsWith((event, sequence, endOfBatch) -> {
            System.out.println("消费者处理订单 ID: " + event.getOrderId() + "，序号: " + sequence);
        });

        // 5. 启动 Disruptor
        disruptor.start();

        // 6. 生产者发布数据
        RingBuffer<OrderEvent> ringBuffer = disruptor.getRingBuffer();
        
        for (int i = 0; i < 100; i++) {
            // 获取下一个可用的写入 Sequence
            long sequence = ringBuffer.next();
            try {
                // 获取对应的预分配 Event 槽位
                OrderEvent orderEvent = ringBuffer.get(sequence);
                // 覆盖字段，不产生新对象
                orderEvent.setOrderId("ORDER_NO_" + i);
            } finally {
                // 发布事件，通知消费者消费
                ringBuffer.publish(sequence);
            }
        }

        // 7. 关闭服务
        disruptor.shutdown();
    }
}
```
