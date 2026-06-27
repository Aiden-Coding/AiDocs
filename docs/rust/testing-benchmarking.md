---
title: Rust 测试与性能分析
hide_title: true
sidebar_label: 测试与性能分析
---

## Rust 测试与性能分析

在现代软件工程中，测试和性能基准是保障系统级应用健壮与高效的防线。Rust 将测试作为一等公民内置于工具链中，提供了开箱即用的单元测试、集成测试和文档测试支持，并通过成熟的第三方生态（如 `criterion`）为高精度基准测试提供了标准路径。

---

## 单元测试与集成测试架构

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
- **编译机制**：`tests/` 目录下的每个 `.rs` 文件都会被编译成一个**独立的 crate**。这意味着集成测试无法访问被测试模块的私有成员，只能通过公开 API 进行调用（需要 `use my_crate;`）。
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

## 断言与测试工具链

除了标准断言宏外，利用更丰富的断言库和框架可以极大地提升测试效率和报错可读性。

### 1. 标准断言宏

- `assert!(expr)`：期望表达式求值为 `true`，否则触发 panic。
- `assert_eq!(left, right)`：期望左右两值相等，失败时会打印具体的值。要求对比的类型实现了 `Debug` 和 `PartialEq` 特征。
- `assert_ne!(left, right)`：期望左右两值不等。

### 2. 工业级断言强化：pretty_assertions

当在大型数据结构或嵌套结构体上使用 `assert_eq!` 失败时，默认的输出极其难以阅读。`pretty_assertions` 库提供了类似于 `git diff` 格式的彩色输出。

- **使用方法**：在 `Cargo.toml` 的 `[dev-dependencies]` 中加入 `pretty_assertions = "1.4"`，并在测试模块中覆写该宏。

```rust
#[cfg(test)]
mod tests {
    // 遮蔽标准库的 assert_eq! 宏
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
        assert_eq!(user1, user2); // 此时控制台会输出清晰的彩色差异对比
    }
}
```

---

## 文档测试 (Doc-tests)

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

## 基准测试与性能调优

在系统级编程中，量化性能提升至关重要。Rust 提供了高精度基准测试工具链来排除垃圾回收、热点抖动和 CPU 调频等噪点干扰。

### 1. 原生基准测试的局限

Rust 标准库内置了 `#[bench]` 属性（即 `test::Bencher`），但它有两个致命局限：
- 只能在 `nightly` 编译器下使用。
- 统计功能较为薄弱，容易受冷启动和环境抖动影响。

### 2. 行业标准：Criterion 库

`criterion` 是目前 Rust 社区最通用、功能最强大的基准测试库。它可在 `stable` 渠道上使用，并使用自适应采样与自助法（Bootstrapping）统计学算法，能生成极其精确的性能报告和 HTML 可视化图表。

#### 1) 配置 Cargo.toml

在项目中启用 `criterion`，需要在 `Cargo.toml` 中声明基准测试入口，并禁用默认的测试 Harness。

```toml
[dev-dependencies]
criterion = { version = "0.5", features = ["html_reports"] }

[[bench]]
name = "my_benchmark"
harness = false
```

#### 2) 编写基准测试用例

在 `benches/my_benchmark.rs` 中编写测试代码：

```rust
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn fibonacci(n: u64) -> u64 {
    match n {
        0 => 0,
        1 => 1,
        n => fibonacci(n - 1) + fibonacci(n - 2),
    }
}

fn bench_fib(c: &mut Criterion) {
    // 建立一个名为 "fibonacci" 的基准测试组
    c.bench_function("fibonacci_20", |b| {
        // 使用 black_box 防止编译器因过度优化（如常量折叠）直接消除函数调用
        b.iter(|| fibonacci(black_box(20)))
    });
}

// 宏定义组合与主入口
criterion_group!(benches, bench_fib);
criterion_main!(benches);
```

#### 3) 运行并分析

执行以下命令开始基准分析：

```bash
cargo bench
```

- **输出与图表**：`criterion` 会在终端打印出运行时间的均值、中位数和置信区间。同时，会在项目根目录下的 `target/criterion/report/index.html` 生成精美的图形报表（如 PDF 分布图 and 回归趋势线），方便对比重构前后的性能表现。
