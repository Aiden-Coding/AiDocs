---
title: "自定义序列化器"
sidebar_position: 105
---

# 自定义序列化器

`#[derive(Serialize, Deserialize)]` 能覆盖绝大多数场景，但有时你需要更精细的控制：为第三方类型提供 Serde 支持、将数据转换为特殊格式、或针对特定需求进行性能优化。本章讲解三种层次的自定义方案。

## 何时需要自定义

以下情况无法使用 `derive`，需要手动实现或使用辅助机制：

- **第三方类型**：例如 `chrono::DateTime`、`uuid::Uuid` 等不在你控制范围内的类型
- **特殊格式**：将枚举序列化为数字 code，而非字符串名称
- **格式转换**：将 `SystemTime` 序列化为 Unix 时间戳整数而非 ISO 8601 字符串
- **性能敏感**：跳过中间表示，直接写入目标格式

## 方案一：`#[serde(with = "module")]`

这是最常用的自定义方案，通过辅助模块提供一对 `serialize` / `deserialize` 函数：

```rust
mod timestamp {
    use serde::{Deserialize, Deserializer, Serializer};
    use std::time::SystemTime;

    pub fn serialize<S: Serializer>(time: &SystemTime, s: S) -> Result<S::Ok, S::Error> {
        let secs = time
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        s.serialize_u64(secs)
    }

    pub fn deserialize<'de, D: Deserializer<'de>>(d: D) -> Result<SystemTime, D::Error> {
        let secs = u64::deserialize(d)?;
        Ok(SystemTime::UNIX_EPOCH + std::time::Duration::from_secs(secs))
    }
}

#[derive(serde::Serialize, serde::Deserialize)]
struct Event {
    name: String,
    #[serde(with = "timestamp")]
    created_at: SystemTime,
}
```

序列化结果：

```json
{"name": "user_login", "created_at": 1700000000}
```

模块中的函数签名必须精确匹配：`serialize` 接收对值的引用和 `Serializer`；`deserialize` 接收 `Deserializer` 并返回值。

## 方案二：`#[serde(serialize_with)]` / `#[serde(deserialize_with)]`

当只需要定制序列化或反序列化其中一方向时，可分别指定：

```rust
fn serialize_as_lowercase<S: serde::Serializer>(
    s: &str,
    serializer: S,
) -> Result<S::Ok, S::Error> {
    serializer.serialize_str(&s.to_lowercase())
}

fn deserialize_trimmed<'de, D: serde::Deserializer<'de>>(
    d: D,
) -> Result<String, D::Error> {
    let s = String::deserialize(d)?;
    Ok(s.trim().to_string())
}

#[derive(serde::Serialize, serde::Deserialize)]
struct Tag {
    #[serde(serialize_with = "serialize_as_lowercase")]
    #[serde(deserialize_with = "deserialize_trimmed")]
    name: String,
}
```

## 方案三：手动实现 `Serialize` trait

对于需要完全控制输出结构的场景，直接实现 `Serialize`：

```rust
use serde::ser::{Serialize, SerializeStruct, Serializer};

struct Color {
    r: u8,
    g: u8,
    b: u8,
}

impl Serialize for Color {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        // 将 Color 序列化为十六进制字符串，如 "#ff8000"
        let hex = format!("#{:02x}{:02x}{:02x}", self.r, self.g, self.b);
        serializer.serialize_str(&hex)
    }
}
```

序列化结果：`"#ff8000"`，而非 `{"r":255,"g":128,"b":0}`。

若需要序列化为对象，使用 `SerializeStruct`：

```rust
impl Serialize for Color {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut state = serializer.serialize_struct("Color", 3)?;
        state.serialize_field("r", &self.r)?;
        state.serialize_field("g", &self.g)?;
        state.serialize_field("b", &self.b)?;
        state.end()
    }
}
```

## 方案四：手动实现 `Deserialize` trait

反序列化的手动实现稍复杂，需要使用访问者模式（Visitor pattern）：

```rust
use serde::de::{self, Deserialize, Deserializer, Visitor};
use std::fmt;

struct Color {
    r: u8,
    g: u8,
    b: u8,
}

struct ColorVisitor;

impl<'de> Visitor<'de> for ColorVisitor {
    type Value = Color;

    fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
        formatter.write_str("十六进制颜色字符串，如 \"#ff8000\"")
    }

    fn visit_str<E: de::Error>(self, value: &str) -> Result<Color, E> {
        let hex = value.trim_start_matches('#');
        if hex.len() != 6 {
            return Err(E::custom(format!("无效的颜色格式：{value}")));
        }
        let r = u8::from_str_radix(&hex[0..2], 16).map_err(E::custom)?;
        let g = u8::from_str_radix(&hex[2..4], 16).map_err(E::custom)?;
        let b = u8::from_str_radix(&hex[4..6], 16).map_err(E::custom)?;
        Ok(Color { r, g, b })
    }
}

impl<'de> Deserialize<'de> for Color {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Color, D::Error> {
        deserializer.deserialize_str(ColorVisitor)
    }
}
```

## 实际示例：枚举序列化为数字 code

在与外部系统（如数据库、旧 API）对接时，常需要将枚举映射为整数代码：

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, PartialEq)]
enum Status {
    Active,
    Inactive,
    Banned,
}

impl Serialize for Status {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let code: u8 = match self {
            Status::Active => 1,
            Status::Inactive => 0,
            Status::Banned => 99,
        };
        serializer.serialize_u8(code)
    }
}

impl<'de> Deserialize<'de> for Status {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let code = u8::deserialize(deserializer)?;
        match code {
            1 => Ok(Status::Active),
            0 => Ok(Status::Inactive),
            99 => Ok(Status::Banned),
            other => Err(serde::de::Error::custom(format!("未知状态码：{other}"))),
        }
    }
}
```

序列化结果：`1`、`0`、`99`，而非 `"Active"` 等字符串。

## 利用社区现有方案

很多常见场景已有成熟的辅助 crate，无需手动实现：

| 类型 | 推荐方案 |
|---|---|
| `chrono::DateTime` | `chrono` crate 开启 `serde` feature |
| `uuid::Uuid` | `uuid` crate 开启 `serde` feature |
| `bytes::Bytes` | `serde_bytes` crate |
| `std::collections::HashMap` with 非字符串 key | `serde_with` crate |
| 跳过 `None` / 空集合 | `serde_with` 的 `#[skip_serializing_none]` |

在手动实现之前，先检查目标库是否已内置 Serde 支持，或 `serde_with` 是否已覆盖你的场景，可以节省大量时间。
