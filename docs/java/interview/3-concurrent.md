---
title: 三、并发编程与虚拟线程
sidebar_label: 3. 并发编程与虚拟线程
sidebar_position: 3
---

# 三、并发编程与虚拟线程

本章涵盖传统 JUC 并发基石与 JDK 21+ 虚拟线程的底层实现原理及实战策略。

---

## 16. 虚拟线程的底层原理

虚拟线程（Virtual Thread）是 JDK 21 引入的用户态轻量级协程模型。

### 映射关系：M:N 调度

- **平台线程（Platform Thread）**：传统 Java 线程，与 OS 线程是一对一（1:1）的关系，创建和切换开销巨大。
- **虚拟线程（Virtual Thread）**：由 JVM 调度管理。当有虚拟线程需要执行时，JVM 会将其挂载到一个平台线程上执行，这个平台线程被称为**载体线程（Carrier Thread）**。
- **M:N 模型**：数百万个虚拟线程（M）可以复用极少数（通常等同于 CPU 核心数）的载体线程（N），由 JVM 内部的 `ForkJoinPool` 进行非堵塞的任务调度。

### 为什么廉价与高并发

1. **栈在堆上**：传统平台线程要在 OS 层面分配一个固定大小的栈空间（通常是 1MB），而虚拟线程的栈空间是在 **Java 堆（Heap）** 上动态分配的，初始化时仅占几百字节。
2. **挂起续跑机制**：当虚拟线程在执行阻塞的 I/O 操作（如 Socket 读写、`LockSupport.park()`）时，JVM 会捕获到这一阻塞动作，并自动将该虚拟线程的调用栈从载体线程上“卸载（Unmount）”到堆中保存，从而释放出载体线程去执行其他虚拟线程。当 I/O 准备就绪时，JVM 再次将栈装载（Mount）到某个空闲的载体线程上继续运行。这使得阻塞操作在 JVM 看来变成了一次高效的事件回调。

---

## 17. 虚拟线程适用场景与钉住问题

虚拟线程的设计目的是为了应对高并发阻塞任务。

### 适用场景

- **I/O 密集型应用**：如高并发的 Web API 路由、数据库访问、网络爬虫。在这类场景下，虚拟线程可以显著提升吞吐量。
- **CPU 密集型应用**（无收益）：如果任务主要是高负荷数学计算、视频解码，这些任务必须始终占用 CPU 时间片。虚拟线程不仅不会带来加速，反而会因为频繁的任务调度和上下文切换产生负面开销。

### 载体线程被“钉住”（Pinning）问题

在某些情况下，当虚拟线程阻塞时，JVM 无法将其从载体线程上卸载。此时，载体线程将被该虚拟线程持续霸占，无法执行其他任务，这一现象被称为 **“钉住（Pinning）”**。

#### 导致钉住的操作

1. **在 `synchronized` 块或 `synchronized` 方法内部** 执行了阻塞操作（如 I/O 或锁等待）。
2. **执行了本地方法（Native Method）** 或外部函数接口（FFI）调用。

#### 规避手段

- 将原有的 `synchronized` 锁升级为 `java.util.concurrent.locks.ReentrantLock`。JVM 对 `ReentrantLock` 进行了底层优化，虚拟线程在等待 `ReentrantLock` 时能安全地被卸载，不会产生 Pin 现象。

---

## 18. 虚拟线程下是否还要注意池化与限流

虚拟线程与传统线程在资源管理上有本质的区别。

### 虚拟线程绝对不要池化

- 虚拟线程是**一次性的、廉价的**，它的生命周期极其短暂。
- 传统线程因为创建开销大所以需要借助线程池（Pool）进行复用。如果为虚拟线程创建线程池（如 `ExecutorService`），反而会因为池化管理增加额外的锁竞争与内存维护开销。
- 推荐直接为每个请求或任务创建一个全新的虚拟线程：

  ```java
  Thread.startVirtualThread(task);
  ```

### 为什么下游资源仍然必须进行严格限流

虽然线程变得极其廉价，可以并发启动百万个，但是**下游的物理资源并没有变得廉价**。
- **数据库连接**、**外部第三方 API 通信通道**、**文件描述符** 等物理资源在同一时间的承载能力是有限的。
- 如果不加以控制，百万级虚拟线程同时向数据库发起连接请求，会瞬间把数据库连接池撑爆并导致数据库宕机。
- **解决方案**：在虚拟线程中，应当通过 **`Semaphore`（信号量）** 或专用的限流器（如连接池）来限制对稀缺下游资源的并发访问量，而非通过限制线程数来进行限流。

