---
title: JUC 并发编程核心面试真题
hide_title: true
sidebar_label: JUC 面试真题
sidebar_position: 100
---

## JUC 并发编程核心面试真题

本专栏致力于为中高级 Java 开发人员提供最硬核、直击底层原理、结合生产实战的 JUC 并发编程与多线程面试真题剖析。每个知识点都配有详尽的答案、核心源码流程、以及辅助理解的 Mermaid 架构图或底层内存屏障模型。

---

## 模块二：高并发与多线程（JUC）

### Q1：深入剖析 AQS（AbstractQueuedSynchronizer）的底层多线程同步工作模型？

`AbstractQueuedSynchronizer` 是 JUC 并发包的核心基石，驱动了 `ReentrantLock`、`Semaphore`、`CountDownLatch` 等诸多高级同步锁。

```mermaid
sequenceDiagram
    autonumber
    actor ThreadA as 线程 A
    actor ThreadB as 线程 B
    participant AQS as AQS (State / CLH 队列)
    
    ThreadA->>AQS: acquire() 尝试获取独占资源
    Note over AQS: State 从 0 CAS 改为 1成功!
    AQS-->>ThreadA: 成功获取锁，继续执行
    
    ThreadB->>AQS: acquire() 尝试获取资源
    Note over AQS: State 已经是 1，获取失败
    AQS->>AQS: 将线程 B 封装为 Node 节点并入队
    Note over AQS: 双向 CLH 队列尾部插入 NodeB 并自旋挂起(LockSupport.park)
    
    ThreadA->>AQS: release() 释放资源 (State=0)
    Note over AQS: 唤醒 CLH 队列首节点的后继者 (ThreadB)
    AQS-->>ThreadB: LockSupport.unpark() 唤醒线程
    ThreadB->>AQS: 重新抢占锁 (State -> 1)
```

#### 1. 核心三大要素

- **`state` 状态标记**：

  AQS 内部物理维护了一个 `volatile int state` 变量，用来表示同步状态。通过配合 `compareAndSetState`（基于 CPU 的 CAS 指令）来实现无锁状态转换。

  - 在 `ReentrantLock` 中，`state = 0` 代表空闲，`state > 0`（支持重入）代表被持有。

- **CLH 双向 FIFO 阻塞等待队列**：

  基于自旋和双向链表构建的虚拟队列。未抢占到同步状态的线程，会被包装成一个 `Node` （包含等待状态 `waitStatus`、前驱 `prev`、后继 `next`、关联的线程引用 `thread`），并利用 CAS 安全地追加到队尾。

- **线程挂起与唤醒机制**：

  依靠 `LockSupport.park(this)` 将抢锁失败的线程安全挂起，不占用 CPU 资源。释放资源时，持有锁的线程调用 `LockSupport.unpark(s.thread)` 唤醒队列中第一个合法唤醒点（如 `nextNode`，非 `CANCELLED` 的节点）。

#### 2. 公平锁与非公平锁的 AQS 实现差异（以 ReentrantLock 为例）

- **非公平锁（NonfairSync）**：

  在调用 `lock()` 抢占锁的瞬间，当前线程会**无视队列排队**，直接进行一次 `compareAndSetState(0, 1)`。如果物理锁恰好刚刚释放、或者 state 清零，非公平线程会强行插队获得锁。

- **公平锁（FairSync）**：

  在尝试获取锁（`tryAcquire`）时，会强制调用 `hasQueuedPredecessors()` 判断 AQS 等待队列中是否有前驱节点在排队。如果有比自己更早到达的线程挂在队列中，则必须老实入队挂起，严禁插队行为。

---

### Q2：高并发中 `volatile` 关键字如何保证可见性与防范重排序？底层屏障是什么？

`volatile` 是 JVM 提供的一种轻量级多线程自同步机制，提供了两个根本性保证：**保证共享变量的可见性** 与 **禁止指令重排序（有序性）**，但**不保证原子性**（如 `i++`）。

#### 1. 保证可见性的硬件与 CPU 底层：MESI 缓存一致性协议

- JVM 会在该字段的汇编指令前添加一个 **`lock` 前缀指令**。

