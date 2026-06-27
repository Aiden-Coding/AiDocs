---
title: Rust 现代系统级编程体系
hide_title: true
sidebar_label: 介绍 & 路线图
sidebar_position: 0
slug: /rust/
---

## Rust 现代系统级编程体系

欢迎来到 Rust 的世界。本专题旨在帮助开发者从内存安全、零成本抽象及无畏并发三个维度，构建对高性能系统级编程的深度认知。

---

## 🗺️ Rust 学习路线图

```mermaid
mindmap
  root((Rust 专家之路))
    所有权基石
      内存管理模型
      所有权与借用检查
      生命周期标注
    泛型与抽象
      Trait 接口定义
      关联类型与泛型参数
      静态/动态分发
      函数式特性
      迭代器与闭包
    高级并发
      多线程同步
      Tokio 异步运行时
      Future 状态机
    系统底座
      Unsafe Rust 与 FFI
      声明宏与过程宏
      元编程
    健壮性
      Result/Option 错误处理
      自定义错误枚举
      单元测试与集成测试
      Criterion 基准测试
```

---

## 🚀 第一阶段：所有权与内存安全 (Memory Safety)

理解 Rust 区别于其他语言的核心竞争力。

- [所有权与生命周期核心](ownership-lifetimes.md)：深入生命周期借用检查器与 `'static`。
- [内存管理深度解析](memory-management.md)：堆栈分配、`Box<T>`、`Arc<T>` 与引用计数。

---

## 🏗️ 第二阶段：类型系统与抽象 (Abstraction)

- [Trait 与泛型系统](traits-generics.md)：解耦合与静态/动态分发（Dynamic Dispatch）、关联类型、超类特征与扩展特征模式。
- [函数式编程特性](functional-rust.md)：闭包、迭代器高级组合链、`move` 逃逸闭包与模式匹配新语法。

---

## ⚡ 第三阶段：无畏并发与异步编程 (Concurrency)

- [Rust 并发编程与 Tokio](concurrency.md)：多线程消息传递与 `async/await` 异步生态。

---

## 🛠️ 第四阶段：生产级健壮性 (Robustness)

- [错误处理艺术](error-handling.md)：`Result` 链式调用、自定义错误类型、`thiserror` / `anyhow` 工业级方案与 Panic 边界防护。
- [测试与性能分析](testing-benchmarking.md)：单元/集成/文档测试架构、`pretty_assertions` 强化断言与 `criterion` 高精度基准测试。

---

## ⚙️ 第五阶段：系统底座与高级特性 (Advanced Systems)

- [Unsafe Rust 与内存安全边界](unsafe-rust.md)：裸指针与未定义行为、安全抽象封装、FFI 跨语言交互与 Miri 检测工具。
- [宏与元编程系统](macros-metaprogramming.md)：声明宏 `macro_rules!` 深度解析、过程宏开发（Derive 宏/属性宏）与 `syn`/`quote` 工具链实战。