---

## 19. 结构化并发

在传统多线程开发中，使用 `ExecutorService` 启动多个子任务时，子任务的生命周期是离散的。如果主线程出现异常或者某个子任务执行失败，其他子任务仍在后台无脑运行，导致资源泄漏和状态不一致。

### 结构化并发的概念

Java 21 引入了 **`StructuredTaskScope`**。它强制要求子任务在空间和时间上形成一个清晰的层级结构：**所有子任务的声明周期都被限制在主任务的作用域内**，即“同生共死”。

```java
try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
    Supplier<String> user = scope.fork(() -> fetchUser());
    Supplier<Integer> order = scope.fork(() -> fetchOrder());
    
    // 等待所有子任务执行完毕或任一任务失败
    scope.join(); 
    // 传播异常：如果其中一个 fork 抛出异常，立刻中止并在这里抛出
    scope.throwIfFailed(); 
    
    System.out.println(user.get() + order.get());
}
```

### 相比 `ExecutorService.invokeAll` 的优势

1. **自动取消与清理**：在 `ShutdownOnFailure` 模式下，若其中一个子任务抛出异常，作用域会自动向其他未完成的子任务发送中断信号，避免无谓的资源消耗。
2. **错误传播（Error Propagation）**：异常能直接且清晰地向上抛出，不会被吞掉。
3. **可观测性强**：线程转储（Thread Dump）时，虚拟线程会清晰地展示出父子任务的从属调用树状结构，方便排查死锁或长耗时任务。

---

## 20. synchronized 的锁升级过程

JVM 对 `synchronized` 关键字进行了大量的硬件级锁优化，其锁状态保存在对象头的 **Mark Word** 中。

### 锁升级流程

1. **无锁状态（No Lock）**：Mark Word 存储对象的 HashCode、分代年龄，锁标志位为 `01`，偏向锁标志位为 `0`。
2. **偏向锁（Biased Lock）**：
   - 目标是减少无竞争情况下的加锁开销。第一次加锁时，通过 CAS 将当前线程 ID 记录在 Mark Word 中。以后该线程再次进入时，只需对比线程 ID，无需任何 CAS 操作。
   - **注意**：由于偏向锁撤销需要等到全局安全点（Safe Point）暂停线程，在高并发竞争激烈的现代系统中开销反而更大。因此 **JDK 15 起默认禁用了偏向锁**，并在后续版本中彻底废弃。
3. **轻量级锁（Lightweight Lock）**：
   - 当出现多线程交替竞争但无实质冲突时，锁升级为轻量级锁。
   - 线程在自己的栈帧中建立锁记录（Lock Record），通过 CAS 尝试将对象的 Mark Word 指向该锁记录。若竞争失败，线程会通过**自旋（Spin）**等待，避免直接挂起。
4. **重量级锁（Heavyweight Lock）**：
   - 当自旋达到一定次数，或者竞争极其激烈（多线程同时争抢）时，锁升级为重量级锁。
   - JVM 会向操作系统申请互斥量（Mutex），Mark Word 会被修改为指向堆中 `ObjectMonitor` 监视器对象的指针，未抢到锁的线程将被直接阻塞挂起，进入 OS 队列等待唤醒，带来较大的内核态用户态切换开销。

---

## 21. volatile 关键字的语义

`volatile` 是 Java 提供的最轻量级的同步机制。

### 双重语义

1. **保证内存可见性**：
   - 根据 JMM 规定，每个线程有自己的工作内存。当一个变量被声明为 `volatile` 后，写线程在修改变量后，会强制将新值刷新到主内存中；而读线程在每次读取该变量前，会强制从主内存中读取最新值，这使得局部修改对其他线程实时可见。
   - **物理实现**：编译出的汇编指令会在写操作后加入一条 **Lock 前缀指令**，它会触发缓存一致性协议（如 MESI），使其他 CPU 核心对应的缓存行失效，强制从主内存更新。
2. **禁止指令重排序**：
   - 编译器和 CPU 在保证单线程“好像是顺序执行（As-If-Serial）”的前提下，会为了优化吞吐量调整指令执行顺序。
   - `volatile` 通过在读写操作前后插入**内存屏障（Memory Barrier）**，阻止了编译器和 CPU 跨越屏障进行指令重排。

