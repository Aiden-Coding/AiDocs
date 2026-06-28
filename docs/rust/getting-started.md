---
title: Rust 语法基石与工具链
hide_title: true
sidebar_label: 语法基石与工具链
sidebar_position: 1
---

## Rust 语法基石与工具链

欢迎开启 Rust 的探索之旅！对于初学者而言，Rust 的编译器和工具链既是强大的安全卫士，也可能是最严苛的“导师”。本篇将从最基础的开发环境搭建与 Cargo 包管理器入手，逐步解析 Rust 的基本语法和类型系统，为后续攻克“所有权”等硬核课题打下坚实的基础。

> 🟢 **基础**：适合完全零基础的 Rust 初学者阅读。

---

## 🛠️ 第一步：环境配置与工具链

高效的开发离不开稳定强大的工具链。Rust 官方提供了一套完整的工具链管理系统。

### 1. 安装 Rust 与 `rustup`

`rustup` 是 Rust 的官方工具链安装器 and 管理器，支持跨平台管理不同的 Rust 版本（如 `stable`、`beta`、`nightly`）。

在 macOS / Linux 上，打开终端执行以下命令进行安装：

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

> [!TIP]
> **中国大陆镜像加速**：如果您在下载时遇到网络缓慢问题，可以在安装前在终端中配置环境变量使用国内镜像源（如清华大学或字节跳动镜像）：
>
> ```bash
> export RUSTUP_DIST_SERVER="https://rsproxy.cn"
> export RUSTUP_UPDATE_ROOT="https://rsproxy.cn/rustup"
> ```

安装完成后，验证安装结果：

```bash
rustc --version  # 查看编译器版本
cargo --version  # 查看包管理器版本
```

### 2. 核心组件介绍

安装 Rust 后，你的系统中会拥有以下几个核心组件：
- **`rustc`**：Rust 编译器，负责将 `.rs` 源代码编译成机器码。
- **`cargo`**：Rust 的构建系统和包管理器。日常开发中，我们几乎 99% 的工作都是与 Cargo 交互，而不需要直接调用 `rustc`。
- **`rustup`**：工具链管理器。例如，升级 Rust 只需要运行 `rustup update`。

---

## 📦 现代工程的起点：包管理器 Cargo

Cargo 是 Rust 备受赞誉的原因之一。它集成了编译、包管理、运行、测试和文档生成等所有日常功能。

### 1. 创建项目

创建一个名为 `hello_rust` 的新项目：

```bash
cargo new hello_rust --bin
```

*提示：`--bin` 表示创建一个可执行程序项目，如果是库项目，可使用 `--lib`。*

创建后的目录结构如下：

```text
hello_rust/
├── Cargo.toml      # 项目清单与依赖配置文件
└── src/
    └── main.rs     # 入口源文件
```

### 2. 认识 `Cargo.toml`

`Cargo.toml` 使用 TOML 格式，是项目的配置核心：

```toml
[package]
name = "hello_rust"      # 项目名称
version = "0.1.0"        # 项目版本
edition = "2021"         # Rust 语言大版本（如 2018, 2021）

[dependencies]
# 在此处添加第三方库依赖，例如：
# serde = "1.0"
```

### 3. 构建与运行命令

在项目根目录下，你可以使用以下指令：

| 命令 | 描述 | 适用场景 |
| :--- | :--- | :--- |
| `cargo build` | 编译当前项目，生成可执行文件在 `target/debug/` | 检查代码是否可编译 |
| `cargo run` | 编译并在一步之内直接运行生成的可执行文件 | 快速调试和运行代码 |
| `cargo check` | 快速检查代码语法和类型，但不生成可执行文件 | 编写代码时的高频实时语法验证（速度极快） |
| `cargo build --release` | 启用编译器终极优化进行编译，生成在 `target/release/` | 准备发布或部署生产环境 |

---

## 📝 语法基石：变量与控制流

### 1. 变量绑定与可变性

在 Rust 中，**变量默认是不可变的（Immutable）**。这有利于并发安全和静态优化。

```rust
fn main() {
    let x = 5; // 默认不可变
    // x = 6;  // ❌ 编译报错：cannot assign twice to immutable variable

    let mut y = 10; // 使用 mut 关键字声明为可变变量
    println!("y 的初始值: {}", y);
    y = 15;        // ✅ 允许修改
    println!("y 修改后的值: {}", y);
}
```

#### 常量 (Constants)

使用 `const` 关键字定义常量，常量不仅默认不可变，而且**永远不可变**，并且必须显式标注类型：

```rust
const MAX_POINTS: u32 = 100_000;
```

### 2. 基础数据类型

Rust 拥有静态强类型系统，但在多数情况下，编译器能自动推导类型（Type Inference）。

