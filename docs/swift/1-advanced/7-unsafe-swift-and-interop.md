---
sidebar_position: 7
---

# Unsafe Swift 与 C/C++ 互操作

虽然 Swift 是一门类型安全且内存安全的强类型语言，但在执行底层高性能计算、与 C/POSIX 系统 API 交互或直接读写硬件/网络裸数据包时，开发者需要绕过 Swift 编译器的安全检查，使用 **Unsafe 指针族**。同时，Swift 5.9+ 引入了**原生 C++ 互操作（C++ Interop）**，使得 Swift 与 C++ 库能够做到双向无缝调用。

---

## 1. Swift Unsafe 指针体系矩阵

Swift 将裸内存指针分为 4 大核心分类，区别在于**是否强类型 (Typed vs Raw)** 以及 **是否可变 (Mutable vs Immutable)**：

| 指针类型 | 强类型 / 原始二进制 | 是否可变 | 对应 C 语言指针 |
| :--- | :--- | :--- | :--- |
| **`UnsafePointer<T>`** | 强类型 `T` | 只读 | `const T *` |
| **`UnsafeMutablePointer<T>`** | 强类型 `T` | 可读写 | `T *` |
| **`UnsafeRawPointer`** | 原始字节位（无类型） | 只读 | `const void *` |
| **`UnsafeMutableRawPointer`** | 原始字节位（无类型） | 可读写 | `void *` |

:::tip BufferPointer 缓冲指针
除标量指针外，Swift 对应提供了 `UnsafeBufferPointer<T>` 和 `UnsafeMutableRawBufferPointer`。它们遵循 `Collection` 协议，带有 `count` 属性，支持像数组一样按索引下标访问内存块。
:::

---

## 2. Unsafe 内存操作实战

### 2.1 获取临时内存指针：`withUnsafeBytes` 与 `withUnsafePointer`

在 Swift 中，绝不能直接持有指针变量并超出作用域，最安全的方式是使用闭包作用域 (`withUnsafe...`)：

```swift
var value: Int64 = 0x123456789ABCDEF0

// 1. 以只读原始字节流查看 Int64 的内存布局
withUnsafeBytes(of: &value) { rawBuffer in
    print("内存大小:", rawBuffer.count) // 8 字节
    for (index, byte) in rawBuffer.enumerated() {
        print(String(format: "Byte %d: 0x%02X", index, byte))
    }
}

// 2. 传递可变指针给 C 函数修改值
withUnsafeMutablePointer(to: &value) { ptr in
    ptr.pointee = 42
}
```

### 2.2 手动内存分配与生命周期管理

当需要通过裸指针手动申请堆内存时，必须严格遵守**申请 -> 初始化 -> 使用 -> 反初始化 -> 释放**的完整生命周期：

```swift
let count = 5
// 1. 申请分配能容纳 5 个 Int32 的内存块
let pointer = UnsafeMutablePointer<Int32>.allocate(capacity: count)

// 2. 初始化内存值（Memory Initialization）
pointer.initialize(repeating: 10, count: count)

// 3. 访问与指针移动（Pointer Arithmetic）
for i in 0..<count {
    (pointer + i).pointee = Int32(i * 100)
}

print(pointer[3]) // 输出 300

// 4. 反初始化与释放（防内存泄漏）
pointer.deinitialize(count: count)
pointer.deallocate()
```

---

## 3. Swift 与 C / C++ 无缝互操作

### 3.1 C 语言函数与结构体桥接

在 Bridging Header（ bridging-header.h）或 SPM 模块中引入 C 头文件后，Swift 可直接调用 C 函数与类型：

- C 语言 `void *` 转换为 Swift `UnsafeMutableRawPointer`。
- C 语言函数指针 `int (*func)(int)` 转换为 Swift 函数 `cFunction: @convention(c) (Int32) -> Int32`。

### 3.2 Swift 5.9+ C++ 双向互操作 (C++ Interop)

从 Swift 5.9 开始，Swift 编译器原生支持读取 C++ 头文件，并将 C++ 的类、模板与容器自动映射为 Swift 类型。

#### 在 `Package.swift` 中启用 C++ Interop：

```swift
// Package.swift
.target(
    name: "MyCPPInteropModule",
    cxxSettings: [
        .unsafeFlags(["-std=c++20"])
    ],
    swiftSettings: [
        .interoperabilityMode(.Cxx) // 开启 C++ 互操作模式
    ]
)
```

#### C++ 代码实现 (`Engine.hpp`):

```cpp
#pragma once
#include <string>
#include <vector>

class Engine {
public:
    Engine(std::string name) : name_(name) {}
    std::string getName() const { return name_; }
    int calculatePower(const std::vector<int>& inputs) const;
private:
    std::string name_;
};
```

#### Swift 中无缝调用 C++ (`Main.swift`):

```swift
import CxxStdlib // 引入 C++ 标准库类型 (std::string, std::vector)
import MyCPPModule

// 1. 直接实例化 C++ 类
let cppEngine = Engine(std::string("V8-Turbo"))
print("Engine Name:", String(cppEngine.getName()))

// 2. 将 Swift 数组或 C++ vector 传给 C++ 函数
var vec = std.vector<Int32>()
vec.push_back(10)
vec.push_back(20)

let power = cppEngine.calculatePower(vec)
```

:::note 值类型与内存策略映射
- 具备 Copy Constructor 与 Destructor 的 C++ 类在 Swift 中映射为**值类型 (Value Type)**，遵从 Swift 的 Copy-On-Write 或值复制语义。
- 若 C++ 类禁用拷贝赋值，Swift 会将其自动处理为不可拷贝类型 (`~Copyable`)。
:::
