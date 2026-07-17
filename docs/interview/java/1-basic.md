---
title: 一、Java 基础与集合
sidebar_label: 1. 基础与集合
sidebar_position: 1
---

# 一、Java 基础与集合

本章包含 Java 基础语法、面向对象特性以及集合框架底层的核心面试考点。

---

## 1. == 与 equals 的区别

在 Java 中，对于数据类型的比对有不同的底层逻辑。

### `==` 运算符

- **基本数据类型**：比较的是存储的**数值**是否相等。
- **引用数据类型**：比较的是两个对象在堆内存中的**物理地址**（即是否指向同一个内存指针）。

### `equals` 方法

- 它是 `java.lang.Object` 中的一个实例方法，默认实现采用 `==` 进行物理地址比较。
- 绝大多数核心类（如 `String`、`Integer` 等）都重写了该方法，将其改造为**内容逻辑等价性**的比较。

### hashCode 与 equals 的核心契约

如果两个对象根据 `equals` 方法判定是相等的，那么它们的 `hashCode` 方法必须产生相同的整数结果。

在哈希表（如 `HashMap`、`HashSet`）中，定位元素位置的计算公式如下：

```java
int index = (n - 1) & (hash(key.hashCode()));
```

若重写了 `equals` 而没有重写 `hashCode`，会导致：
1. 逻辑相等的两个对象产生不同的哈希值。
2. 存入哈希容器时，可能被路由到不同的桶（Bucket）中，从而造成容器中出现逻辑重复的键，违反 Map 唯一键约束。

---

## 2. String、StringBuilder、StringBuffer 的区别

三者在可变性、线程安全以及性能上存在较大差异。

### 可变性

- `String` 类的底层 `char[]`（JDK 9 之后为 `byte[]`）由 `private final` 修饰，一旦初始化便**不可修改**。任何拼接或裁剪操作都会生成新的 `String` 对象。
- `StringBuilder` 与 `StringBuffer` 均继承自 `AbstractStringBuilder`，其底层的字符数组没有 `final` 修饰，是**可变的**，支持就地修改。

### 线程安全性

- `String` 由于其不可变性，是天然**线程安全**的。
- `StringBuffer` 几乎所有关键修改方法均加了 `synchronized` 关键字，是**线程安全**的，适用于多线程高并发写入场景。
- `StringBuilder` 没有添加锁同步，是**非线程安全**的，适用于单线程拼接场景。

### 性能对比

- 在单线程大量拼接字符的场景中，性能排序为 `StringBuilder` > `StringBuffer` > `String`。

### 字符串常量池演进

- 在 JDK 6 及以前，字符串常量池（String Table）位于**方法区（PermGen）**中，容量较小，容易引发 `java.lang.OutOfMemoryError: PermGen space`。
- 自 **JDK 7 起**，字符串常量池被移到了 **Java 堆（Heap）** 中。
- **转移原因**：堆内存是垃圾回收器（GC）的核心工作区。将常量池移入堆中，使得未被引用的字符串常量的内存空间可以被 GC 及时回收，大幅降低了由于大量拼接、动态生成字符串导致的 OOM 风险。

---

## 3. HashMap 底层原理

`HashMap` 底层使用**数组+链表+红黑树**的结构。

### 为什么链表长度大于等于 8 且数组长度大于等于 64 才树化

- **数学统计学依据**：根据概率论中的**泊松分布（Poisson Distribution）**，哈希表中同一个桶内发生冲突的概率随着节点数的增加而急剧递减。当负载因子为 0.75 时，同一个桶内链表长度达到 8 的概率仅为 0.00000006，这属于极小概率事件。
- **防止树化冲突的平衡**：红黑树的节点所占内存是普通链表节点（`Node`）的两倍，且插入时需要进行左旋、右旋和变色来维持平衡，在节点较少时，红黑树的查找效率并不比链表有明显优势。
- **64 的限制**：当数组容量小于 64 时，如果频繁发生哈希冲突，`HashMap` 优先选择对数组进行扩容（Resize）而非树化，因为扩容能直接打散哈希冲突的分布。只有数组长度大于等于 64 且某条链表长度大于等于 8 时，才正式将链表转化为红黑树。

