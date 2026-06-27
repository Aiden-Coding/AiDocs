---
title: Rust 错误处理与防御性编程
hide_title: true
sidebar_label: 错误处理艺术
---

## Rust 错误处理与防御性编程

Rust 的核心哲学逻辑之一是：**错误不是意外，而是程序逻辑的一部分**。Rust 彻底废弃了传统的异常（Exception）捕获机制，转而采用类型系统显式化处理结果。

---

## 可恢复错误：Result 与传播

`Result<T, E>` 是一种代数数据类型（Sum Type），它强迫开发者在编译期考虑失败路径。

### 1. 解构的艺术

- **模式匹配**：这是处理 `Result` 最彻底的方式，能保证 100% 的分支覆盖。
- **问号操作符 `?`**：语法糖，用于将错误向上冒泡传播。它背后通过 `From` 特征自动进行错误类型的类型转换。

```rust
fn read_config() -> Result<String, std::io::Error> {
    // 如果 File::open 失败，错误会被自动转换并返回
    let mut f = std::fs::File::open("config.toml")?;
    let mut s = String::new();
    std::io::Read::read_to_string(&mut f, &mut s)?;
    Ok(s)
}
```

### 2. 组合算子 (Combinators)

为了避免深度嵌套的 `match` 语句，可以利用 `Option` 和 `Result` 提供的链式算子：

- `map` / `map_err`：仅在成功/失败时转换内部值，保持容器状态不变。
- `and_then`：类似于 `FlatMap`，用于链接多个可能产生错误的转换。
- `unwrap_or_else`：失败时执行一个闭包提供默认值，比 `unwrap_or` 更适合高开销的默认值计算。

```rust
fn parse_and_double(s: &str) -> Result<i32, String> {
    s.parse::<i32>()
        .map_err(|e| format!("Parse error: {}", e))
        .and_then(|n| {
            if n < 0 {
                Err("Negative numbers not allowed".to_string())
            } else {
                Ok(n * 2)
            }
        })
}
```

---

## 自定义错误类型与多层级 Result

在大型 crate 中，通常会为整个模块定义一个统一的顶层错误枚举。通过为该枚举的每个变体实现 `From` 特征，可以让 `?` 操作符自动将底层错误转换为顶层错误，实现优雅的错误层级传播。

### 1. 自定义错误枚举

```rust
use std::fmt;
use std::io;
use std::num::ParseIntError;

#[derive(Debug)]
pub enum AppError {
    Io(io::Error),
    Parse(ParseIntError),
    Custom(String),
}

// 实现 Display 以提供人类可读的描述
impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::Io(e) => write!(f, "IO error: {}", e),
            AppError::Parse(e) => write!(f, "Parse error: {}", e),
            AppError::Custom(msg) => write!(f, "App error: {}", msg),
        }
    }
}

// 实现 std::error::Error 以接入标准错误链体系
impl std::error::Error for AppError {
    // source() 返回导致此错误的底层根因错误
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            AppError::Io(e) => Some(e),
            AppError::Parse(e) => Some(e),
            AppError::Custom(_) => None,
        }
    }
}

// 为 io::Error 实现 From，让 ? 操作符自动转换
impl From<io::Error> for AppError {
    fn from(e: io::Error) -> Self {
        AppError::Io(e)
    }
}

impl From<ParseIntError> for AppError {
    fn from(e: ParseIntError) -> Self {
        AppError::Parse(e)
    }
}
```

### 2. Result 别名简化

在大型 crate 中，通常会定义一个模块级的 `Result` 类型别名，以减少重复书写错误类型的负担。

```rust
// 定义模块级别名，将 E 固定为我们的 AppError
pub type Result<T> = std::result::Result<T, AppError>;

// 现在所有的函数签名可以简化为 Result<T>
fn load_and_parse(path: &str) -> Result<i32> {
    let content = std::fs::read_to_string(path)?; // io::Error 自动转换为 AppError::Io
    let num = content.trim().parse::<i32>()?;      // ParseIntError 自动转换为 AppError::Parse
    Ok(num)
}
```

---

## 不可恢复错误：Panic 与栈展开

当程序遇到无法恢复的逻辑破坏（如数组越权、显式的断言失败）时，会触发 `panic!`。

### 1. 展开 (Unwinding) vs 中止 (Abort)

- **Unwinding（默认）**：Rust 会沿着调用栈逆向清理（Drop）每个函数帧中的局部变量，保障内存安全。
- **Abort**：直接由操作系统终止进程。通常在嵌入式环境或对二进制体积极其敏感的场景（通过 `Cargo.toml` 配置）中使用。

### 2. Panic 边界防护：`catch_unwind`

在 FFI 边界或跨越线程分发时，我们必须防止 panic 穿越边界导致整个进程崩溃（在 FFI 边界触发 panic 是 UB）。`std::panic::catch_unwind` 可以将 panic 转换为 `Result`，是构建健壮中间件的必备工具。

```rust
use std::panic;

fn safe_divide(a: i32, b: i32) -> Result<i32, String> {
    // 用 catch_unwind 包裹可能 panic 的代码
    panic::catch_unwind(|| {
        if b == 0 {
            panic!("Division by zero!");
        }
        a / b
    })
    .map_err(|e| {
        // 将 panic 的载体（Any）转换为可读的字符串
        if let Some(msg) = e.downcast_ref::<&str>() {
            msg.to_string()
        } else {
            "Unknown panic".to_string()
        }
    })
}

fn main() {
    println!("{:?}", safe_divide(10, 2));  // Ok(5)
    println!("{:?}", safe_divide(10, 0));  // Err("Division by zero!")
}
```

---

## 工业级错误治理：anyhow 与 thiserror

在实际项目中，我们通常遵循以下选型准则：

| 场景 | 推荐方案 | 核心理由 |
| :--- | :--- | :--- |
| **库开发 (Library)** | `thiserror` | 能够生成精细的自定义错误枚举，方便下游调用者进行 match 处理。 |
| **应用开发 (Application)** | `anyhow` | 采用语义化的错误擦除（Dynamic Error Holding），支持 `Context` 链式回溯。 |

### 1. thiserror：为库生成精细错误枚举

`thiserror` 通过派生宏自动生成 `std::error::Error`、`Display` 和 `From` 的样板代码：

```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum DatabaseError {
    #[error("Connection refused: {host}:{port}")]
    ConnectionRefused { host: String, port: u16 },

    #[error("Query failed: {0}")]
    QueryFailed(String),

    #[error("IO error")]
    Io(#[from] std::io::Error), // #[from] 自动生成 From<io::Error> 实现
}
```

### 2. anyhow：为应用提供零样板错误处理

```rust
use anyhow::{Context, Result};

fn run_app() -> Result<()> {
    let _ = std::fs::read_to_string("app.json")
        .with_context(|| "Failed to load application manifest")?;
    Ok(())
}
```

> [!TIP]
> **错误链回溯**：`anyhow` 的 `Context` 通过 `std::error::Error::source()` 将错误串联成链。可以通过 `RUST_BACKTRACE=1` 环境变量或 `anyhow` 的 `{:#}` 格式化输出完整的错误链路，极大方便生产环境定位故障根因。
