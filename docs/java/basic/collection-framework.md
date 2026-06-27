---
title: Java 集合框架底层源码深剖
hide_title: true
sidebar_label: 集合框架底层机制
sidebar_position: 10
---

# 深入 Java 集合框架源码与物理结构

在 Java 面试与高并发生产实战中，集合框架（Java Collections Framework）是承载数据的底层容器基石。理解它们不仅要停留在“如何使用”，更要深入到 JDK 底层源码，透解其数据结构设计、扩容物理代价以及排序和顺序控制机制。

本篇将深度剖析 `ArrayList`、`LinkedList`、`LinkedHashMap` 以及 `TreeMap` 核心源码与底层演进。

---

## 一、 ArrayList 动态数组核心源码剖析

`ArrayList` 底层是一个 **Object 数组**（`transient Object[] elementData`），提供 $O(1)$ 的随机访问性能，但在随机插入与删除时，需要通过物理内存拷贝来搬移数据，性能开销呈 $O(N)$。

### 1. 延迟初始化与默认容量

在 JDK 8 及之后，为了节约内存开销，在执行 `new ArrayList()` 时，并不会立即在堆内存中创建大小为 10 的数组，而是让底层数组指向一个空数组常量 `DEFAULTCAPACITY_EMPTY_ELEMENTDATA`。只有在**第一次调用 `add` 方法**向容器添加元素时，才会触发真正容量为 **10** 的数组初始化。

### 2. 扩容（`grow`）算法与物理开销

当元素个数达到数组最大承载量时，会触发扩容机制。其核心源码逻辑在内部私有方法 `grow` 中：

```java
private void grow(int minCapacity) {
    // 1. 获取当前数组的容量
    int oldCapacity = elementData.length;
    // 2. 利用位运算，将容量提升至原来的 1.5 倍
    int newCapacity = oldCapacity + (oldCapacity >> 1);
    
    // 3. 校验扩容后的新容量是否满足所需的最小容量
    if (newCapacity - minCapacity < 0)
        newCapacity = minCapacity;
    if (newCapacity - MAX_ARRAY_SIZE > 0)
        newCapacity = hugeCapacity(minCapacity);
        
    // 4. 底层利用 System.arraycopy 发起物理内存块拷贝，创建新数组并转移数据
    elementData = Arrays.copyOf(elementData, newCapacity);
}
```

```mermaid
graph TD
    Add[调用 add 写入元素] --> Check{size + 1 > elementData.length?}
    Check -- 否 --> Write[直接在 size 处写入并 size++]
    Check -- 是 --> Grow[触发 grow 扩容方法]
    Grow --> Calc[新容量 = oldCapacity + oldCapacity >> 1]
    Calc --> Copy[Arrays.copyOf 创建新数组]
    Copy --> SystemCopy[调用 System.arraycopy 批量搬移数据]
    SystemCopy --> Write
```

> [!WARNING]
> **性能隐患**：由于扩容涉及到 `Arrays.copyOf` 进而调用 Native 方法 `System.arraycopy` 进行全量内存数据的块拷贝，性能代价高昂。在生产环境中，**如果能预估数据量大小，强制在初始化时指定容量**（如 `new ArrayList(100)`），可完美避免高频扩容带来的堆碎片和性能抖动。

---

## 二、 LinkedList 双向链表结构与定位优化

`LinkedList` 是典型的双向链表，内部通过头结点 `first` 和尾结点 `last` 维护整条链条，每个物理节点被包装为内部类 `Node` 实例：

```java
private static class Node<E> {
    E item;
    Node<E> next;
    Node<E> prev;

    Node(Node<E> prev, E element, Node<E> next) {
        this.item = element;
        this.next = next;
        this.prev = prev;
    }
}
```

### 1. 插入与查询特征
- **高频插入/删除**：如果仅仅是头尾插入（通过 `addFirst`/`addLast`），时间复杂度为 $O(1)$，不需要像 `ArrayList` 一样搬移内存，只需修改前后节点的 `prev`/`next` 指针即可。
- **随机访问**：如果需要获取第 $i$ 个元素，必须沿着链表指针进行线性轮询扫描，最坏时间复杂度为 $O(N)$。