### 为什么容量必须是 2 的幂

1. **加快定位计算**：如果容量 `n` 是 2 的幂，那么 `(n - 1)` 的二进制表示所有低位全部为 1（例如 16 的 `n-1` 为二进制 `1111`）。此时计算索引：

   ```java
   int index = hash & (n - 1);
   ```

   该位运算与数学上的取模运算 `hash % n` 等价，但位运算的执行速度远快于除法取模。
2. **减少碰撞几率**：若 `n` 不是 2 的幂，`(n - 1)` 的二进制中某些位将为 0。在进行位与运算时，不管 `hash` 对应位是 0 还是 1，结果相应位永远为 0，这会导致数组中某些索引位置永远无法被分配到，造成严重的哈希碰撞与空间浪费。

---

## 4. ConcurrentHashMap 在 JDK 7 和 JDK 8 的实现差异

两者在并发控制的粒度与内部数据结构上发生了彻底的改变。

### JDK 7：Segment 分段锁

- **结构**：采用 `Segment` 数组，每个 `Segment` 内部包含一个 `HashEntry` 数组。`Segment` 继承自 `ReentrantLock`。
- **锁粒度**：锁的粒度在 `Segment` 级别。最大并发度等于 `Segment` 的数量（默认 16）。在同一个 `Segment` 下的写入操作仍需要竞争同一把锁，并发性能受限。

### JDK 8：CAS + synchronized 锁桶头

- **结构**：取消了 `Segment` 数组，直接采用一个 `Node` 数组（桶数组），内部节点在特定条件下树化为 `TreeNode`。
- **并发控制**：
  - 当放入元素时，如果对应的桶头节点为 `null`，使用无锁的 **CAS**（Compare And Swap）进行乐观写入。
  - 如果发生冲突，则使用 **`synchronized`** 对当前的**桶头节点**进行加锁。
- **优势**：
  - 锁粒度细化到了每个具体的数组槽（桶）。
  - 最大并发度直接等同于数组的长度，极大地提升了高并发读写性能。
  - 不再使用 `ReentrantLock`，转而使用 JVM 层面持续被优化的 `synchronized`，锁空间开销变小。

---

## 5. ArrayList 扩容机制与 fail-fast 机制

`ArrayList` 是基于动态数组实现的非线程安全集合。

### 扩容机制

- 当向 `ArrayList` 中添加元素且容量不足时，会触发扩容。
- 扩容的核心方法是 `grow(int minCapacity)`。
- **扩容倍数**：新容量为旧容量的 1.5 倍。

  ```java
  int newCapacity = oldCapacity + (oldCapacity >> 1);
  ```

- 扩容计算完毕后，通过 `Arrays.copyOf(elementData, newCapacity)` 分配新数组，并将旧数据拷贝到新数组中。

### `fail-fast` 机制

- **概念**：它是 Java 集合框架中的一种快速失败机制。当使用迭代器（Iterator）遍历集合时，如果集合结构在遍历过程中被修改（添加或删除元素），遍历将立刻抛出 `ConcurrentModificationException`。
- **实现原理**：
  - `ArrayList` 内部有一个类成员变量 `modCount`，记录集合结构被修改的次数。
  - 当通过 `iterator()` 获取迭代器时，迭代器内部会保存一个 `expectedModCount = modCount`。
  - 在迭代器的 `next()` 或 `remove()` 方法执行时，会校验 `modCount == expectedModCount`。如果两者不一致，说明遍历期间有其他线程或当前线程使用集合原生方法修改了结构，于是立刻抛出异常。
  - **避坑防范**：如果在遍历中需要删除元素，必须使用 `Iterator.remove()` 方法而非 `ArrayList.remove()`。

---

## 6. 接口与抽象类的区别

接口与抽象类是 Java 中多态和抽象的重要表现形式。

### 结构与语义区别

- **继承限制**：一个类只能继承（`extends`）一个抽象类，但可以实现（`implements`）多个接口。
- **成员变量**：接口中的成员变量默认是 `public static final` 的，而抽象类中可以定义任意权限修饰符的普通成员变量。
- **设计意图**：抽象类是对**事物本质的抽象**（属于 `is-a` 关系），用于代码复用；接口是对**行为规范的抽象**（属于 `like-a` 关系），用于定义契约。

