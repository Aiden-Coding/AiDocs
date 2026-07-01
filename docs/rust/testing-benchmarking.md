---
title: Rust 测试与性能分析
hide_title: true
sidebar_label: 测试与性能分析
---

## Rust 测试与性能分析

在现代软件工程中，测试和性能基准是保障系统级应用健壮与高效的底线。Rust 将测试作为一等公民内置于工具链中，提供了开箱即用的单元测试、集成测试和文档测试支持，并通过成熟的第三方生态（如 `criterion`）为高精度基准测试提供了标准路径。

> 🟢 **基础**：掌握基本语法即可阅读 ｜ 🟡 **进阶**：需要有一定 Rust 开发经验 ｜ 🔴 **高级**：面向系统级开发者与性能工程师

---

## 🟢 单元测试与集成测试架构

Rust 区分了两种主要测试类型：单元测试（Unit Tests）和集成测试（Integration Tests）。它们的编译机制和设计目标各有侧重。

### 1. 单元测试 (Unit Tests)

单元测试主要关注模块内部逻辑的正确性，通常被定义在与被测试代码相同的源文件中，甚至可以测试被声明为 `pub(crate)` 或私有的函数和结构体。

- **`#[cfg(test)]` 模块**：通过该条件编译属性，测试模块仅在执行 `cargo test` 时才会被编译，从而避免打包到最终的生产二进制文件中。
- **`#[test]` 属性**：标记具体的测试入口函数。
- **并行与串行执行**：默认情况下，`cargo test` 会以多线程并发运行所有测试。如果测试之间共享某些全局资源（如环境变量或文件句柄），应使用 `cargo test -- --test-threads=1` 强制串行执行。

```rust
// src/lib.rs

pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_add() {
        assert_eq!(add(2, 2), 4);
    }
}
```

### 2. 集成测试 (Integration Tests)

集成测试专门用于验证库（library）的多个部分是否能够协同工作，或者被外部调用者如何正确使用。

- **目录结构**：集成测试文件必须放置在项目根目录下的 `tests/` 文件夹中。
- **编译机制**：`tests/` 目录下的每个 `.rs` 文件都会被编译成一个**独立的 crate**。这意味着集成测试无法访问被测试模块的私有成员，只能通过公开 API 进行调用。
- **共享辅助函数**：若多个集成测试文件需要共享测试数据或辅助逻辑，可将其放入 `tests/common/mod.rs` 中。Rust 会识别 `common` 目录并避免将其单独编译为测试套件。

```rust
// tests/integration_test.rs

use my_crate;

mod common;

#[test]
fn test_external_behavior() {
    common::setup();
    assert_eq!(my_crate::add(2, 3), 5);
}
```

---

## 🟢 断言与测试工具链

### 1. 标准断言宏

- `assert!(expr)`：期望表达式求值为 `true`，否则触发 panic。
- `assert_eq!(left, right)`：期望左右两值相等。要求对比的类型实现了 `Debug` 和 `PartialEq` 特征。
- `assert_ne!(left, right)`：期望左右两值不等。

### 2. 开发依赖 (`[dev-dependencies]`)

开发依赖允许我们在写测试、基准测试或文档示例时引入外部库，但在编译生产包时并不会打包这些库。

例如，要在测试中使用高颜值彩色差异对比库 `pretty_assertions`，我们在 `Cargo.toml` 中配置：

```toml
[dev-dependencies]
pretty_assertions = "1.4"
```

在我们的测试代码中覆写断言宏：

```rust
#[cfg(test)]
mod tests {
    // 遮蔽标准库的 assert_eq! 宏以提供漂亮的彩色 Diff 输出
    use pretty_assertions::assert_eq;

    #[derive(Debug, PartialEq)]
    struct User {
        name: String,
        age: u32,
    }

    #[test]
    fn test_user() {
        let user1 = User { name: "Alice".to_string(), age: 30 };
        let user2 = User { name: "Bob".to_string(), age: 30 };
        assert_eq!(user1, user2); // 此时控制台会输出清晰的差异对比
    }
}
```

