---
title: "Serde：Rust 序列化生态"
sidebar_position: 103
---

# Serde：Rust 序列化生态

Serde 是 Rust 生态中最广泛使用的序列化框架，其名称来自 **Ser**ialize（序列化）与 **De**serialize（反序列化）两个单词的组合。无论是构建 Web API、读写配置文件，还是实现高效的网络通信协议，Serde 几乎都是第一选择。

## 什么是 Serde

Serde 是一个 **数据结构序列化与反序列化框架**，核心设计思想是将数据结构与具体的数据格式完全解耦：

- **数据结构侧**：你的 `struct` 或 `enum` 实现 `Serialize` / `Deserialize` trait
- **格式侧**：JSON、TOML、YAML 等各自提供 `Serializer` / `Deserializer` 实现
- **中间层**：Serde 定义统一的数据模型（data model），充当两侧的桥梁

这意味着你只需为数据结构实现一次 Serde trait，就能在所有支持 Serde 的格式之间自由转换，无需为每种格式单独编写解析逻辑。

## 为什么 Serde 如此流行

在 Rust 生态中，Serde 拥有极高的采用率，原因有以下几点：

**1. 零成本抽象（Zero-Cost Abstraction）**

Serde 利用 Rust 的过程宏（procedural macro）在编译期生成序列化代码。最终的二进制文件中不存在运行时反射或动态分发，性能与手写代码相当甚至更优。

**2. 生态覆盖极广**

主流 Rust 库几乎都原生支持 Serde，包括数据库 ORM、HTTP 框架、配置解析库等。一旦你的类型实现了 Serde trait，就能无缝融入整个生态。

**3. 开发体验极佳**

通过 `#[derive(Serialize, Deserialize)]` 一行宏，即可为绝大多数数据结构自动生成完整的序列化支持，无需手写样板代码。

**4. 高度可定制**

从简单的字段重命名到复杂的自定义序列化逻辑，Serde 提供了丰富的属性（attribute）和 trait 实现接口，满足各种边缘场景。

## 零成本抽象原理

Serde 的高性能秘诀在于 **编译期代码生成**。当你写下：

```rust
#[derive(Serialize, Deserialize)]
struct Point {
    x: f64,
    y: f64,
}
```

`serde_derive` 过程宏会在编译期展开为等价的 `Serialize` / `Deserialize` trait 实现代码，直接操作 `Serializer`/`Deserializer` 的方法，不涉及任何堆分配或动态查找。编译器随后对这些代码进行内联与优化，最终性能几乎等同于为特定格式手写的解析器。

## 支持的格式概览

Serde 本身只定义框架，具体格式由独立 crate 实现：

| 格式 | Crate | 适用场景 |
|---|---|---|
| JSON | `serde_json` | Web API、配置、调试 |
| TOML | `toml` | Cargo 配置、应用配置 |
| YAML | `serde_yaml` | 复杂配置、DevOps 工具 |
| MessagePack | `rmp-serde` | 高效二进制、跨语言通信 |
| Bincode | `bincode` | 纯 Rust 内部通信、持久化 |
| CBOR | `ciborium` | IoT、嵌入式、IETF 标准 |
| CSV | `csv` | 数据处理、表格文件 |
| URL 查询参数 | `serde_urlencoded` | HTTP 表单、GET 参数 |

## 本章路线图

本章将系统讲解 Serde 的使用方法：

- [Serde 基础：序列化与反序列化](ch22-01-serde-basics.md)——`derive` 宏、常用属性、枚举序列化三种模式
- [自定义序列化器](ch22-02-custom-serialization.md)——手动实现 trait、`with` 模块、单字段定制

学习完本章，你将能够在实际项目中熟练运用 Serde 处理各种数据序列化需求。
