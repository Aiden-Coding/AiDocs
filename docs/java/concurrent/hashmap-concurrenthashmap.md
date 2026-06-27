---
title: HashMap 与 ConcurrentHashMap 源码级深度解析
hide_title: true
sidebar_label: HashMap/CHM 源码解析
---

## HashMap 与 ConcurrentHashMap 源码级深度解析

在 Java 资深工程师的面试中，集合框架的底层原理是必考的硬核内容。其中，`HashMap` 的扩容机制、JDK 7 与 JDK 8 的重大变革，以及 `ConcurrentHashMap` 的并发安全设计与锁粒度演进，更是重中之重。

---

## 一、 HashMap 底层原理与 JDK 7/8 变革

### 1. HashMap 的底层数据结构

- **JDK 7**：采用 **数组 + 单向链表** 的结构。
- **JDK 8**：采用 **数组 + 链表 + 红黑树** 的结构。

```mermaid
graph TD
    subgraph HashMap JDK 8 结构
        Array[Node 数组] --> Bin0[Node 0]
        Array --> Bin1[Node 1]
        Array --> Bin2[Node 2: 链表]
        Array --> Bin3[Node 3: 红黑树]
        
        Bin2 --> Bin2_1[Node] --> Bin2_2[Node]
        Bin3 --> TreeNode1[TreeNode]
        TreeNode1 --> TreeNode2[TreeNode]
        TreeNode1 --> TreeNode3[TreeNode]
    end
```

### 2. 核心参数与树化阈值

- **默认初始容量（`DEFAULT_INITIAL_CAPACITY`）**：16（必须是 2 的幂）。
- **最大容量（`MAXIMUM_CAPACITY`）**：$2^{30}$。
- **默认负载因子（`DEFAULT_LOAD_FACTOR`）**：0.75。
- **树化阈值（`TREEIFY_THRESHOLD`）**：8。
- **退树化阈值（`UNTREEIFY_THRESHOLD`）**：6。
- **最小树化容量（`MIN_TREEIFY_CAPACITY`）**：64。

> **高频追问：为什么树化阈值是 8，退树化阈值是 6？**
>
> 1. **哈希碰撞的概率分布**：根据泊松分布（Poisson Distribution），在负载因子为 0.75 的情况下，同一个桶（Bucket）中冲突节点长度达到 8 的概率仅为 **0.00000006**（约亿分之六）。因此，树化是一个极小概率事件，主要是为了防止恶意哈希碰撞攻击（DoS 攻击）。
> 2. **性能与空间的权衡**：红黑树节点（`TreeNode`）占用的空间是普通链表节点（`Node`）的两倍，且红黑树的旋转和变色需要额外的性能开销。在节点数较少时，链表的 $O(N)$ 遍历速度与红黑树的 $O(\log N)$ 几乎无异。
> 3. **防止频繁震荡**：如果树化和退树化阈值相同（例如都是 8），当节点数在 8 附近反复增删时，会导致红黑树和链表频繁相互转换，极大地消耗系统性能。因此设置一个差值（8 树化，6 退树化）作为缓冲区。

---

### 3. JDK 7 的死循环（死锁）问题

在 JDK 7 中，`HashMap` 在多线程并发扩容时，可能会形成**环形链表**，导致后续 `get()` 操作进入死循环，CPU 飙高到 100%。

- **根源**：JDK 7 扩容时采用的是 **头插法**（Head Insertion）。在将旧链表迁移到新链表时，会逆序改变链表元素的顺序。
- **死循环过程**：

  设旧链表某个桶中有两个节点：`A -> B`。

  - 线程 1 和 2 同时进行扩容。线程 1 执行到 `Entry<K,V> next = e.next;` 时被挂起，此时对于线程 1 而言：`e = A`，`next = B`。
  - 线程 2 顺利完成了扩容和迁移。由于是头插法，新桶中的顺序变为了 `B -> A`。
  - 线程 1 被唤醒继续执行。它将 `A` 插入新桶头部，然后处理 `B`（此时 `B.next` 已经指向了 `A`）。当处理 `B` 时，又将 `B` 插入头部，并把 `B.next` 指向 `A`。接着处理 `A`，由于 `A.next` 此时为 `null`，但之前的操作已经让 `A.next` 指向了 `B`，从而形成了 `A <-> B` 的环形结构。

> **JDK 8 的解决方案**：
> JDK 8 彻底废弃了头插法，改用 **尾插法**（Tail Insertion）。在扩容迁移时，保持链表节点原有的顺序，从而避免了环形链表的产生。

---

## 二、 ConcurrentHashMap 锁粒度演进

`ConcurrentHashMap` 是线程安全的哈希表，其底层架构在 JDK 7 和 JDK 8 中发生了翻天覆地的变化。

### 1. JDK 7 的 Segment 分段锁架构

- **底层结构**：由 `Segment` 数组和 `HashEntry` 数组组成。
- **锁机制**：`Segment` 继承自 `ReentrantLock`。每个 `Segment` 守护着一个 `HashEntry` 数组。
- **并发度**：默认并发度为 16（即有 16 个 Segment），理论上最多支持 16 个线程并发写入。