#### 标量类型 (Scalar Types)

- **整数**：有符号（`i8`~`i128`, `isize`）与无符号（`u8`~`u128`, `usize`）。默认推导为 `i32`。
- **浮点数**：`f32` 和 `f64`（默认）。
- **布尔型**：`bool`，取值为 `true` 或 `false`。
- **字符**：`char`，代表一个 Unicode 标量值（占用 4 字节），用单引号声明，例如 `let c = '蟹';`。

#### 复合类型 (Compound Types)

- **元组 (Tuple)**：长度固定，可包含多种不同类型：

  ```rust
  let tup: (i32, f64, u8) = (500, 6.4, 1);
  let (x, y, z) = tup; // 解构元组
  let first = tup.0;   // 通过索引访问
  ```

- **数组 (Array)**：长度固定，内部所有元素必须是相同类型：

  ```rust
  let arr: [i32; 5] = [1, 2, 3, 4, 5];
  let first = arr[0];
  ```

### 3. 常用控制流

#### 条件分支 `if`

Rust 的 `if` 是一个**表达式**，这意味着它可以返回值。

```rust
let condition = true;
let number = if condition { 5 } else { 6 }; // 两个分支返回类型必须一致
```

#### 循环结构

Rust 提供了三种循环：`loop`、`while` 和 `for`。

- **`loop`**：无条件循环，常用于轮询，可以通过 `break` 返回一个值。

  ```rust
  let mut counter = 0;
  let result = loop {
      counter += 1;
      if counter == 10 {
          break counter * 2; // break 可以附带返回值
      }
  };
  ```

- **`while`**：条件循环。

  ```rust
  let mut number = 3;
  while number != 0 {
      number -= 1;
  }
  ```

- **`for`**：遍历集合（最安全、最高效的首选方式）。

  ```rust
  let a = [10, 20, 30, 40, 50];
  for element in a.iter() {
      println!("the value is: {}", element);
  }
  ```

---

## 🏗️ 复合类型与模式匹配起步

通过结构体和枚举，开发者可以轻松构建复杂的数据模型。

### 1. 结构体 (Structs)

Rust 提供了三种结构体：

```rust
// 1. 经典的命名结构体 (Named-field Struct)
struct User {
    username: String,
    active: bool,
    sign_in_count: u64,
}

// 2. 元组结构体 (Tuple Struct) - 用于封装简单数据，无命名字段
struct Color(i32, i32, i32);

// 3. 单元结构体 (Unit-like Struct) - 不占用内存，常用于 Traits 的泛型标记
struct AlwaysEqual;

fn main() {
    let mut user1 = User {
        username: String::from("alice"),
        active: true,
        sign_in_count: 1,
    };
    user1.sign_in_count = 2; // 如果实例是 mut 的，字段可修改
}
```

### 2. 枚举 (Enums) 与模式匹配

枚举是 Rust 类型系统的明珠，支持将丰富的数据直接关联到变体（Variants）中。

```rust
// 定义一个包含多种数据类型的枚举
enum Message {
    Quit,                         // 无关联数据
    Move { x: i32, y: i32 },      // 关联匿名结构体
    Write(String),                // 关联 String
    ChangeColor(i32, i32, i32),   // 关联多个 i32
}

fn process_message(msg: Message) {
    // 使用 match 表达式进行模式匹配（必须穷尽所有可能性）
    match msg {
        Message::Quit => {
            println!("收到退出消息");
        }
        Message::Move { x, y } => {
            println!("移动到坐标: x={}, y={}", x, y);
        }
        Message::Write(text) => {
            println!("写入文本: {}", text);
        }
        Message::ChangeColor(r, g, b) => {
            println!("更改颜色为: R={}, G={}, B={}", r, g, b);
        }
    }
}
```

### 3. 至关重要的 `Option<T>`

Rust 中没有 `null`。相反，标准库定义了一个特殊的枚举 `Option<T>` 用来表示一个值“存在”或“不存在”：

```rust
// 标准库定义简化版：
// enum Option<T> {
//     Some(T),
//     None,
// }

fn main() {
    let some_number = Some(5);
    let absent_number: Option<i32> = None;

    // 安全地解包
    match some_number {
        Some(val) => println!("数字是: {}", val),
        None => println!("值为空"),
    }
}
```

通过强制使用 `Option`，Rust 编译器可以在编译阶段拦截任何“空指针异常”（Null Pointer Exception），从根本上保证了程序的运行安全。

> [!NOTE]
> **下一步建议**：掌握了这些基础之后，您就可以开始攻克 Rust 的核心难关——[所有权与生命周期](ownership-lifetimes.md)。那里将为您揭示 Rust 是如何在不依赖垃圾回收（GC）的情况下，实现极致的内存安全与零开销抽象的。
