# AQS 机制与锁实现深度解析

在 Java 高级与资深工程师的面试中，并发编程的底层原理是必考项。其中，`AbstractQueuedSynchronizer`（AQS）和 `synchronized` 的锁升级机制是重中之重。本篇将从源码与底层原理出发，深度剖析这两个核心知识点。

---

## 一、 AQS (AbstractQueuedSynchronizer) 核心原理

AQS 是 Java 并发包（`java.util.concurrent`）的核心基石，像 `ReentrantLock`、`Semaphore`、`CountDownLatch`、`ReentrantReadWriteLock` 等都是基于 AQS 实现的。

### 1. AQS 的核心结构

AQS 内部主要维护了两个部分：
1. **状态变量 `state`**：一个被 `volatile` 修饰的 `int` 类型变量，代表共享资源的状态。
2. **CLH 队列**：一个 FIFO（先进先出）的双向队列，用于存放等待获取资源的线程。

```mermaid
gantt
    title AQS 内部双向队列结构
    section 队列
    Head (Dummy Node) :active, 0, 1
    Node (Thread A) : 1, 2
    Node (Thread B) : 2, 3
    Tail : 3, 4
```

#### 核心源码字段：
```java
public abstract class AbstractQueuedSynchronizer extends AbstractOwnableSynchronizer {
    // 等待队列的头节点，懒加载。除了初始化，只能通过 setHead 方法修改
    private transient volatile Node head;
    // 等待队列的尾节点，懒加载。只能通过 enq 方法添加新的等待节点
    private transient volatile Node tail;
    // 同步状态
    private transient volatile int state;
    
    // CAS 更新 state
    protected final boolean compareAndSetState(int expect, int update) {
        return U.compareAndSetInt(this, STATE, expect, update);
    }
}
```

### 2. Node 节点的状态（`waitStatus`）

CLH 队列中的每个线程都会被封装成一个 `Node` 节点。在 JDK 8 中，`Node` 的 `waitStatus` 决定了线程的等待状态：

- **`CANCELLED` (1)**：表示线程获取锁的请求已经取消（由于超时或中断）。
- **`SIGNAL` (-1)**：表示后继节点的线程处于等待状态，当前节点在释放锁或取消时，必须唤醒（`unpark`）其后继节点。
- **`CONDITION` (-2)**：表示节点在等待队列中，节点线程等待在 `Condition` 上，当其他线程对 `Condition` 调用了 `signal()` 后，该节点会从等待队列转移到同步队列中。
- **`PROPAGATE` (-3)**：共享模式下，释放锁的动作需要传播到其他节点。
- **`0`**：新节点入队时的默认状态。

> **注意**：在 JDK 9+ 中，AQS 进行了重构，引入了 `VarHandle`，并将 `Node` 拆分为了 `ExclusiveNode` 和 `SharedNode`，但其核心的 FIFO 双向链表和状态传播逻辑依然保持一致。

### 3. 独占模式与共享模式

AQS 支持两种资源共享方式：
- **独占模式（Exclusive）**：每次只能有一个线程持有锁，如 `ReentrantLock`。
  - 需实现 `tryAcquire(int)` 和 `tryRelease(int)`。
- **共享模式（Shared）**：多个线程可同时持有锁，如 `Semaphore`、`CountDownLatch`。
  - 需实现 `tryAcquireShared(int)` 和 `tryReleaseShared(int)`。

---

## 二、 ReentrantLock 源码级解析

`ReentrantLock` 是典型的独占式可重入锁，其内部通过继承 AQS 实现了 `FairSync`（公平锁）和 `NonfairSync`（非公平锁）。

### 1. 公平锁与非公平锁的实现差异

公平锁和非公平锁在获取锁时的核心差异在于：**非公平锁在调用 `lock()` 时会先尝试插队，而公平锁会严格按照队列顺序排队。**

