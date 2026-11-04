---
title: "附录 E：版本（Editions）"
sidebar_position: 101
---

Rust 以「版本」（*Edition*）机制来引入无法向后兼容的语言变更，同时保证旧代码仍可在新编译器上正常编译。

## Rust Edition 机制

Rust 遵循**六周发布周期**，每隔约 2—3 年推出一个新 Edition。Edition 以 `Cargo.toml` 中的字段声明：

```toml
[package]
name = "my-crate"
edition = "2021"
```

**关键承诺**：

- 旧 Edition 的 crate 与新 Edition 的 crate 可以**相互依赖**，链接时完全兼容。
- 编译器永远支持所有历史 Edition，不会强制迁移。
- `cargo fix --edition` 可自动完成绝大部分迁移工作。

## Rust 2015

2015 Edition 是 Rust 1.0 发布时的初始版本。

**特征**：

- 必须用 `extern crate` 显式声明外部依赖：

```rust
extern crate serde;
use serde::Serialize;
```

- 模块路径解析规则较为复杂，`use` 路径和普通路径行为不一致。

## Rust 2018

2018 Edition 是第一次重大改版，着重改善模块系统与人体工程学。

**主要变更**：

**`extern crate` 不再必须**：依赖在 `Cargo.toml` 中声明后即可直接 `use`：

```rust
// 2018+ 无需 extern crate
use serde::Serialize;
```

**`dyn Trait` 语法统一**：显式区分动态分发与泛型静态分发：

```rust
fn draw(shape: &dyn Shape) { /* 动态分发 */ }
fn draw_static<T: Shape>(shape: &T) { /* 静态分发 */ }
```

**路径清晰化**：`use` 路径现在与其他路径保持一致，支持 `crate::`、`super::`、`self::` 前缀。

**NLL（Non-Lexical Lifetimes）默认开启**：借用检查器更精确，减少误报。

**`?` 运算符在 `main()` 中可用**：

```rust
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let content = std::fs::read_to_string("file.txt")?;
    println!("{content}");
    Ok(())
}
```

**async/await 预备**：async/await 语法在 Rust 1.39（2019 年）于 2018 Edition 下稳定。

## Rust 2021

2021 Edition 在 Rust 1.56 稳定，重点优化闭包捕获语义与迭代器行为。

```toml
edition = "2021"
```

### 闭包捕获精化

2018 Edition 中，闭包会捕获整个结构体；2021 Edition 只捕获**实际用到的字段**（Disjoint Capture in Closures）：

```rust
struct Config {
    name: String,
    timeout: u32,
}

let cfg = Config {
    name: String::from("server"),
    timeout: 30,
};

// 2021：只捕获 cfg.timeout，cfg.name 仍可在外部使用
let check = move || cfg.timeout > 0;
println!("{}", cfg.name); // 2018 中此行会报错，2021 中合法
```

### 数组的 IntoIterator

2021 Edition 前，对数组调用 `.into_iter()` 返回引用迭代器；2021 Edition 后**按值**迭代：

```rust
// 2021+：x 类型为 i32，而非 &i32
for x in [1, 2, 3] {
    println!("{x}");
}

// 显式按值消费
let sum: i32 = [1, 2, 3].into_iter().sum();
```

### Prelude 新增

2021 Edition 的默认 prelude 新增了以下 trait，无需手动 `use`：

- `std::convert::TryFrom` / `TryInto`
- `std::iter::FromIterator`

```rust
// 2021+ 无需 use std::convert::TryFrom
let n: i32 = i32::try_from(100u64).unwrap();
```

### `panic!` 格式字符串统一

2021 Edition 对 `panic!` 格式字符串的处理与 `println!` 保持一致：

```rust
let msg = "磁盘已满";

// 2021+：直接使用变量
panic!("{msg}");

// 等价于旧写法
panic!("{}", msg);
```

### 或模式在 `pat` 中稳定

2021 Edition 的宏 `pat` 片段支持或模式（*or-patterns*）：

```rust
match code {
    Some(1 | 2 | 3) => println!("小数字"),
    Some(x) => println!("其他：{x}"),
    None => println!("无值"),
}
```

### 迁移到 2021

```bash
# 自动修复代码
cargo fix --edition

# 然后手动修改 Cargo.toml
# edition = "2021"

# 验证编译
cargo build
```

## Rust 2024

2024 Edition 在 Rust 1.85（2025 年 2 月）稳定，着重改善 unsafe 表达力、异步语义和语言一致性。

```toml
edition = "2024"
```

### `gen` 块

`gen` 块提供惰性生成器语法，无需手动实现 `Iterator`：

```rust
// 生成斐波那契数列
let fib = gen {
    let (mut a, mut b) = (0u64, 1u64);
    loop {
        yield a;
        (a, b) = (b, a + b);
    }
};

for n in fib.take(10) {
    print!("{n} ");
}
```

### let chains 稳定

链式 `if let` 判断（Rust 1.88 稳定），彻底消除嵌套地狱：

```rust
// 旧写法：三层嵌套
if let Some(user) = get_user() {
    if let Some(email) = user.email() {
        if email.ends_with("@corp.com") {
            send_notification(email);
        }
    }
}

// let chains 新写法：
if let Some(user) = get_user()
    && let Some(email) = user.email()
    && email.ends_with("@corp.com")
{
    send_notification(email);
}
```

### `unsafe extern` 块

2024 Edition 要求 `extern` 块必须显式标记 `unsafe`，明确表达 FFI 的不安全性：

```rust
// 2024：必须加 unsafe
unsafe extern "C" {
    fn printf(fmt: *const u8, ...) -> i32;
    fn strlen(s: *const u8) -> usize;
}
```

### `unsafe` 属性

部分之前隐式 unsafe 的属性，现在必须显式标注：

```rust
// 2024：no_mangle 需要 unsafe 前缀
#[unsafe(no_mangle)]
pub extern "C" fn my_callback() {}

// link_section 同理
#[unsafe(link_section = ".init_array")]
static INIT: extern "C" fn() = init;
```

### `impl Trait` 精化规则

`async fn` 在 trait 中的返回类型现在支持声明 `Send` 约束，无需依赖第三方 crate：

```rust
trait Fetcher {
    // 返回类型自动具备 Send
    async fn fetch(&self, url: &str) -> Result<String, Error>;
}
```

### Cargo 与工具链改进

2024 Edition 对应的工具链引入 `[lints]` 表格，统一管理 lint 配置：

```toml
[lints.rust]
unsafe_code = "forbid"

[lints.clippy]
unwrap_used = "warn"
pedantic = "warn"
```

### 迁移到 2024

```bash
# 自动修复代码（需 Rust 1.85+）
cargo fix --edition

# 手动修改 Cargo.toml
# edition = "2024"

# 完整检查
cargo clippy
cargo test
```

## 版本选择建议

| 场景 | 推荐版本 | 原因 |
|---|---|---|
| 新项目 | 2024 | 最新特性，`cargo new` 默认 |
| 维护中项目 | 2021 | 稳定成熟，生态支持完善 |
| 嵌入式 / no\_std | 2021 或 2024 | 均支持，视依赖库情况选择 |
| 旧代码库 | 视依赖情况 | 用 `cargo fix` 渐进迁移 |

> **提示**：在同一 Cargo 工作区中，不同成员可以使用不同的 Edition。迁移时可以逐 crate 升级，无需一次性全部完成。