### 为什么不能保证原子性

- `volatile` 仅保证了单次**读/写操作**的原子性和可见性。
- 对于复合操作（如 `i++`，其本质包含：读取 `i`、计算 `i+1`、写入新值三步），`volatile` 无法阻止多个线程在中间步骤同时读取相同的旧值，从而产生数据覆盖，因此必须配合 CAS 或锁才能实现完整的原子性。

---

## 22. JMM 与 happens-before 规则

Java 内存模型（Java Memory Model, JMM）抽象了多核 CPU 与主内存、工作内存之间的交互规范，用于屏蔽不同硬件平台的并发差异。

### happens-before 规则

`happens-before` 是 JMM 定义的关于两个操作之间执行顺序的**偏序关系**。如果操作 A `happens-before` 操作 B，那么操作 A 的执行结果对操作 B 来说是绝对可见的。

#### 核心规则

1. **程序次序规则**：在一个线程内，书写在前面的操作 `happens-before` 后面的操作。
2. **管程锁定规则**：对一个锁的 unlock 操作 `happens-before` 后面对于这个锁的 lock 操作。
3. **volatile 变量规则**：对一个 `volatile` 变量的写操作 `happens-before` 后续对这个变量的读操作。
4. **线程启动规则**：Thread 对象的 `start()` 方法 `happens-before` 此线程的每一个动作。
5. **传递性**：如果 A `happens-before` B，且 B `happens-before` C，那么 A `happens-before` C。

### DCL（双重检查锁定）单例为什么要使用 volatile

双重检查锁定的典型代码如下：

```java
public class Singleton {
    private static volatile Singleton instance; // 必须使用 volatile
    
    public static Singleton getInstance() {
        if (instance == null) {
            synchronized (Singleton.class) {
                if (instance == null) {
                    instance = new Singleton();
                }
            }
        }
        return instance;
    }
}
```

#### 原因分析

在没有 `volatile` 修饰时，`instance = new Singleton();` 这一行对象的创建操作，在字节码层面被分为三步：
1. `memory = allocate();` // 分配内存空间
2. `ctorInstance(memory);` // 初始化对象
3. `instance = memory;` // 将引用指向分配的内存空间

由于重排序的存在，第 2 步和第 3 步可能颠倒。此时，若线程 A 执行了第 1、3 步，尚未执行第 2 步，`instance` 已经非空。此时线程 B 调用 `getInstance()`，在最外层判断 `instance != null` 成立，直接返回了未完成初始化（即属性全部为默认值）的“半成品”对象，一旦使用就会触发崩溃。通过 `volatile` 禁止这三步的指令重排，可以规避该缺陷。

---

## 23. AQS 原理

AQS（AbstractQueuedSynchronizer）是 Java 中大部分显式锁和同步工具（如 `ReentrantLock`、`Semaphore`、`CountDownLatch`）的底层共用框架。

### 核心设计

1. **`state` 变量**：一个由 `volatile` 修饰的 32 位整型状态变量，用于表示同步状态（例如，对于 `ReentrantLock`，`state` 为 0 表示锁空闲，大于 0 表示锁被占用及重入次数）。
2. **CLH 变体双向队列**：当多个线程争抢 `state` 失败时，AQS 会将这些线程包装成一个个 `Node` 节点，并通过 CAS 尾部插入的方式构建一个双向链表队列。队列中的线程会以安全自旋或挂起的方式等待被前驱节点唤醒。

### ReentrantLock 公平与非公平实现

- **非公平锁（NonfairSync）**：
  - 当线程调用 `lock()` 时，会**直接抢占**一次锁（尝试 CAS 将 `state` 从 0 修改为 1）。如果刚好锁释放，该线程无需排队即可插队拿到锁。
  - 只有抢占失败，才会执行 AQS 的入队逻辑。
- **公平锁（FairSync）**：
  - 线程调用 `lock()` 时，不会直接去 CAS 抢锁，而是先调用 `hasQueuedPredecessors()` 判断 CLH 队列中是否有排在自己前面的线程。
  - 只有在队列为空或者自己是队列头部节点时，才会尝试获取锁，严格保证先来后到。

---

## 24. ThreadPoolExecutor 核心机制

### 七大参数说明