### 2. 源码中的定位折半优化（`node` 方法）

为了降低线性扫描的开销，JDK 底层在根据索引定位节点时做了一个简单的**折半查找**优化：

```java
Node<E> node(int index) {
    // 1. 如果 index 小于 size 的一半，则从头节点(first)向后正向遍历
    if (index < (size >> 1)) {
        Node<E> x = first;
        for (int i = 0; i < index; i++)
            x = x.next;
        return x;
    } 
    // 2. 如果 index 落在后半段，则从尾节点(last)向前逆向遍历
    else {
        Node<E> x = last;
        for (int i = size - 1; i > index; i--)
            x = x.prev;
        return x;
    }
}
```
通过该优化，虽然无法改变其 $O(N)$ 的本质，但可以将平均定位查找的指针移动次数直接减半。

---

## 三、 LinkedHashMap 核心原理与 LRU 缓存落地

`LinkedHashMap` 继承自 `HashMap`，它在 `HashMap` 极其优秀的高吞吐哈希结构基础上，为所有 Entry 节点额外维护了一套**物理双向链表**。该设计能完好保存元素的**插入顺序**（Insertion Order）或**访问顺序**（Access Order）。

### 1. 物理结构示意图

`LinkedHashMap` 的节点 `Entry` 继承自 `HashMap.Node`，并增加了 `before` 和 `after` 两个指针域：

```mermaid
graph LR
    subgraph LinkedHashMap 双向循环链表
        Head[Header 虚拟头] <--> Node1[Node 1<br/>K1:V1]
        Node1 <--> Node2[Node 2<br/>K2:V2]
        Node2 <--> Node3[Node 3<br/>K3:V3]
        Node3 <--> Tail[Tailer 尾节点]
    end
    subgraph HashMap 哈希散列表
        Bucket0[桶 0] --> Node1
        Bucket1[桶 1] --> Node2
        Bucket1 --> Node3
    end
```

### 2. 访问顺序控制与 `afterNodeAccess` 源码

当在初始化时将构造参数 `accessOrder` 设置为 `true` 时，每当调用 `get` 方法访问某个 Key，底层都会通过拦截回调方法 `afterNodeAccess` 将被访问的节点**摘除并移动至链表的末尾**。

```java
void afterNodeAccess(Node<K,V> e) { // 将当前节点移到双向链表末尾
    LinkedHashMap.Entry<K,V> last;
    if (accessOrder && (last = tail) != e) {
        LinkedHashMap.Entry<K,V> p = (LinkedHashMap.Entry<K,V>)e, b = p.before, a = p.after;
        p.after = null;
        if (b == null)
            head = a;
        else
            b.after = a;
        if (a != null)
            a.before = b;
        else
            last = b;
        if (last == null)
            head = p;
        else {
            p.before = last;
            last.after = p;
        }
        tail = p;
        ++modCount;
    }
}
```

### 3. 大厂生产级 LRU（Least Recently Used）缓存极致实现

在 `LinkedHashMap` 每次执行 `put` 插入新节点时，都会触发 `afterNodeInsertion` 回调方法。该方法会通过调用 `removeEldestEntry(eldest)` 来判断是否需要剔除最老的元素：

```java
void afterNodeInsertion(boolean evict) { // p 为刚刚插入的节点
    LinkedHashMap.Entry<K,V> first;
    // 如果重写的 removeEldestEntry 返回 true，则会将链表头部的最老节点删除
    if (evict && (first = head) != null && removeEldestEntry(first)) {
        K key = first.key;
        removeNode(hash(key), key, null, false, true);
    }
}
```

利用这一特性，我们只需寥寥几行代码，即可实现一个**线程安全、具备最大容量限制的高性能 LRU 缓存**：

```java
package docs.java.basic.collection;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 生产级高性能 LRU 局部缓存实现
 */
public class LocalLRUCache<K, V> extends LinkedHashMap<K, V> {
    
    private final int maxCapacity;

    public LocalLRUCache(int maxCapacity) {
        // 设置默认容量、加载因子，并且开启 accessOrder = true 依照访问顺序维护链表
        super(maxCapacity, 0.75f, true);
        this.maxCapacity = maxCapacity;
    }

    /**
     * 重写剔除最老元素断言，当元素数量超过设定的最大容量时返回 true
     */
    @Override
    protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
        return size() > maxCapacity;
    }
}
```