- `lock` 前缀指令会发出信号，使该处理器核心上对应的 Cache Line（缓存行）立即写回系统内存。

- 借助 CPU 的 **MESI 缓存一致性协议** 与 **总线嗅探技术（Bus Snooping）**，其他核心检测到该内存地址的值已改变，会将其本地 Cache 中的相应缓存行直接置为**失效（Invalid）**状态，当其他核心再次读取该变量时，被迫从主内存中重新加载。

#### 2. 禁止指令重排序：JMM 内存屏障（Memory Barrier）

编译器和 CPU 为了榨干执行效能，在不破坏单线程语义（As-if-serial）的前提下，会对指令进行优化排序。为了控制这种行为，Java 内存模型（JMM）在 `volatile` 读写操作前后插入了 $4$ 种内存屏障：

```mermaid
graph LR
    subgraph "Volatile 写入操作"
        StoreStore["StoreStore Barrier<br/>防范上方普通写与 volatile 写重排"] --> VolatileStore[volatile Store]
        VolatileStore --> StoreLoad["StoreLoad Barrier<br/>防范此处 volatile 写与下方任何读写重排"]
    end
    subgraph "Volatile 读取操作"
        VolatileLoad[volatile Load] --> LoadLoad["LoadLoad Barrier<br/>防范此处 volatile 读与下方任何读重排"]
        LoadLoad --> LoadStore["LoadStore Barrier<br/>防范此处 volatile 读与下方任何普通写重排"]
    end
```

- **`StoreStore` 屏障**：在每个 `volatile` 写操作之前插入。确保在 `volatile` 写之前，其前面所有的普通写操作均已向主内存写入。

- **`StoreLoad` 屏障**（开销最大）：在每个 `volatile` 写操作之后、以及后续任何读写操作之前插入。确保 `volatile` 写对其他处理器可见后，才能执行后续操作。

- **`LoadLoad` 屏障**：在每个 `volatile` 读操作之后、后续任何读操作之前插入。确保先前读取的数据被后续指令消费之前，重新加载了最新数据。

- **`LoadStore` 屏障**：在每个 `volatile` 读操作之后、后续任何普通写操作之前插入。确保读操作在写执行前完成。

---

### Q3：`ThreadPoolExecutor` 的核心参数如何协同？线上遇到了 OOM 问题如何排查并优雅监控调优？

#### 1. 核心参数协同与工作流

`ThreadPoolExecutor` 的工作流包含 $3$ 大物理区域（核心线程、阻塞队列、非核心线程）。

```mermaid
graph TD
    Task[提交新任务] --> Core{"当前活动线程数 < corePoolSize?"}
    Core -- 是 --> CreateCore[创建 core 线程并执行任务]
    Core -- 否 --> Queue{向 workQueue 阻塞队列加入任务能否成功?}
    Queue -- 是 --> Buffer[任务排队缓冲等待]
    Queue -- 否 --> Max{"当前活动线程数 < maximumPoolSize?"}
    Max -- 是 --> CreateNonCore[创建非核心临时线程并执行任务]
    Max -- 否 --> Reject[执行 RejectedExecutionHandler 拒绝策略]
```

- **三大缓冲拒绝机制**：

  若队列满了，且活动线程数达到 `maximumPoolSize`，会触发拒绝策略（默认 `AbortPolicy` 抛出异常；或者是 `CallerRunsPolicy` 哪个线程提交的哪个线程执行，降低产生 OOM 的缓冲压力）。

#### 2. 为什么生产环境推荐“禁止使用 `Executors` 快速创建线程池”？

- **`Executors.newFixedThreadPool()` & `newSingleThreadExecutor()`**：

  底层采用 `LinkedBlockingQueue`，其默认容量为 `Integer.MAX_VALUE`。如果生产环境遭遇突发并发，线程池核心线程全部被占用，海量任务将堆积入无界队列。这直接导致其占满老年代 JVM 内存，最终抛出 **`java.lang.OutOfMemoryError: Java heap space`**。

