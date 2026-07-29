---
sidebar_position: 0
---

# Swift 学习路线指南

欢迎来到 Swift 开发指南！本类目旨在为你提供从基础到高级，甚至是深入到 Apple 生态（如 SwiftUI、Combine、Swift Package Manager）的全套系统化学习资料。

## 适用对象

- 想成为 iOS / macOS / visionOS 开发者的初学者。
- 有其他语言基础，想深入理解 Swift 现代语法和语言特性的工程师。
- 希望更深一步了解 Swift 并发、并发模型、内存管理（ARC）、面向协议编程（POP）以及现代应用架构（MVVM, TCA）的进阶使用者。

## 核心章节概览

### 1. 基础篇 (Basic)

- **[变量与数据类型](./0-basic/1-variables-and-types.md)**：`let`/`var` 不可变性优势、类型推断与 Optional 安全基石。
- **[控制流与模式匹配](./0-basic/2-control-flow.md)**：`for-in`、`where` 条件、`switch` 编译期穷尽性与模式匹配。
- **[函数与闭包](./0-basic/3-functions-and-closures.md)**：参数标签设计、`inout` Copy-In Copy-Out 内存模型与逃逸闭包 `@escaping`。
- **[集合类型与 COW 写时复制](./0-basic/4-collections-and-cow.md)**：Array/Set/Dictionary 存储特征、COW 原理与 `isKnownUniquelyReferenced`。
- **[结构体与类](./0-basic/5-structs-and-classes.md)**：值类型 vs 引用类型、栈与堆内存分配、深浅拷贝与 `mutating` 关键字。
- **[错误处理与 Result 类型](./0-basic/6-error-handling.md)**：`throws`/`try`/`catch` 异常流、`rethrows`、`defer` 清理块与 `Result<Success, Failure>` 范式。

### 2. 进阶篇 (Advanced)

- **[面向协议编程 (POP)](./1-advanced/1-protocol-oriented-programming.md)**：POP 范式、协议扩展默认实现、Protocol Witness Table (PWT) 派发机制。
- **[现代并发 (async/await)](./1-advanced/2-modern-concurrency.md)**：协作式线程池挂起/恢复原理与 `Continuation` 桥接旧版回调。
- **[泛型与不透明类型](./1-advanced/3-generics.md)**：泛型约束、`any` (Existential Container) 与 `some` (Opaque Type) 性能差异。
- **[ARC 与内存管理](./1-advanced/4-arc-and-memory-management.md)**：ARC 引用计数原理、强引用环、`weak`（侧表）与 `unowned` 对比及 Memory Graph 内存泄漏排查。
- **[Actor 与结构化并发](./1-advanced/5-actors-and-structured-concurrency.md)**：`actor` 隔离防数据竞争、`TaskGroup` 结构化并发、`@MainActor` 与 `Sendable` 协议。
- **[属性包装器与 Swift 宏](./1-advanced/6-property-wrappers-and-macros.md)**：`@propertyWrapper` 语法糖、`projectedValue` 与 Swift 5.9+ 编译期宏 (`#freestanding` / `@attached`)。

### 3. 生态与框架篇 (Frameworks)

- **[Swift Package Manager (SPM)](./2-frameworks/1-swift-package-manager.md)**：SPM 清单文件结构、Products、Dependencies 与 Targets 模块依赖管理。
- **[SwiftUI 声明式 UI 基础](./2-frameworks/2-swiftui-basics.md)**：声明式范式、`some View` 结构类型树与 Diff 视图算法。
- **[SwiftUI 状态管理与数据流](./2-frameworks/3-swiftui-data-flow.md)**：`@State` / `@Binding` / `@StateObject` 全景矩阵与 iOS 17+ 现代 Observation 框架（`@Observable`）。
- **[Combine 与 AsyncSequence](./2-frameworks/4-combine-and-async-sequence.md)**：Combine 响应式流水线（Publisher/Subscriber）与现代 `AsyncSequence` / `AsyncStream` 异步流。
- **[Swift 应用架构与工程实战](./2-frameworks/5-app-architecture.md)**：MVVM 范式与现代单向数据流架构 TCA (The Composable Architecture) 落地解析。