1. `corePoolSize`：核心线程数，即使空闲也不会被回收的线程数量。
2. `maximumPoolSize`：最大线程数，池中允许存在的最大线程上限。
3. `keepAliveTime`：空闲线程存活时间，非核心线程闲置超过这个时间会被销毁。
4. `unit`：存活时间的时间单位。
5. `workQueue`：任务队列，用于存放等待执行的任务（如 `LinkedBlockingQueue`、`SynchronousQueue`）。
6. `threadFactory`：线程创建工厂，用于定制线程名称、优先级等。
7. `handler`：拒绝策略，当队列满且线程数达到最大值时的拒绝手段。

### 四种拒绝策略

- `AbortPolicy`（默认）：直接抛出 `RejectedExecutionException` 异常。
- `CallerRunsPolicy`：由提交任务的调用者线程来同步执行该任务，这能有效减缓任务提交速度，起到降压作用。
- `DiscardPolicy`：直接静默丢弃任务，不进行任何处理。
- `DiscardOldestPolicy`：丢弃队列中存活时间最长（队头）的任务，并尝试重新提交当前任务。

### 线程数设定方法

根据应用执行属性的不同，有不同的计算理论：

- **CPU 密集型**（以计算为主）：
  $$\text{线程数} = N_{\text{CPU}} + 1$$
  额外加 1 是为了防止偶发的页缺失或线程暂停导致 CPU 空闲。
- **I/O 密集型**（包含大量网络/磁盘阻塞）：
  $$\text{线程数} = N_{\text{CPU}} \times \left(1 + \frac{\text{等待时间}}{\text{CPU 计算时间}}\right)$$
  实际生产中，由于等待时间难以精确度量，通常需要通过压测进行动态调整。

---

## 25. CompletableFuture 异步编排

`CompletableFuture` 提供了声明式的异步流式计算编排能力。

### `thenCompose` 与 `thenCombine` 的区别

- **`thenCompose`**：
  - **语义**：扁平化连接（类似于 Stream 的 `flatMap`）。
  - **场景**：当前一个异步任务的结果作为入参去触发下一个异步任务时使用（前后任务存在**串行依赖**关系）。
  - **返回值**：`CompletableFuture<U>`。
- **`thenCombine`**：
  - **语义**：并行合并（类似于双流汇聚）。
  - **场景**：两个异步任务**互不相干，并行执行**，当它们全部执行完毕后，获取两个任务的结果进行联合计算。
  - **返回值**：`CompletableFuture<V>`，将两者的计算结果合并输出。

### 异常处理机制

- **`exceptionally(Function<Throwable, T> fn)`**：类似于 `catch`，只有在前序链路发生异常时才会触发，并返回一个默认兜底值。
- **`handle(BiFunction<T, Throwable, U> fn)`**：无论是否发生异常都会触发，可以同时拿到上一步的执行结果 `result` 与异常 `throwable`，支持在方法体中进行灵活的业务修复。

---

## 26. CAS 与并发原子类优化

CAS（Compare And Swap）是实现无锁并发的硬件级基石。

### ABA 问题与解决方案

- **ABA 问题**：线程 1 读取变量值为 A，在准备修改时，线程 2 将该值修改为 B，随后又修改回 A。线程 1 使用 CAS 比较时，发现仍为 A，修改成功。但实际上，这个变量的生命周期已经发生了改变，可能会引发与业务状态机冲突的逻辑错乱。
- **解决手段**：使用 **`AtomicStampedReference<V>`**。它在对比值（Reference）的同时，增加了一个版本戳（Stamp）。每次修改时，值与版本戳必须同时匹配且更新，从而彻底杜绝 ABA 问题。

### LongAdder 为什么比 AtomicLong 快

- **`AtomicLong` 的瓶颈**：内部基于一个 `volatile long value` 进行循环 CAS 自旋。在高并发下，大量线程同时竞争修改同一个内存地址，会产生严重的 CPU 缓存一致性冲突（缓存行失效与自旋重试），导致吞吐量骤降。
- **`LongAdder` 的分段退避设计**：
  - 借鉴了并发分段思想。内部维护了一个核心 `base` 变量和一个 `Cell[]` 数组。
  - 在没有竞争时，直接 CAS 累加 `base` 变量。
  - 一旦发生 CAS 竞争失败，它会自动将并发热点分散到 `Cell[]` 数组中的不同槽位（通过线程哈希值定位 Cell），让线程去累加各自槽位的值。
  - **读取求值**：当调用 `sum()` 时，将 `base` 与所有 `Cell` 节点的累计值求和输出。这种设计消除了写热点的单一碰撞，吞吐量极大提升。