- **`Executors.newCachedThreadPool()`**：

  创建的线程最大值限制为 `Integer.MAX_VALUE`。这意味着在极端多任务下，为了不被队列阻塞，它会疯狂创建新线程。由于每一线程默认分配 1MB 栈内存，也会导致 **`java.lang.OutOfMemoryError: unable to create new native thread`** 崩溃。

#### 3. 动态配置、监控与调优

为了防止线程池参数硬编码无法自适应线上波动，我们可以结合配置中心（如 Nacos、Apollo）设计**动态化配置线程池**，并暴露接口提供监控：

- **动态修改方法**：`ThreadPoolExecutor` 暴露了 `setCorePoolSize`、`setMaximumPoolSize`、`setKeepAliveTime` 等运行时热变更方法。在检测到流量激增时，可直接调整分配。

- **全方位指标监控**：

  我们可以设计个后台定时轮询（或集成 Prometheus），拉取各项运行指标：

  - `getActiveCount()`：当前正在执行任务的线程数。
  - `getQueue().size()`：当前阻塞队列中堆积的任务数（极高时发出报警！）。
  - `getCompletedTaskCount()`：自初始化以来累计完成的任务数。

- **合理的参数估算公式**：

  - **CPU 密集型（计算、编解码、加解密等）**：

    频繁进行寄存器运算。
    `N_threads = N_CPU + 1`
    额外多出的 1 个线程是为了在发生偶然的 page fault 导致某个线程被操作系统挂起时，替补上去不浪费 CPU 限度。

  - **I/O 密集型（RPC 交互、MySQL 慢查询、文件读写等）**：

    由于大部分时间 CPU 处于等待 I/O 完成的空闲状态，线程数应设置得多一些。
    `N_threads = N_CPU * (1 + Wait_Time / Service_Time)`
    在标准互联网微服务中，推荐从 `2 * N_CPU` 开始试运行，并通过压测不断调优核心比。

---

### Q4：AQS `ConditionObject` 在底层执行 `await()` 和 `signal()` 时发生了什么？如果线程在 `park` 状态下遭遇外部 `interrupt` 唤醒，是如何进行两阶段中断退出的？

#### 💡 典型大厂连环追问

* **追问 1**：当调用 `signal()` 时，AQS 是怎样安全地将节点从 Condition 的单向链表物理拆除，并 CAS 挂载到 AQS 双向同步链表尾部的？若是此时 CAS 改变节点的 `waitStatus` 失败，会怎么处置？
* **追问 2**：`ConditionObject` 里标识中断的两个核心状态码：`THROW_IE (-1)` 和 `REINTERRUPT (1)` 代表的底层真实上下文到底是什么？

#### 🛠️ 核心解析答题要点

1. **双队列底层的动态迁移机制**：

   ```mermaid
   sequenceDiagram
       Note over 线程: 持有 AQS 独占锁
       线程->>Condition单向条件队列: await() 挂起, 释放 AQS 锁 并在条件队列尾创建 Node
       Condition单向条件队列-->>线程: LockSupport.park() 阻塞
       Note over 另一线程: 调用 signal() 唤醒
       另一线程->>Condition单向条件队列: 取出第一只 FirstNode
       Condition单向条件队列->>AQS双向同步队列: CAS 改变状态从 CONDITION (-2) 为 0, 然后 enq() 强挂到双向队列尾
       Note over AQS双向同步队列: 前置节点状态 CAS 设为 SIGNAL (-1) 指明后置需唤醒
       AQS双向同步队列-->>线程: LockSupport.unpark() 唤醒，开始在 AQS 里自旋抢锁
   ```