```mermaid
graph TD
    subgraph ConcurrentHashMap JDK 7
        CHM[ConcurrentHashMap] --> Seg0[Segment 0 / ReentrantLock]
        CHM --> Seg1[Segment 1 / ReentrantLock]
        CHM --> Seg15[Segment 15 / ReentrantLock]
        
        Seg0 --> Table0[HashEntry 数组]
        Seg1 --> Table1[HashEntry 数组]
    end
```

---

### 2. JDK 8 的 CAS + synchronized 锁粒度优化

- **底层结构**：彻底废弃了 `Segment` 分段锁，改用与 `HashMap` 相同的 **Node 数组 + 链表 + 红黑树** 结构。
- **锁机制**：采用 **CAS 操作 + `synchronized` 关键字**。
- **锁粒度**：**锁住的是每个桶（Bucket）的头节点（Node）**。
- **并发度**：并发度直接等同于数组的长度（默认 16，随着扩容而增加），极大地减少了锁竞争。

```mermaid
graph TD
    subgraph ConcurrentHashMap JDK 8
        Array[Node 数组] --> Bin0[Node 0: synchronized]
        Array --> Bin1[Node 1: synchronized]
        Array --> Bin2[Node 2: CAS / 空桶]
        
        Bin0 --> NodeA[Node] --> NodeB[Node]
    end
```

> **高频追问：为什么 JDK 8 放弃 ReentrantLock 而选择 synchronized？**
>
> 1. **减少内存开销**：JDK 7 的每个 `Segment` 都是一个继承自 `ReentrantLock` 的对象，会消耗大量内存。而 JDK 8 锁住桶的头节点，无需额外创建大量的锁对象。
> 2. **JVM 级别的极致优化**：`synchronized` 是 JVM 级别的关键字，在 JDK 1.6 引入锁升级机制（偏向锁、轻量级锁、重量级锁）后，其性能得到了极大提升。此外，JVM 可以对 `synchronized` 进行锁粗化、锁消除等编译器层面的优化，这是 API 级别的 `ReentrantLock` 无法做到的。
> 3. **数据结构演进**：JDK 8 引入了红黑树。当链表转化为红黑树后，锁住头节点依然能完美控制整棵树的并发写入。

---

## 三、 ConcurrentHashMap 核心源码剖析（JDK 8）

### 1. 初始化：懒加载与 `sizeCtl` 的控制

`ConcurrentHashMap` 的构造函数中并不会初始化 Node 数组，而是延迟到第一次 `put()` 时进行懒加载。其初始化过程通过 `sizeCtl` 变量进行并发控制：

```java
private final Node<K,V>[] initTable() {
    Node<K,V>[] tab; int sc;
    while ((tab = table) == null || tab.length == 0) {
        if ((sc = sizeCtl) < 0)
            Thread.yield(); // 失去 CPU 执行权：说明有其他线程正在进行初始化
        else if (U.compareAndSetInt(this, SIZECTL, sc, -1)) { // CAS 将 sizeCtl 设为 -1，代表抢占到初始化锁
            try {
                if ((tab = table) == null || tab.length == 0) {
                    int n = (sc > 0) ? sc : DEFAULT_CAPACITY;
                    @SuppressWarnings("unchecked")
                    Node<K,V>[] nt = (Node<K,V>[])new Node<?,?>[n];
                    table = tab = nt;
                    sc = n - (n >>> 2); // sc = 0.75 * n，即扩容阈值
                }
            } finally {
                sizeCtl = sc;
            }
            break;
        }
    }
    return tab;
}
```

---

### 2. 写入流程 `putVal` 源码级解析

