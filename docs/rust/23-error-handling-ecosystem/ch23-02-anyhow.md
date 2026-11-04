---
title: "anyhow：应用级错误传播"
sidebar_position: 108
---

# anyhow：应用级错误传播

在编写命令行工具、Web 服务器主程序等可执行文件时，错误处理的核心诉求往往不是"区分每种错误并分别处理"，而是"让错误快速传播，并在最终输出时提供清晰的上下文"。`anyhow` 正是为这种场景设计的。

## 核心思想

`anyhow::Error` 是一个**类型擦除的动态错误容器**，它能装载任何实现了 `std::error::Error` 的类型，使得不同来源的错误可以统一用 `?` 传播，无需手动编写 `From` 实现或定义聚合错误枚举。

```toml
[dependencies]
anyhow = "1"
```

## 基础用法

```rust
use anyhow::{Context, Result};

fn main() -> Result<()> {
    let content = std::fs::read_to_string("config.toml")
        .context("无法读取配置文件 config.toml")?;

    let config: Config = toml::from_str(&content)
        .context("配置文件格式错误")?;

    run(config)?;
    Ok(())
}

struct Config;
fn run(_: Config) -> Result<()> { Ok(()) }
```

`Result<()>` 在此处是 `anyhow::Result<()>` 的缩写，等价于 `std::result::Result<(), anyhow::Error>`。`main` 函数返回 `anyhow::Result<()>` 时，若出错，Rust 运行时会自动打印错误链并以非零退出码退出。

## `.context()` 添加错误上下文

`.context()` 是 `anyhow` 最重要的方法，它包裹原始错误并附加描述性消息：

```rust
use anyhow::{Context, Result};

fn load_user(id: u64) -> Result<User> {
    let path = format!("users/{id}.json");
    let content = std::fs::read_to_string(&path)
        .with_context(|| format!("无法读取用户文件：{path}"))?;
    // with_context 接受闭包，仅在出错时才执行字符串格式化（惰性求值）

    serde_json::from_str(&content)
        .context("用户文件 JSON 格式错误")?;

    todo!()
}

struct User;
```

错误展示时会形成层级链：

```
无法读取用户文件：users/42.json
  原因：No such file or directory (os error 2)
```

## `anyhow!` 宏：创建临时错误

当你需要创建一个不对应任何现有错误类型的错误时，使用 `anyhow!` 宏：

```rust
use anyhow::{anyhow, Result};

fn validate_age(age: i32) -> Result<()> {
    if age < 0 {
        return Err(anyhow!("年龄不能为负数：{age}"));
    }
    if age > 150 {
        return Err(anyhow!("年龄 {age} 超出合理范围"));
    }
    Ok(())
}
```

## `bail!` 宏：提前返回错误

`bail!` 是 `return Err(anyhow!(...))` 的语法糖，让代码更简洁：

```rust
use anyhow::{bail, Result};

struct User {
    name: String,
    is_admin: bool,
}

fn delete_all_records(user: &User) -> Result<()> {
    if !user.is_admin {
        bail!("权限不足：用户 {} 不是管理员", user.name);
    }
    // 执行删除操作...
    Ok(())
}
```

## `ensure!` 宏：前置条件断言

`ensure!` 是 `if !condition { bail!(...) }` 的简写：

```rust
use anyhow::{ensure, Result};

fn divide(a: f64, b: f64) -> Result<f64> {
    ensure!(b != 0.0, "除数不能为零");
    Ok(a / b)
}
```

## 展示完整错误链

`anyhow::Error` 保留了完整的错误链，可通过 `.chain()` 迭代器遍历：

```rust
fn report_error(err: &anyhow::Error) {
    eprintln!("错误：{err}");
    for (i, cause) in err.chain().skip(1).enumerate() {
        eprintln!("  原因 {}: {cause}", i + 1);
    }
}
```

也可使用 `{err:#}` 格式说明符输出带换行的完整错误链（`Debug` 格式下）：

```rust
eprintln!("{err:#}");
```

## 将 `anyhow::Error` 降级为具体类型

在极少数需要检查具体错误类型的情况下，可使用 `downcast_ref`：

```rust
use anyhow::Result;

fn handle_error(err: &anyhow::Error) {
    if let Some(io_err) = err.downcast_ref::<std::io::Error>() {
        match io_err.kind() {
            std::io::ErrorKind::NotFound => eprintln!("文件不存在"),
            std::io::ErrorKind::PermissionDenied => eprintln!("权限不足"),
            _ => eprintln!("IO 错误：{io_err}"),
        }
    } else {
        eprintln!("未知错误：{err}");
    }
}
```

## `anyhow` 与 `thiserror` 混用

在实际项目中，两个库经常配合使用：

```rust
// 底层库：用 thiserror 定义具体错误
// crate: my_db_lib
use thiserror::Error;

#[derive(Debug, Error)]
pub enum DbError {
    #[error("连接超时")]
    Timeout,
    #[error("查询失败：{0}")]
    QueryFailed(String),
}

// 应用层：用 anyhow 聚合并传播
use anyhow::{Context, Result};

async fn handle_request(user_id: u64) -> Result<String> {
    // DbError 实现了 std::error::Error，? 可自动转为 anyhow::Error
    let user = fetch_user(user_id)
        .await
        .with_context(|| format!("获取用户 {user_id} 失败"))?;

    Ok(format!("你好，{}", user.name))
}

async fn fetch_user(id: u64) -> Result<User, DbError> {
    if id == 0 {
        return Err(DbError::Timeout);
    }
    Ok(User { name: "Alice".to_string() })
}

struct User { name: String }
```

## 常见坑与注意事项

**坑 1：库 crate 中不要使用 `anyhow`**

`anyhow::Error` 是类型擦除的，调用方无法通过模式匹配区分错误类型，这破坏了库的错误处理契约。库应使用 `thiserror` 定义具体类型。

**坑 2：`.context()` vs `.map_err()`**

```rust
// 推荐：anyhow 的 context，自动保留原始错误链
let val = some_result.context("操作失败")?;

// 不推荐：丢失原始错误
let val = some_result.map_err(|_| anyhow!("操作失败"))?;
```

**坑 3：`with_context` 的惰性求值**

当上下文消息构建开销较大（如涉及格式化或克隆）时，使用 `with_context(|| ...)` 而非 `context(...)`，前者只在出错时才执行闭包。
