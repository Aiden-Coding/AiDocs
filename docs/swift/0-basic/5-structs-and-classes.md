---
sidebar_position: 5
---

# 结构体与类 (Structs vs Classes)

Swift 提供了两种核心的数据建模工具：**结构体 (Struct)** 与 **类 (Class)**。理解它们的本质区别、内存分配原理以及深浅拷贝行为，是写出高性能、无 Bug 的 Swift 代码的基础。

---

## 1. 值类型 vs 引用类型

| 特性 | 结构体 (Struct) | 类 (Class) |
| :--- | :--- | :--- |
| **类型分类** | **值类型 (Value Type)** | **引用类型 (Reference Type)** |
| **传递方式** | 赋值或传参时进行拷贝（Copy） | 赋值或传参时传递引用指针（Reference） |
| **内存分配** | 优先分配在**栈 (Stack)** | 分配在**堆 (Heap)**，栈存指针 |
| **继承性** | 不支持继承（可通过 Protocol 拓展） | 支持单继承（Inheritance） |
| **析构器 (deinit)** | 不支持 | 支持 `deinit` 生命周期回调 |
| **引用计数 (ARC)** | 不涉及引用计数开销 | 涉及 ARC 动态加减引用计数 |

```swift
// 值类型行为：a 与 b 完全独立
struct PointStruct { var x: Int, y: Int }
var a = PointStruct(x: 0, y: 0)
var b = a
b.x = 10 // a.x 依然为 0

// 引用类型行为：c 与 d 指向内存堆中的同一块区域
class PointClass { var x: Int = 0, y: Int = 0 }
let c = PointClass()
let d = c
d.x = 10 // c.x 同步变为 10
```

---

## 2. 栈内存 vs 堆内存分配

### 2.1 栈 (Stack) 分配

- **原理**：基于 CPU 栈指针（Stack Pointer）向上或向下平移，极快（仅需一条 CPU 指令）。
- **生命周期**：严格遵循“后进先出 (LIFO)”，作用域结束（如函数返回）时自动销毁。
- **Struct 优越性**：没有额外的垃圾回收或引用计数开销。

### 2.2 堆 (Heap) 分配

- **原理**：需要在堆内存管理器中查找合适大小的空闲块，涉及线程锁和内存碎片整理，开销显著高于栈。
- **内存布局**：
  - Class 实例头部包含 16 字节固定元数据（Type Metadata 指向 & RefCount 引用计数）。
  - 属性紧随其后。

---

## 3. 深拷贝与浅拷贝

- **浅拷贝 (Shallow Copy)**：仅复制指针或对象的外层结构，底层引用的堆对象依然被共享。
- **深拷贝 (Deep Copy)**：递归复制整棵对象图，生成一份物理隔离的全新副本。

当 Struct 包含 Class 属性时，默认的赋值会导致**指针共享**：

```swift
class ImageCache { var data = "ImageData" }

struct UserAvatar {
    var name: String
    var cache: ImageCache // 引用类型属性
}

var avatar1 = UserAvatar(name: "Alice", cache: ImageCache())
var avatar2 = avatar1 // name 被值拷贝，但 cache 指针被共享！

avatar2.cache.data = "Updated" // avatar1.cache.data 也会受影响
```

---

## 4. `mutating` 关键字与可变性

Struct 的实例方法默认无法修改本身的属性。若方法需要修改内部属性，必须显式标注 `mutating` 关键字：

```swift
struct Counter {
    var count = 0
    
    // mutating 告诉编译器：调用该方法会隐式修改 self（传入 inout self 指针）
    mutating func increment() {
        count += 1
    }
}

let fixedCounter = Counter()
// fixedCounter.increment() // 编译报错！let 声明的值类型不能调用 mutating 方法
```

:::tip 设计模式与最佳实践
1. **默认优先 Struct**：除非明确需要共享状态、继承关系或 `deinit` 析构逻辑，否则一律使用 Struct。
2. **状态隔离**：Struct 天然避开了多线程并发读写造成的 Race Condition 问题。
:::