2. **条件队列挂起被中断的两阶段安全退出机制**：

   如果一个处于 `park` 阻塞的线程遭遇突发 `Thread.interrupt()`，它会瞬间苏醒。此时它必须做出最硬核的裁决：**这个中断发生在 `signal` 激发之前，还是之后？**

   - **发生在 `signal` 之前（`THROW_IE / -1`）**：
     - 底层是通过调用 `transferAfterCancelledWait(node)` 来判断的。
     - 如果线程通过 CAS 将节点的 `waitStatus` 从 `CONDITION` (-2) 成功改写为 0，说明该节点**还在**单向条件队列里，`signal` 还没有来得及操作它。
     - 此时，该线程的节点必须要强制脱离条件队列，并自主入队到 AQS 双向同步队列中去自旋抢锁。抢锁成功后，立即主动抛出 `InterruptedException` 来告知外层框架。
   - **发生在 `signal` 之后（`REINTERRUPT / 1`）**：
     - 如果 CAS 尝试改写 `CONDITION` 标志失败，说明在发生中断的同时，另一个线程已经执行了 `transferForSignal`，将该节点变更为 0 并挂载到了双向的 AQS 链表中。
     - 这种情况下，中断发生得比物理唤醒略迟。尽管线程依然苏醒，但它属于正常唤醒通道。此时不会抛出 `InterruptedException` 异常，而是在抢到锁退出 `await` 时，再次调用 `selfInterrupt()` “自我重置中断标记”，留给后续业务逻辑处理。

---

### Q5：`VarHandle` 相比传统 `Unsafe` 升级了什么？它在内存屏障和 AQS 中如何工作？

#### 💡 典型大厂连环追问

* **追问 1**：`VarHandle` 精细化控制里的 `getAcquire/setRelease` 以及 `compareAndSet` 底层分别触发了 CPU 哪一种级别的内存屏障？我们可以结合底层 AQS 重构谈谈吗？
* **追问 2**：既然直接内存操作有那么大风险，虚拟机为什么默认设计 `DirectBuffer` 堆外内存回收？它是如何与 `Cleaner` 配合工作的？

#### 🛠️ 核心解析答题要点

1. **`VarHandle` 提升的安全性与高精细度屏障**：

   传统 `Unsafe` 可以无限制读写任意物理内存偏移（Offset），容易引入非法地址访问错误致使 JVM 崩溃，且无法打包到 Java 模块系统中。`VarHandle`（变量句柄，JDK 9+ 引入）在保证近似于裸硬件级极速存取特性的同时，提供了**多级强度的内存一致性保证（Memory Ordering）**，彻底规范了重排序行径：

   - **Plain（普通读写）**：无任何内存屏障。
   - **Opaque（不透明）**：保证操作本身的原子性及物理执行顺序性（单线程内禁止重排），但不加高昂跨核心缓存一致性的锁总线屏障。
   - **Acquire / Release（单向半屏障）**：
     - `getAcquire` 保证“该读取”及“后续所有读写”均不重排到该读取之前（禁止下移，即 `LoadLoad` + `LoadStore` 屏障）。
     - `setRelease` 保证“该写入”之前的所有读写均已落盘，不被重排到该写入之后（禁止上移，即 `StoreStore` + `LoadStore` 屏障）。
   - **Volatile（全能强屏障）**：对齐标准 `volatile` 读写，底层触发完整的全局 `StoreLoad` 屏障。

   **AQS 的重构**：自 JDK 9 起，AQS 等底座对同步状态 `state`、以及队列中的 `head`/`tail` 指针更新的控制，全部由原生的 `Unsafe` 偏移量定位，重构为了类型安全，可在编译期实施强类型校验的 `VarHandle` 变量句柄形式。

2. **`DirectBuffer` 与 `Cleaner` 机制的物理回收链条**：

   - `finalize()` 已经由于其执存效率极低、极易在挂起时带来 GC 线程雪崩、以及死死复活等硬伤在 JDK 9 被全面废弃。
   - `DirectByteBuffer`（通过 `ByteBuffer.allocateDirect` 申请）内部在申请堆外内存时，会统一创建并静态注册一个 `sun.misc.Cleaner`（基于 **PhantomReference 虚引用**）。其内部封装了具体的 `Deallocator`（实现 Runnable）。
   - 当 JVM 发现堆内的 `DirectByteBuffer` 句柄已经毫无引用、被宣告死亡后，其伴生的虚引用会被自动排入底层的 `ReferenceQueue`（引用队列）中。
   - 特属的 `ReferenceHandler` 线程定时轮询唤醒，并就地回调 `Cleaner.clean()` 动作。由此，调用其内封的 `Unsafe.freeMemory(address)`，无锁物理释放堆外 OS 首地址内存，完美防范泄露。