---

## 四、 TreeMap 红黑树强自排序机制剖析

`TreeMap` 的底层是一个**红黑树（Red-Black Tree）**。它不依赖哈希计算，而是通过节点间的键值比较来决定在树中的位置，这使得其内部所有键值对在任何时刻都处于**严格排序状态**。

### 1. 红黑树的五大物理性质

红黑树是一种自平衡的二叉查找树，它通过以下 5 大约束保证了最坏情况下的查找、插入和删除时间复杂度均能稳定在 $O(\log N)$：

1. **性质一**：节点非红即黑。
2. **性质二**：根节点必须是黑色（Root is Black）。
3. **性质三**：所有叶子节点（NIL 哨兵节点）都是黑色。
4. **性质四**：红色节点的子节点必须是黑色（**不能出现连续的红色节点**）。
5. **性质五**：从任意节点到其所有叶子节点的所有路径上，所包含的**黑色节点数量必须相同**（保证黑高平衡）。

### 2. 插入自平衡：旋转与变色

当向 `TreeMap` 插入新节点时，新节点默认被标记为**红色**（为了不打破性质五）。但如果其父节点也是红色，就会破坏性质四，此时红黑树需要通过**左旋（Left Rotate）**、**右旋（Right Rotate）**及**变色（Coloring）**来恢复平衡。

#### 旋转操作源码解析：
```java
// TreeMap 底层左旋源码
private void rotateLeft(Entry<K,V> p) {
    if (p != null) {
        Entry<K,V> r = p.right; // 拿到右子节点
        p.right = r.left;       // 将右子节点的左子树挂到当前节点的右子树上
        if (r.left != null)
            r.left.parent = p;
        r.parent = p.parent;    // 调整父节点引用
        if (p.parent == null)
            root = r;
        else if (p.parent.left == p)
            p.parent.left = r;
        else
            p.parent.right = r;
        r.left = p;             // 当前节点成为其原右子节点的左节点
        p.parent = r;
    }
}
```

```mermaid
graph TD
    subgraph 左旋 (Rotate Left)
        direction LR
        P1[节点 P] --> L1[左子树]
        P1 --> R1[节点 R]
        R1 --> RL1[子树 RL]
        R1 --> RR1[右子树 RR]
        
        Link1[==== 左旋后 ====>]
        
        R2[节点 R] --> P2[节点 P]
        R2 --> RR2[右子树 RR]
        P2 --> L2[左子树]
        P2 --> RL2[子树 RL]
    end
```

### 3. 自定义比较器与排序路由

`TreeMap` 能够维持排序的动力源自 `Comparable` 接口或构造传入的 `Comparator`。在插入新节点（`put`）时，TreeMap 从根节点出发进行二分查找，决定向左子树还是右子树延伸：

```java
public V put(K key, V value) {
    Entry<K,V> t = root;
    // ... 略去根节点为空的创建逻辑
    int cmp;
    Entry<K,V> parent;
    // 优先采用自定义的比较器 comparator
    Comparator<? super K> cpr = comparator;
    if (cpr != null) {
        do {
            parent = t;
            cmp = cpr.compare(key, t.key); // 比对 key 决定路由
            if (cmp < 0)
                t = t.left;  // 键小于当前节点，走左子树
            else if (cmp > 0)
                t = t.right; // 键大于当前节点，走右子树
            else
                return t.setValue(value); // 键相等，覆盖原值
        } while (t != null);
    }
    // ... 插入并执行 fixAfterInsertion(e) 旋转变色自平衡
}
```

> [!IMPORTANT]
> **开发警示**：由于 `TreeMap` 仅依靠 `compare` 或 `compareTo` 返回值是否为 `0` 来判定两个键是否相等，**而完全不使用 `equals` 和 `hashCode`**。因此，如果两个不同对象的比较结果返回了 `0`，它们将被 TreeMap 判定为同一个键而遭到覆盖。编写比较器时，**务必确保比较规则与 `equals` 的一致性**。