#### 非公平锁 `NonfairSync` 获取锁流程：
```java
static final class NonfairSync extends Sync {
    final void lock() {
        // 1. 直接尝试 CAS 获取锁（插队）
        if (compareAndSetState(0, 1))
            setExclusiveOwnerThread(Thread.currentThread());
        else
            acquire(1); // 2. 失败则进入 AQS 标准获取流程
    }

    protected final boolean tryAcquire(int acquires) {
        return nonfairTryAcquire(acquires);
    }
}

final boolean nonfairTryAcquire(int acquires) {
    final Thread current = Thread.currentThread();
    int c = getState();
    if (c == 0) {
        // 再次尝试 CAS 插队，不关心队列中是否有线程在等待
        if (compareAndSetState(0, acquires)) {
            setExclusiveOwnerThread(current);
            return true;
        }
    }
    else if (current == getExclusiveOwnerThread()) {
        // 可重入性：如果是当前线程持有锁，state 累加
        int nextc = c + acquires;
        if (nextc < 0) // overflow
            throw new Error("Maximum lock count exceeded");
        setState(nextc);
        return true;
    }
    return false;
}
```

#### 公平锁 `FairSync` 获取锁流程：
```java
static final class FairSync extends Sync {
    final void lock() {
        acquire(1); // 直接进入 AQS 标准获取流程，不进行初始 CAS 抢占
    }

    protected final boolean tryAcquire(int acquires) {
        final Thread current = Thread.currentThread();
        int c = getState();
        if (c == 0) {
            // 核心区别：hasQueuedPredecessors() 校验队列中是否有前驱节点在排队
            if (!hasQueuedPredecessors() &&
                compareAndSetState(0, acquires)) {
                setExclusiveOwnerThread(current);
                return true;
            }
        }
        else if (current == getExclusiveOwnerThread()) {
            int nextc = c + acquires;
            if (nextc < 0)
                throw new Error("Maximum lock count exceeded");
            setState(nextc);
            return true;
        }
        return false;
    }
}
```

### 2. `hasQueuedPredecessors()` 源码剖析

这是公平锁判断是否需要排队的核心方法：
```java
public final boolean hasQueuedPredecessors() {
    Node t = tail; // Read fields in reverse order of write
    Node h = head;
    Node s;
    // h != t 说明队列不为空
    // ((s = h.next) == null) 说明有线程正在初始化队列（CAS 成功但未建立 next 指针）
    // (s.thread != Thread.currentThread()) 说明队列中第一个排队的线程不是当前线程
    return h != t &&
        ((s = h.next) == null || s.thread != Thread.currentThread());
}
```

### 3. 锁释放流程 `unlock()`

无论是公平锁还是非公平锁，释放锁的逻辑都是相同的，因为它们都调用了 AQS 的 `release(1)`：

```java
public void unlock() {
    sync.release(1);
}

// AQS 释放锁模板方法
public final boolean release(int arg) {
    if (tryRelease(arg)) { // 调用 ReentrantLock 实现的 tryRelease
        Node h = head;
        if (h != null && h.waitStatus != 0)
            unparkSuccessor(h); // 唤醒后继节点
        return true;
    }
    return false;
}

// ReentrantLock 实现的 tryRelease
protected final boolean tryRelease(int releases) {
    int c = getState() - releases;
    if (Thread.currentThread() != getExclusiveOwnerThread())
        throw new IllegalMonitorStateException();
    boolean free = false;
    if (c == 0) {
        free = true;
        setExclusiveOwnerThread(null); // 彻底释放锁，清空持有者线程
    }
    setState(c); // 更新 state，由于是独占锁，此处不需要 CAS，直接 setState 即可
    return free;
}
```

---

## 三、 JVM synchronized 锁升级过程

在 JVM 中，`synchronized` 是基于 Monitor（管程）实现的。为了减少获得锁和释放锁带来的性能消耗，JDK 1.6 引入了锁升级机制。锁的状态保存在 Java 对象头的 **Mark Word** 中。

### 1. Mark Word 结构（以 64 位 JVM 为例）

| 锁状态 | 25bit | 31bit | 1bit (cms_free) | 4bit (分代年龄) | 1bit (是否偏向) | 2bit (锁标志位) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **无锁** | 未使用 | hashCode | | 分代年龄 | 0 | 01 |
| **偏向锁** | 线程ID (54bit) | Epoch (2bit) | | 分代年龄 | 1 | 01 |
| **轻量级锁** | 指向栈中锁记录（Lock Record）的指针 | | | | 00 |
| **重量级锁** | 指向互斥量（Monitor）的指针 | | | | 10 |
| **GC标记** | 空 | | | | 11 |

### 2. 锁升级链路

```mermaid
graph TD
    A[无锁状态] -->|单线程访问| B[偏向锁]
    B -->|多线程轻度竞争/CAS失败| C[轻量级锁]
    C -->|自适应自旋失败/重度竞争| D[重量级锁]
```

