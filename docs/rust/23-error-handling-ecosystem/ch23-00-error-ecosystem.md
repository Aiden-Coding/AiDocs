---
title: "工程化错误处理生态"
sidebar_position: 106
---

# 工程化错误处理生态

在第九章中，我们学习了 Rust 错误处理的基础：`Result<T, E>` 类型与 `?` 运算符。对于简单程序而言，这套工具已经足够。然而，当项目规模增长、错误来源趋于多样时，仅靠标准库提供的机制往往力不从心。

## 回顾基础

Rust 的错误处理围绕 `Result<T, E>` 展开：

```rust
fn read_number(s: &str) -> Result<i32, std::num::ParseIntError> {
    let n = s.trim().parse::<i32>()?;
    Ok(n)
}
```

`?` 运算符在遇到 `Err` 时提前返回，同时可通过 `From` trait 自动转换错误类型。这套机制简洁而强大，但在工程实践中会遇到以下挑战。

## 实际项目中的挑战

**多种错误类型合并**

真实项目中一个函数往往调用多个库，每个库都有自己的错误类型：

```rust
// 编译失败：? 无法将不同错误类型统一为同一个 E
fn load_config(path: &str) -> Result<Config, ???> {
    let content = std::fs::read_to_string(path)?;  // std::io::Error
    let config = toml::from_str(&content)?;        // toml::de::Error
    Ok(config)
}
```

**错误上下文丢失**

原始错误信息（如 `No such file or directory`）缺乏上下文，让用户难以定位问题。

**库与应用的不同需求**

- **库**（lib crate）：错误类型必须清晰、稳定，调用方需要能够枚举并处理每种错误
- **应用**（binary crate）：通常只需要错误快速传播并最终展示给用户，不需要调用方区分细节

## 两大工具：thiserror 与 anyhow

Rust 生态中有两个互补的库，分别针对上述两种场景：

| 工具 | 定位 | 适用场景 |
|---|---|---|
| `thiserror` | 编译期代码生成，零运行时开销 | **库 crate**：定义清晰、具体的错误类型 |
| `anyhow` | 类型擦除的动态错误容器 | **应用 crate**：快速传播、附加上下文 |

这两个库并不互斥，许多项目会同时使用：在底层库中用 `thiserror` 定义领域错误，在应用层用 `anyhow` 聚合并传播。

## 选择指南

**使用 `thiserror` 的场景**：

- 编写供他人使用的库
- 调用方需要 `match` 错误、执行不同的恢复逻辑
- 需要稳定的错误 API（错误类型变化视为破坏性更新）

**使用 `anyhow` 的场景**：

- 编写命令行工具、服务器主程序等可执行文件
- 错误只需记录日志或展示给用户，无需精细处理
- 希望用最少的代码快速实现错误传播

## 本章路线图

- [thiserror：库级错误类型定义](ch23-01-thiserror.md)——`#[derive(Error)]`、`#[from]`、`#[source]` 详解
- [anyhow：应用级错误传播](ch23-02-anyhow.md)——`Context`、`bail!`、`anyhow!`、错误链
- [错误处理模式与最佳实践](ch23-03-error-patterns.md)——选型决策、架构分层、常见坑