```java
final V putVal(K key, V value, boolean onlyIfAbsent) {
    if (key == null || value == null) throw new NullPointerException(); // Key/Value 严禁为 null
    int hash = spread(key.hashCode()); // 扰动函数，计算哈希值
    int binCount = 0;
    for (Node<K,V>[] tab = table;;) {
        Node<K,V> f; int n, i, fh; K fk; V fv;
        if (tab == null || (n = tab.length) == 0)
            tab = initTable(); // 1. 数组为空，进行初始化
        else if ((f = tabAt(tab, i = (n - 1) & hash)) == null) {
            // 2. 对应的桶为空，直接通过 CAS 尝试放入新节点，无需加锁
            if (casTabAt(tab, i, null, new Node<K,V>(hash, key, value)))
                break;                   
        }
        else if ((fh = f.hash) == MOVED)
            // 3. 发现头节点的 hash 值为 MOVED (-1)，说明当前集群正在进行扩容迁移
            tab = helpTransfer(tab, f); // 当前线程加入协助扩容
        else {
            V oldVal = null;
            // 4. 桶不为空且未在扩容，锁住当前桶的头节点
            synchronized (f) {
                if (tabAt(tab, i) == f) {
                    if (fh >= 0) { // fh >= 0 说明是链表节点
                        binCount = 1;
                        for (Node<K,V> e = f;; ++binCount) {
                            K ek;
                            if (e.hash == hash &&
                                ((ek = e.key) == key || (ek != null && key.equals(ek)))) {
                                oldVal = e.val;
                                if (!onlyIfAbsent)
                                    e.val = value;
                                break;
                            }
                            Node<K,V> pred = e;
                            if ((e = e.next) == null) {
                                pred.next = new Node<K,V>(hash, key, value); // 尾插法插入新节点
                                break;
                            }
                        }
                    }
                    else if (f instanceof TreeBin) { // 说明是红黑树节点
                        Node<K,V> p;
                        binCount = 2;
                        if ((p = ((TreeBin<K,V>)f).putTreeVal(hash, key, value)) != null) {
                            oldVal = p.val;
                            if (!onlyIfAbsent)
                                p.val = value;
                        }
                    }
                }
            }
            if (binCount != 0) {
                if (binCount >= TREEIFY_THRESHOLD)
                    treeifyBin(tab, i); // 5. 链表长度达到 8，尝试树化
                if (oldVal != null)
                    return oldVal;
                break;
            }
        }
    }
    addCount(1L, binCount); // 6. 统计元素个数，并判断是否需要扩容
    return null;
}
```

---

### 3. 并发扩容协助机制（`helpTransfer`）

当线程在 `put` 时发现桶的头节点是 `ForwardingNode`（其 hash 值为 `MOVED = -1`），说明 `ConcurrentHashMap` 正在进行扩容。

- **核心思想**：**多线程协同扩容**。
- **机制**：
  - 扩容线程会向 TC 申请分配一个“迁移任务区间”（默认每个线程负责迁移 16 个桶）。
  - 线程负责将自己区间内的旧桶数据迁移到新数组中。迁移完毕后，将旧桶的头节点设置为 `ForwardingNode`，指向新数组。
  - 其他写线程发现 `ForwardingNode` 后，不会被阻塞，而是主动调用 `helpTransfer` 协助迁移，迁移完成后再将数据写入新数组。这种设计极大地缩短了扩容期间的停顿时间。

---

## 四、 高频面试题与追问

### 1. HashMap 的 hash 方法为什么要进行扰动处理？

**答**：

HashMap 的 `hash` 方法实现如下：

```java
static final int hash(Object key) {
    int h;
    return (key == null) ? 0 : (h = key.hashCode()) ^ (h >>> 16);
}
```

它将 key 的 `hashCode` 高 16 位与低 16 位进行**异或（^）运算**。

**原因**：

在计算数组下标时，使用的是 `(n - 1) & hash`。由于数组初始容量 `n` 通常较小（如 16），`n - 1` 的高位全是 0，进行与运算时，只有 `hashCode` 的低位参与了运算。
扰动函数将高 16 位与低 16 位混合，使得 `hashCode` 的高位特征也传播到了低位，从而在数组容量较小时，也能有效减少哈希碰撞，让数据分布更均匀。

### 2. 为什么 HashMap/ConcurrentHashMap 的容量必须是 2 的幂次方？

**答**：

1. **将取模运算转化为位运算，极大提升性能**：

   当容量 $n$ 是 2 的幂次方时，取模运算 `hash % n` 可以等价地替换为位运算 `(n - 1) & hash`。位运算的执行效率远高于传统的除法取模运算。

2. **减少哈希碰撞，空间利用率最高**：

   如果 $n$ 是 2 的幂次方，则 $n-1$ 的二进制表示低位全是 1（例如 $16-1 = 15$，二进制为 `1111`）。此时进行 `&` 运算，结果完全取决于 `hash` 的二进制值，每一位都可能是 0 或 1，分布极其均匀。
   如果 $n$ 不是 2 的幂（例如 15，$n-1 = 14$，二进制为 `1110`），那么进行 `&` 运算时，最后一位永远是 0。这意味着数组中物理下标为奇数的位置（如 1, 3, 5...）永远无法存放数据，造成了极大的空间浪费，且碰撞概率翻倍。

### 3. ConcurrentHashMap 的 get 方法需要加锁吗？为什么？

**答**：

**不需要加锁**。`get` 方法是完全无锁的，极其高效。

**原因**：

1. **`volatile` 保证可见性**：

   Node 节点的 `val` 字段和 `next` 指针都被 `volatile` 修饰：

   ```java
   transient volatile Node<K,V>[] table; // 数组本身被 volatile 修饰
   volatile V val;                       // 节点值被 volatile 修饰
   volatile Node<K,V> next;              // 下一个节点指针被 volatile 修饰
   ```

   这保证了任何一个写线程对节点值或链表结构的修改，对其他读线程都是立即可见的。

2. **Copy-On-Write 思想与 ForwardingNode**：

   在扩容期间，读线程如果访问到已经迁移完的桶，会遇到 `ForwardingNode`。该节点会引导读线程去新数组中进行查询，因此读写操作可以并发进行，互不阻塞。