1. **无锁 -> 偏向锁**：
   - 当一个线程访问同步块并获取锁时，会在对象头和栈帧中的锁记录里存储锁偏向的线程 ID。
   - 以后该线程进入和退出同步块时，只需简单测试 Mark Word 中是否存储着指向当前线程的偏向锁，无需进行 CAS 操作。
2. **偏向锁 -> 轻量级锁**：
   - 当有另一个线程尝试竞争偏向锁时，偏向锁宣告失效。
   - JVM 会在全局安全点（Safe Point）暂停持有偏向锁的线程，检查其是否存活。如果线程已退出同步块，则将对象头设为无锁或偏向锁状态；如果仍在同步块中，则升级为**轻量级锁**。
   - 竞争线程通过 **CAS** 尝试将对象头中的 Mark Word 替换为指向自己栈帧中 `Lock Record` 的指针。
3. **轻量级锁 -> 重量级锁**：
   - 轻量级锁在竞争时，未抢到锁的线程会进行**自适应自旋**（Adaptive Spining）。
   - 如果自旋超过一定次数，或者又来了第三个线程竞争，轻量级锁就会膨胀为**重量级锁**。
   - 重量级锁将未抢到锁的线程直接阻塞（进入 EntryList），不再消耗 CPU，但线程挂起和唤醒涉及用户态与内核态的切换，开销极大。

### 3. 关键变革：JDK 15+ 废弃偏向锁

> **面试高分点**：在 JDK 15 中，偏向锁被标记为废弃（Deprecated），并在 JDK 18 中被默认禁用。
> **原因**：
> 1. **撤销成本高**：偏向锁的撤销需要等待全局安全点（Safe Point），这会带来明显的停顿（STW）。
> 2. **现代应用场景变化**：现代多线程应用中，高并发、多线程竞争是常态，单线程独占锁的场景变少，偏向锁带来的性能提升无法弥补其撤销带来的开销。

---

## 四、 高频面试题与追问

### Q1: 为什么非公平锁的吞吐量比公平锁大？
- **答**：公平锁在释放锁时，必须唤醒队列中的下一个线程，这涉及到线程上下文切换的开销（通常需要几个微秒）。而非公平锁在释放锁时，如果有新线程刚好到来，新线程可以直接抢占锁并执行，无需等待上下文切换。这样可以充分利用 CPU 的时间片，减少线程挂起的概率，从而提高整体吞吐量。

### Q2: AQS 为什么使用双向链表，而不是单向链表？
- **答**：
  1. **取消节点（Cancelled）的清理**：当某个节点因为超时或中断取消获取锁时，它需要从队列中脱离。双向链表可以让我们在 $O(1)$ 时间复杂度内找到前驱节点，从而将前驱节点的 `next` 指向当前节点的 `next`。
  2. **唤醒机制的可靠性**：在入队（`enq`）过程中，新节点是通过 CAS 设为 `tail` 的，然后才建立前驱节点的 `next` 指针。如果此时从头往后遍历，可能会因为 `next` 指针尚未建立而中断。而双向链表的 `prev` 指针是在 CAS 之前就建立好的，因此从后往前遍历是绝对安全的。
  3. **避免不必要的唤醒**：新加入的节点需要判断前驱节点的状态。如果是双向链表，可以直接通过 `prev` 找到前驱节点，判断其是否为 `head`，从而决定是否尝试获取锁。

### Q3: synchronized 与 ReentrantLock 有什么区别？
- **答**：
  1. **实现层面**：`synchronized` 是 JVM 层面的关键字，基于 Monitor 实现；`ReentrantLock` 是 JDK API 层面的类，基于 AQS 实现。
  2. **锁释放**：`synchronized` 在发生异常或执行完毕时会自动释放锁；`ReentrantLock` 必须在 `finally` 块中手动释放。
  3. **灵活性**：`ReentrantLock` 支持非阻塞获取锁（`tryLock`）、可中断获取锁（`lockInterruptibly`）以及超时获取锁。
  4. **公平性**：`synchronized` 只能是非公平锁；`ReentrantLock` 既支持公平锁也支持非公平锁。
  5. **条件唤醒**：`synchronized` 只能通过 `wait/notify` 配合一个等待队列；`ReentrantLock` 可以通过 `Condition` 绑定多个等待队列，实现精准唤醒。