### Java 8 接口 default/static 方法的引入背景

在 Java 8 之前，接口一旦发布，若对其增加新方法，所有的实现类都必须强制重写，这会导致向后兼容性极差（破坏了既有生态中的大量类）。

为了解决这一痛点，Java 8 引入了 `default`（默认方法）和 `static`（静态方法）：
- **`default` 方法**：允许在接口中编写带有具体实现体的方法，且不强制要求实现类重写。它优雅地解决了接口升级时**向下兼容性**问题，使得集合类如 `Collection` 能直接获得 `stream()`、`forEach()` 等新特性。
- **`static` 方法**：可以直接通过接口名调用，充当了工具方法，避免了额外创建无状态辅助工具类。

---

## 7. 深拷贝与浅拷贝及 Optional 的正确用法

内存数据的复制形式与空安全编排是开发中的常见考点。

### 深拷贝与浅拷贝

- **浅拷贝（Shallow Copy）**：新对象创建后，只复制了原对象的物理值或引用地址。如果对象属性是引用类型，新旧对象将指向同一个堆内存中的子对象，修改子对象属性会互相影响。
- **深拷贝（Deep Copy）**：不仅创建新对象，而且递归地为原对象中所有的引用类属性创建全新的子对象实例。新旧对象在内存上完全隔离，互不干扰。
- **深拷贝实现方案**：
  1. 重写 `clone()` 方法，并在其中手动对其引用类型属性进行二次克隆。
  2. 使用序列化与反序列化（例如 Java 本生序列化，Jackson / Gson 转换）。

### Optional 避坑指南

`Optional` 的核心初衷是**作为方法返回类型**，用于显式提示调用者可能为空，从而消除防御性的 `null` 判断，而不是用来完全替代 `null` 指针。

- **不推荐用法**：
  - 不要将 `Optional` 作为类的属性，它未实现 `Serializable` 接口。
  - 不要将 `Optional` 作为方法参数，这会增加调用方的包装开销，使代码变得冗余。
  - 避免直接调用 `get()`，否则在无值时仍会抛出 `NoSuchElementException`，这违背了防空指针的设计初衷。
- **推荐优雅写法**：

  ```java
  // 结合 map, flatMap, filter 进行流式降噪
  String name = Optional.ofNullable(user)
      .map(User::getName)
      .filter(n -> n.length() > 2)
      .orElse("Guest");
  ```

---

## 8. 异常体系与 try-with-resources 原理

Java 异常分类及资源关闭的内部糖衣。

### Checked Exception 与 Unchecked Exception

- **Checked 异常（受检异常）**：继承自 `Exception` 但不属于 `RuntimeException`（如 `IOException`、`SQLException`）。编译器在编译阶段强制要求开发者使用 `try-catch` 进行捕获或者在方法签名上声明 `throws`，用于预防可恢复的外部环境异常。
- **Unchecked 异常（非受检异常）**：继承自 `RuntimeException`（如 `NullPointerException`、`IndexOutOfBoundsException`）。编译器不强制进行异常处理，多为代码层面的逻辑错误，应当通过健壮性编码进行规避。

### `try-with-resources` 原理

Java 7 引入的 `try-with-resources` 是一颗语法糖，任何实现了 `java.lang.AutoCloseable` 接口的资源类都可以放入 `try()` 中。

编译后，JVM 会自动将其翻译为传统的 `try-catch-finally` 结构，并在 `finally` 块中调用该资源的 `close()` 方法。

#### 异常抑制（Suppressed Exceptions）机制

如果在 try 块内抛出了业务异常，而在 `finally` 关闭资源时也抛出了 `IOException`，传统的 `finally` 块关闭资源可能会覆盖并丢弃主业务异常。

而 `try-with-resources` 编译后的代码会保留主异常，并调用主异常的 `addSuppressed(Throwable exception)` 方法将资源释放时的二级异常挂载在主异常链中，开发人员在捕获主异常时可以通过 `getSuppressed()` 获取所有被抑制的异常信息，利于问题定位。
