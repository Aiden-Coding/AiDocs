---
sidebar_position: 7
---

# 访问控制与编译优化

Swift 提供了严格且灵活的访问控制（Access Control）机制，帮助开发者定义代码模块间的隐蔽边界与封装级别。此外，Swift 编译器（`swiftc`）结合 **全模块优化 (Whole Module Optimization, WMO)** 与特有属性（如 `@inlinable`），能够打破模块屏障并实现极高的运行时性能。

---

## 1. Swift 五级访问控制矩阵

Swift 的访问控制基于**源文件（Source File）**与**模块（Module）**的概念：

| 访问级别 | 作用域范围 | 继承 / 重写限制 | 典型应用场景 |
| :--- | :--- | :--- | :--- |
| **`open`** | 任意模块 | **允许**跨模块继承与重写 (Override) | SDK/框架对外公开的基类与类方法 |
| **`public`** | 任意模块 | **禁止**跨模块继承与重写，仅允许访问 | SDK 对外暴露的结构体、方法、枚举与 API |
| **`internal`** (默认) | 当前 Module 内部 | 允许 Module 内继承与重写 | 应用内部的业务逻辑代码（未指定时的默认级别） |
| **`fileprivate`** | 单个 `.swift` 源文件 | 仅限同文件内继承与重写 | 同一个源文件内多个 Extension 或辅助类间共享 |
| **`private`** | 声明封闭作用域 `{}` | 仅限作用域内及同文件 Extension 访问 | 类的内部私有状态与私有属性 |

:::tip 访问级别一致性原则
Swift 访问控制遵循**“不高于原则”**：一个类型的访问级别不能高于其属性或参数类型的访问级别。例如，`public` 函数不能接受 `internal` 结构体作为参数。
:::

### 1.1 `open` 与 `public` 的关键区别

`open` 仅适用于**类（Class）**及其成员：

```swift
// 在网络库 SDK 模块中：
open class BaseNetworkTask {
    open func execute() { } // 外部 Module 可以继承 BaseNetworkTask 并 override 此方法
}

public class FixedNetworkTask {
    public func cancel() { } // 外部 Module 可以调用 cancel()，但不能继承该类或 override 此方法
}
```

限制外部模块继承 (`public`) 可以赋予框架设计者极强的重构自由度，防止用户因随意子类化破坏框架内部假设。

---

## 2. 编译期优化与函数内联 (Inlining)

Swift 默认采用**单独编译（Single-file Compilation）**：编译器针对每个 `.swift` 文件单独生成目标文件。这导致跨文件或跨模块的方法调用无法在编译期直接内联（Inlining），只能留给链接期或进行函数指针调用。

### 2.1 全模块优化 (Whole Module Optimization, WMO)

开启 WMO 后，Swift 编译器将整个模块内的所有源文件作为一个整体进行分析：

- **函数内联**：自动将 `internal` / `private` 的小函数直接内联到调用点，消除函数调用栈开销（Function Call Overhead）。
- **泛型特化 (Generic Specialization)**：在编译期获知泛型的具体类型，直接将泛型代码生成特化版本（如 `Array<Int>` 直接转换为连续内存数组操作）。
- **死代码消除 (Dead Code Elimination)**：移除从未被调用的私有方法与无用代码。

```mermaid
graph TD
    subgraph 单文件编译 (Single File)
        A1[File1.swift] --> B1[swiftc] --> C1[File1.o]
        A2[File2.swift] --> B2[swiftc] --> C2[File2.o]
        C1 & C2 --> Linker[Linker] --> Exec[Binary Executable]
    end
    
    subgraph 全模块优化 (WMO)
        D1[File1.swift & File2.swift] --> E[swiftc WMO]
        E -->|跨文件内联 & 泛型特化| F[Optimized Binary]
    end
```

可以在 Xcode 项目设置或 `Package.swift` 中配置 WMO：

```swift
// Package.swift 配置优化级别
.target(
    name: "MyCoreModule",
    swiftSettings: [
        .unsafeFlags(["-O", "-whole-module-optimization"], .when(configuration: .release))
    ]
)
```

---

## 3. 跨模块内联：`@inlinable` 与 `@usableFromInline`

WMO 只能跨**同模块**内的文件进行内联。若想让三方库中的热点方法在**宿主 App 模块**中被内联，需使用 `@inlinable` 属性。

### 3.1 `@inlinable` 作用机制

带有 `@inlinable` 标注的 `public` 函数，其实现体（AST/SIL 代码）会被打包导出到模块的 `.swiftinterface` 中。宿主 App 在编译时可以直接读取并将其内联。

```swift
public struct Vector2D {
    public var x: Double
    public var y: Double

    @inlinable
    public func dotProduct(_ other: Vector2D) -> Double {
        return x * other.x + y * other.y // 高频调用：内联后彻底消除跨模块调用开销
    }
}
```

### 3.2 `@usableFromInline` 辅助标注

如果 `@inlinable` 方法内部引用了 `internal` 属性或辅助方法，编译会报错。此时需将这些被用到的内部成员标为 `@usableFromInline`：

```swift
public struct Calculator {
    @usableFromInline
    internal var baseOffset: Int = 100 // 允许跨模块内联代码直接访问此 internal 属性

    @inlinable
    public func compute(_ value: Int) -> Int {
        return value + baseOffset
    }
}
```

:::warning ABI 稳定性与版本兼容警告
将函数标注为 `@inlinable` 意味着其实现细节成为了公共 ABI 契约的一部分。一旦库作者修改了 `@inlinable` 函数的内部实现，依赖该库且未重新编译的宿主二进制程序可能继续运行旧版内联代码，破坏升级兼容性。
:::
