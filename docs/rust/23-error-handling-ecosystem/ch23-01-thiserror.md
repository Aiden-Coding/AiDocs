---
title: "thiserror：库级错误类型定义"
sidebar_position: 107
---

# thiserror：库级错误类型定义

当你在编写一个供他人使用的库时，错误类型的设计至关重要。调用方需要能够枚举所有可能的错误、编写 `match` 语句进行不同的恢复操作，这要求错误类型清晰、具体且稳定。`thiserror` 正是为此而生的。

## 场景说明

假设你正在编写一个数据库访问库，需要定义清晰的错误类型供上层调用：

```toml
[dependencies]
thiserror = "2"
```

`thiserror` 是一个纯编译期工具——它通过过程宏展开为标准的 `std::error::Error` 实现，**运行时零开销**。

## 基础用法

```rust
use thiserror::Error;

#[derive(Debug, Error)]
pub enum DatabaseError {
    #[error("连接失败：{0}")]
    ConnectionFailed(String),

    #[error("查询错误：{source}")]
    QueryError {
        #[from]
        source: sqlx::Error,
    },

    #[error("记录未找到：id={id}")]
    NotFound { id: u64 },

    #[error("数据库已满")]
    Full,
}
```

`#[derive(Error)]` 自动实现 `std::error::Error` trait，`#[error("...")]` 属性定义 `Display` 格式。格式字符串中可引用变体字段：

- `{0}` 引用元组变体的第一个字段
- `{source}`、`{id}` 等引用具名字段

## `#[from]`：自动实现 `From`

`#[from]` 是 `thiserror` 最实用的功能之一，它为标注的字段自动生成 `From` trait 实现，使 `?` 运算符能够自动转换错误类型：

```rust
// 有了 #[from]，? 运算符自动将 sqlx::Error 转为 DatabaseError::QueryError
async fn get_user(id: u64, pool: &sqlx::PgPool) -> Result<User, DatabaseError> {
    let row = sqlx::query_as!(User, "SELECT * FROM users WHERE id = $1", id as i64)
        .fetch_one(pool)
        .await?;  // sqlx::Error 自动转为 DatabaseError::QueryError
    Ok(row)
}
```

等价于手动编写：

```rust
impl From<sqlx::Error> for DatabaseError {
    fn from(source: sqlx::Error) -> Self {
        DatabaseError::QueryError { source }
    }
}
```

**注意**：一个错误枚举中，每种外部错误类型最多只能有一个 `#[from]` 变体，否则 `From` 实现会冲突。

## `#[source]`：保留错误链

`#[source]` 告知 `thiserror` 该字段是"导致此错误的原因"，从而实现 `Error::source()` 方法，让错误链得以完整保留：

```rust
#[derive(Debug, Error)]
pub enum AppError {
    #[error("数据库操作失败")]
    Database(#[source] DatabaseError),  // 保留原始错误链，但不自动实现 From

    #[error("配置加载失败")]
    Config {
        #[source]
        cause: toml::de::Error,
        path: String,
    },
}
```

调用方可通过 `error.source()` 遍历错误链，逐层追溯根因，这对调试生产问题非常有价值。

> **`#[from]` 与 `#[source]` 的区别**：`#[from]` 隐含 `#[source]`，即同时实现 `From` 和 `source()`；而单独的 `#[source]` 只实现错误链，不生成 `From`。需要手动转换错误时用 `#[source]`，需要 `?` 自动转换时用 `#[from]`。

## 完整示例：文件解析库

以下是一个完整的库错误类型设计示例：

```rust
use std::path::PathBuf;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ParseError {
    #[error("无法读取文件 {path:?}")]
    Io {
        path: PathBuf,
        #[source]
        cause: std::io::Error,
    },

    #[error("第 {line} 行语法错误：{message}")]
    Syntax { line: usize, message: String },

    #[error("编码错误：文件必须是 UTF-8")]
    Encoding(#[from] std::string::FromUtf8Error),

    #[error("文件为空")]
    Empty,
}

pub fn parse_file(path: &std::path::Path) -> Result<Vec<Record>, ParseError> {
    let bytes = std::fs::read(path).map_err(|cause| ParseError::Io {
        path: path.to_path_buf(),
        cause,
    })?;

    let content = String::from_utf8(bytes)?;  // FromUtf8Error 自动转换

    if content.is_empty() {
        return Err(ParseError::Empty);
    }

    parse_content(&content)
}

fn parse_content(content: &str) -> Result<Vec<Record>, ParseError> {
    let mut records = Vec::new();
    for (i, line) in content.lines().enumerate() {
        if line.trim().is_empty() {
            continue;
        }
        let record = line.parse::<Record>().map_err(|_| ParseError::Syntax {
            line: i + 1,
            message: format!("无法解析：{line:?}"),
        })?;
        records.push(record);
    }
    Ok(records)
}

// 占位类型，实际项目中替换为真实结构
pub struct Record;
impl std::str::FromStr for Record {
    type Err = ();
    fn from_str(_: &str) -> Result<Self, ()> { Ok(Record) }
}
```

## 错误消息国际化建议

库的错误消息语言取决于目标受众：

- **面向国内用户的应用库**：中文消息直观易懂
- **开源通用库**：建议使用英文，遵循社区惯例
- **错误代码**：可在消息中附带错误码（如 `E001`），便于文档化

## 最佳实践

**1. 按功能域划分错误枚举**

避免一个巨大的 `Error` 枚举包含所有错误，按模块或功能域拆分：

```rust
pub mod db { pub enum Error { ... } }
pub mod auth { pub enum Error { ... } }
pub mod api { pub enum Error { ... } }
```

**2. 错误消息面向调用方**

错误消息应描述"发生了什么"以及"相关上下文"，而非内部实现细节：

```rust
// 好：对调用方有意义
#[error("用户 {username} 不存在")]
UserNotFound { username: String },

// 差：暴露内部实现
#[error("SELECT 查询返回 0 行")]
DbQueryReturnedZeroRows,
```

**3. 保留错误链，不要吞掉原始错误**

```rust
// 好：保留原始错误
#[error("解析配置失败")]
Config(#[source] toml::de::Error),

// 差：丢失原始错误，调试困难
#[error("解析配置失败：{0}")]
Config(String),  // 只保存了字符串表示
```
