---
sidebar_position: 4
---

# 集合类型与 COW 写时复制

Swift 提供了三种核心集合类型：**数组 (Array)**、**集合 (Set)** 以及**字典 (Dictionary)**。它们均以结构体（Struct）的形式实现，属于值类型（Value Type），并广泛应用了**写时复制（Copy-On-Write, COW）**机制来保障高效的内存性能与安全的并发访问。

---

## 1. Swift 三大核心集合

### 1.1 数组 (Array)

`Array` 是有序的数据集合。底层使用连续的内存块存储元素。

- **随机访问**：时间复杂度为 $O(1)$。
- **末尾追加**：均摊时间复杂度 $O(1)$；当触发容量重分配（Reallocation）时为 $O(n)$。
- **插入/删除**：中间位置插入或删除需要移动后续元素，时间复杂度为 $O(n)$。

```swift
var numbers = [1, 2, 3]
numbers.reserveCapacity(10) // 显式预留容量，减少重新分配次数
```

### 1.2 字典 (Dictionary) 与 集合 (Set)

`Set` 与 `Dictionary` 是无序的，要求 Key（或 Set 元素）遵循 `Hashable` 协议。

- **查找与插入**：平均时间复杂度为 $O(1)$，最坏情况（哈希冲突碰撞）为 $O(n)$。
- **Hashable 协议**：自定义类型作为 Key 时需实现 `hash(into:)`。

```swift
struct UserKey: Hashable {
    let id: UUID
    let name: String
    
    func hash(into hasher: inout Hasher) {
        hasher.combine(id) // 仅结合唯一属性可提高 Hash 效率
    }
}
```

---

## 2. Copy-On-Write (COW) 机制深挖

### 2.1 为什么需要 COW？

在 Swift 中，集合都是值类型。如果每次将数组赋值给新变量或作为参数传递时都进行完整的内存深拷贝（Deep Copy），性能开销将不可接受。

为了兼顾**值语义的安全**与**引用传递的高效**，Swift 引入了 **COW (Copy-On-Write)** 策略：
- **赋值/传参**：仅复制指向底层缓冲区的引用指针，耗时 $O(1)$。
- **修改数据**：只有在发生**写操作**且**底层缓冲区存在多个引用**时，才会触发真正的深拷贝。

```text
[a] ---> [底层 Buffer (引用计数: 2)] <--- [b]
          |
   a.append(4) 触发 COW
          v
[a] ---> [新 Buffer (引用计数: 1)]
[b] ---> [旧 Buffer (引用计数: 1)]
```

### 2.2 底层检测机制：`isKnownUniquelyReferenced`

Swift 标准库内部使用 `isKnownUniquelyReferenced` 函数检查引用的底层 Class 实例是否只有一个强引用：

```swift
// 示意：Swift 标准库集合内部 COW 实现原理
final class Box<T> {
    var value: T
    init(_ value: T) { self.value = value }
}

struct CustomCOWArray<Element> {
    private var buffer: Box<[Element]>
    
    init() {
        self.buffer = Box([])
    }
    
    var mutatingValue: [Element] {
        mutating get {
            // 如果存在多个强引用指针指向同一个 buffer，则复制一个新的 Box
            if !isKnownUniquelyReferenced(&buffer) {
                buffer = Box(buffer.value)
            }
            return buffer.value
        }
    }
}
```

---

## 3. 自定义数据结构实现 COW

要在自定义值类型中实现 COW，可以借助强引用 Wrapper Class 与 `isKnownUniquelyReferenced`：

```swift
final class StorageBox<T> {
    var data: T
    init(data: T) { self.data = data }
}

struct SafeBuffer<T> {
    private var box: StorageBox<T>
    
    init(data: T) {
        self.box = StorageBox(data: data)
    }
    
    var value: T {
        get { box.data }
        set {
            if !isKnownUniquelyReferenced(&box) {
                // 存在共享引用，拷贝一份副本后再写
                box = StorageBox(data: newValue)
            } else {
                // 独占引用，直接原地更新
                box.data = newValue
            }
        }
    }
}
```

:::tip 最佳性能实践
1. **预分配空间**：已知数据规模时，使用 `reserveCapacity(_:)` 可规避频繁的内存重分配与 COW 拷贝。
2. **注意 Class 成员**：若 Struct 中包含引用类型属性，赋值 Struct 本身是值拷贝，但其引用的 Class 实例依然是被共享的。
:::
