---
title: "Serde 基础：序列化与反序列化"
sidebar_position: 104
---

# Serde 基础：序列化与反序列化

本章从最常用的 JSON 格式入手，系统讲解 Serde 的核心用法，包括 `derive` 宏、常用属性，以及枚举的三种序列化模式。

## 添加依赖

在 `Cargo.toml` 中声明 Serde 及目标格式的依赖：

```toml
[dependencies]
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

`features = ["derive"]` 启用过程宏支持，这是使用 `#[derive(Serialize, Deserialize)]` 的前提。

## derive 宏：自动生成序列化代码

对绝大多数数据结构，只需添加一行 `derive` 注解即可获得完整的序列化能力：

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
struct User {
    id: u64,
    name: String,
    email: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    nickname: Option<String>,
}
```

此处 `#[serde(skip_serializing_if = "Option::is_none")]` 是一个**字段属性**（field attribute），表示当 `nickname` 为 `None` 时，序列化输出中不包含该字段，从而避免 JSON 中出现 `"nickname": null`。

## 序列化：Rust 结构体 → JSON

```rust
use serde_json;

fn main() -> serde_json::Result<()> {
    let user = User {
        id: 1,
        name: "Alice".to_string(),
        email: "alice@example.com".to_string(),
        nickname: None,
    };

    // 紧凑格式
    let json_compact = serde_json::to_string(&user)?;
    println!("{json_compact}");
    // 输出：{"id":1,"name":"Alice","email":"alice@example.com"}

    // 格式化输出（带缩进）
    let json_pretty = serde_json::to_string_pretty(&user)?;
    println!("{json_pretty}");

    Ok(())
}
```

格式化输出结果：

```json
{
  "id": 1,
  "name": "Alice",
  "email": "alice@example.com"
}
```

注意 `nickname` 字段因为是 `None` 而被完全省略——这正是 `skip_serializing_if` 的效果。

## 反序列化：JSON → Rust 结构体

```rust
fn parse_user() -> serde_json::Result<()> {
    let json = r#"{"id":1,"name":"Bob","email":"bob@example.com"}"#;

    // 通过类型注解告知 Serde 目标类型
    let user: User = serde_json::from_str(json)?;
    println!("{:?}", user);
    // 输出：User { id: 1, name: "Bob", email: "bob@example.com", nickname: None }

    Ok(())
}
```

`nickname` 字段在 JSON 中不存在，但因为其类型为 `Option<String>`，Serde 自动将其填充为 `None`。若要为缺失字段提供自定义默认值，可使用 `#[serde(default)]` 属性。

## 常用 serde 属性速查

Serde 提供了丰富的属性用于控制序列化行为，以下是最常用的几种：

| 属性 | 作用层级 | 说明 |
|---|---|---|
| `#[serde(rename = "userId")]` | 字段 | 将字段名映射为指定名称 |
| `#[serde(rename_all = "camelCase")]` | 结构体/枚举 | 批量转换所有字段名的命名风格 |
| `#[serde(skip)]` | 字段 | 序列化和反序列化均跳过此字段 |
| `#[serde(skip_serializing_if = "Option::is_none")]` | 字段 | 满足条件时跳过序列化 |
| `#[serde(default)]` | 字段 | 反序列化时字段缺失则调用 `Default::default()` |
| `#[serde(default = "fn_name")]` | 字段 | 反序列化时字段缺失则调用指定函数 |
| `#[serde(flatten)]` | 字段 | 将嵌套结构体的字段展平到父层级 |
| `#[serde(tag = "type")]` | 枚举 | 枚举内部标签模式 |
| `#[serde(deny_unknown_fields)]` | 结构体 | 遇到未知字段时报错（严格模式） |

### 示例：rename_all 与 flatten

```rust
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
struct Pagination {
    page: u32,
    page_size: u32,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ApiResponse {
    total_count: u64,
    #[serde(flatten)]
    pagination: Pagination,
}
```

序列化结果为：

```json
{
  "totalCount": 100,
  "page": 1,
  "pageSize": 20
}
```

`rename_all = "camelCase"` 将 `total_count` 转为 `totalCount`；`flatten` 将 `Pagination` 的字段直接展平到同一层，无需嵌套对象。

## 枚举序列化的三种模式

枚举的序列化方式取决于调用方（前端、其他语言）的期望格式，Serde 提供三种标准模式。

### 外部标签（默认）

```rust
#[derive(Serialize, Deserialize)]
enum Shape {
    Circle { radius: f64 },
    Rectangle { width: f64, height: f64 },
    Point,
}
```

序列化结果：

```json
{"Circle": {"radius": 5.0}}
{"Rectangle": {"width": 3.0, "height": 4.0}}
"Point"
```

变体名作为外层键，这是 Serde 的默认行为。

### 内部标签

```rust
#[derive(Serialize, Deserialize)]
#[serde(tag = "type")]
enum Command {
    Move { x: i32, y: i32 },
    Write { text: String },
    Quit,
}
```

序列化结果：

```json
{"type": "Move", "x": 10, "y": 20}
{"type": "Write", "text": "hello"}
{"type": "Quit"}
```

类型标签字段内嵌在对象中，更符合 REST API 的常见约定。

### 相邻标签

```rust
#[derive(Serialize, Deserialize)]
#[serde(tag = "t", content = "c")]
enum Event {
    Click { x: i32, y: i32 },
    KeyPress(char),
}
```

序列化结果：

```json
{"t": "Click", "c": {"x": 1, "y": 2}}
{"t": "KeyPress", "c": "a"}
```

标签与内容分开存储为两个字段，适合内容可能是非对象类型（如元组变体）的场景。

## 处理多种格式

Serde 的强大之处在于数据结构只需实现一次，即可在不同格式间切换：

```rust
// 需要在 Cargo.toml 中添加 toml 和 bincode 依赖
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
struct Config {
    host: String,
    port: u16,
    debug: bool,
}

fn format_examples(config: &Config) -> anyhow::Result<()> {
    // JSON 格式（人类可读）
    let json = serde_json::to_string_pretty(config)?;
    println!("JSON:\n{json}");

    // TOML 格式（配置文件首选）
    let toml_str = toml::to_string(config)?;
    println!("TOML:\n{toml_str}");

    // Bincode（高效二进制，纯 Rust 场景）
    let bytes = bincode::serialize(config)?;
    println!("Bincode bytes: {}", bytes.len());

    Ok(())
}
```

同一个 `Config` 结构体，无需修改任何字段定义，就能在 JSON、TOML、Bincode 三种格式之间自由序列化——这正是 Serde 解耦设计带来的核心价值。

## 常见坑与注意事项

**坑 1：数字类型精度**

JavaScript 的 `number` 类型只能精确表示 53 位整数，若 Rust 侧使用 `u64` 且值超过此范围，前端解析会丢失精度。解决方案是将大整数序列化为字符串：

```rust
#[derive(Serialize, Deserialize)]
struct Record {
    #[serde(with = "serde_json::string_number")]
    id: u64,
}
```

**坑 2：反序列化严格性**

默认情况下，JSON 中出现结构体未知字段时，Serde 会静默忽略。若需要严格拒绝，添加 `#[serde(deny_unknown_fields)]`。

**坑 3：`Option` 与 `null` 的区别**

`Option::None` 默认序列化为 `null`，而 `skip_serializing_if = "Option::is_none"` 会完全省略字段。两者语义不同，根据 API 约定选择合适的方式。