---

## 🟡 文档测试 (Doc-tests)

Rust 首创了将文档与测试合二为一的“文档测试”机制。它能确保你写在 API 文档里的示例代码永远不会因为 API 重构而过时。

- **工作原理**：当运行 `cargo test` 时，编译器会自动提取公有类型/函数上方由三斜杠 `///` 标识的 Markdown 块，并尝试编译和运行其中的 ```rust 示例。
- **隐藏行语法**：为了保证展示文档的简洁性，可以使用 `#` 在文档中隐藏某些初始化代码（如 `use` 导入），但在编译和测试时这些代码依然会被运行。

```rust
/// 计算两个数字的乘积。
///
/// # Examples
///
/// ```
/// # use my_crate::multiply;
/// let result = multiply(2, 3);
/// assert_eq!(result, 6);
/// ```
pub fn multiply(a: i32, b: i32) -> i32 {
    a * b
}
```

---

## 🟡 测试进阶技巧

### 1. 忽略特定测试

对于耗时长的测试，可以使用 `#[ignore]` 属性跳过。运行被忽略的测试使用：`cargo test -- --ignored`。

```rust
#[test]
#[ignore = "耗时过长，仅在 CI 中运行"]
fn test_complex_algorithm() {
    // 耗时测试逻辑
}
```

### 2. 恐慌测试 (Should Panic)

可以使用 `#[should_panic]` 验证某些操作是否会触发预期内的 Panic。建议使用 `expected` 参数指定具体的匹配错误信息：

```rust
#[test]
#[should_panic(expected = "attempt to divide by zero")]
fn test_divide_by_zero() {
    let _ = 10 / 0;
}
```

---

## 🔴 高精度基准测试 (Benchmarking)

在系统级编程中，量化性能提升至关重要。标准库自带的基准测试 (`#[bench]`) 仍处于不稳定状态（需 Nightly 编译器）。因此，工业界通用标准是采用 **Criterion.rs**。

`criterion` 运行在 Stable 编译器上，能基于多次抽样生成统计学上的置信区间，并能把本次结果与历史数据作比较以检测性能退化。

### 1. 配置 Criterion

在 `Cargo.toml` 中配置 `[dev-dependencies]` 并声明自定义基准套件：

```toml
[dev-dependencies]
criterion = { version = "0.5", features = ["html_reports"] }

[[bench]]
name = "my_benchmark"
harness = false # 禁用标准基准测试隔离
```

### 2. 编写基准测试

在项目根目录下新建 `benches/my_benchmark.rs`：

```rust
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn fibonacci(n: u64) -> u64 {
    match n {
        0 => 0,
        1 => 1,
        n => fibonacci(n - 1) + fibonacci(n - 2),
    }
}

fn criterion_benchmark(c: &mut Criterion) {
    // 避免编译器对 benchmark 进行常量折叠和死代码消除优化，需使用 black_box
    c.bench_function("fibonacci_20", |b| b.iter(|| fibonacci(black_box(20))));
}

// 注册 benchmark 分组并生成运行入口
criterion_group!(benches, criterion_benchmark);
criterion_main!(benches);
```

运行基准分析命令：

```bash
cargo bench
```

生成的精美 HTML 性能对比报告位于 `target/criterion/report/index.html`。

---

## 🔴 高级性能分析 (Profiling Tools)

基准测试告诉你“代码跑多快”，而 Profiling 才能指出“为什么慢”。

### 1. Flamegraph (火焰图)

火焰图能够直观呈现函数调用的耗时占比。

- **安装**：`cargo install cargo-flamegraph`
- **使用**：`cargo flamegraph --bin my_app`
- **分析**：宽度代表占用 CPU 的时长比例，寻找异常宽阔的调用栈底部，即是潜在的性能瓶颈。

### 2. Valgrind 与 Cachegrind

在底层开发中，缓存命中率直接决定性能瓶颈。配合 Cachegrind 以及 Rust 属性如 `#[inline]` 调整，可以在微秒级别压榨系统吞吐极限。
