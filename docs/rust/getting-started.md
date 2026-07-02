---
title: Hello World
hide_title: true
sidebar_label: Hello World
sidebar_position: 1
---

# Hello World

这是传统的 Hello World 程序的源码。Rust 程序的入口点是一个名为 `main` 的函数，通过 Rust 编译器和工具链，我们可以从最简单的程序开始，逐步掌握格式化输出、基本类型、流程控制等核心语法。

> 🟢 **基础**：适合完全零基础的 Rust 初学者阅读。

---

## 🛠️ 第一步：环境配置与工具链

高效的开发离不开稳定强大的工具链。Rust 官方提供了一套完整的工具链管理系统。

### 1. 安装 Rust 与 `rustup`

`rustup` 是 Rust 的官方工具链安装器和管理器，支持跨平台管理不同的 Rust 版本（如 `stable`、`beta`、`nightly`）。

In macOS / Linux 上，打开终端执行以下命令进行安装：

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

## 📝 经典起步：Hello World 与格式化输出

### 1. 注释

Rust 支持两种注释方式。注释会被编译器忽略：

```rust
// 这是单行注释。

/*
  这是多行注释。
  可以跨越多行。
*/
```

### 2. 格式化输出 (Formatted Print)

Rust 的格式化输出由 `std::fmt` 中定义的一系列宏（Macros）来处理。最常用的有：

- `format!`：将格式化文本写入到 `String` 中。
- `print!`：与 `format!` 类似，但将文本输出到控制台（stdout）。
- `println!`：与 `print!` 类似，但输出时会在末尾追加换行符。
- `eprintln!`：与 `println!` 类似，但文本输出到标准错误流（stderr）。

#### 基础语法与控制参数

```rust
fn main() {
    // 1. 最基本的占位符，由参数依次替换
    println!("{} days", 31);

    // 2. 位置参数：指定参数的索引
    println!("{0} 的生日是 {1}。{0} 很开心！", "Alice", "10月1日");

    // 3. 命名参数：直接使用变量名映射
    println!("{subject} {verb} {object}",
             object="the lazy dog",
             subject="the quick brown fox",
             verb="jumps over");

    // 4. 进制格式化
    println!("基数 10:       {}", 69420);
    println!("基数 2 (二进制): {:b}", 69420);
    println!("基数 8 (八进制): {:o}", 69420);
    println!("基数 16 (十六进制): {:x}", 69420);

    // 5. 对齐与宽度控制
    // 右对齐，宽度为 5，多余部分空格填充
    println!("{number:>5}", number=1);
    // 左对齐，多余部分使用字符 '0' 填充，结果为 "10000"
    println!("{number:0<5}", number=1);
    // 使用命名参数来动态指定宽度
    println!("{number:>width$}", number=1, width=5);
}
```

#### `Debug` 与 `Display`

所有希望打印输出的类型都必须实现格式化特征（Formatting Traits）。默认情况下，标准库类型实现了 `Display`（用于面向普通用户的 `{}`）或 `Debug`（用于面向开发者的 `{:?}`）。

对于自定义类型（例如结构体），默认是无法打印的，必须手动实现或通过派生（derive）引入特征：

```rust
// 1. 自动派生 Debug 特征。这使得该结构体可以使用 `{:?}` 打印
#[derive(Debug)]
struct Structure(i32);

// 2. 手动实现 Display 特征以自定义漂亮的用户界面打印输出
use std::fmt;

struct Point2D {
    x: f64,
    y: f64,
}

impl fmt::Display for Point2D {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        // 自定义打印格式：(x, y)
        write!(f, "x: {}, y: {}", self.x, self.y)
    }
}

fn main() {
    // Debug 打印
    println!("Debug 输出: {:?}", Structure(3));
    // 美化后的 Debug 打印，带有换行和缩进
    println!("美化 Debug:\n{:#?}", Structure(3));

    // Display 打印
    let point = Point2D { x: 3.3, y: 4.4 };
    println!("Display 输出: {}", point);
}
```

#### 测试实例：`List`

下面的例子展示了如何通过 `write!` 宏为包含 `Vec` 的结构体实现 `fmt::Display`：

```rust
use std::fmt;

struct List(Vec<i32>);

impl fmt::Display for List {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        // 解构内部 Vec
        let vec = &self.0;

        // 写入前缀字符 '['
        write!(f, "[")?;

        // 迭代 vec 中的所有项
        for (count, v) in vec.iter().enumerate() {
            // 在除第一项外的其他项前加入逗号
            if count != 0 { write!(f, ", ")?; }
            // 写入当前元素的值及索引
            write!(f, "{}: {}", count, v)?;
        }

        // 写入后缀字符 ']' 并返回结果
        write!(f, "]")
    }
}

fn main() {
    let v = List(vec![1, 2, 3]);
    println!("{}", v); // 输出: [0: 1, 1: 2, 2: 3]
}
```

#### 测试实例：`Color`

下面这个例子展示了如何通过 `fmt::Display` 格式化输出颜色值。我们使用特定的格式化参数 `{:02X}`（零填充，宽度为 2，十六进制大写）来打印其 RGB 与对应的十六进制颜色：

```rust
use std::fmt;

struct Color {
    red: u8,
    green: u8,
    blue: u8,
}

impl fmt::Display for Color {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        // 计算其十六进制值，并进行格式化输出。
        // :02X 表示十六进制大写，不足两位的左边补零
        write!(
            f,
            "RGB ({}, {}, {}) 0x{:02X}{:02X}{:02X}",
            self.red, self.green, self.blue, self.red, self.green, self.blue
        )
    }
}

fn main() {
    let color = Color { red: 128, green: 255, blue: 90 };
    println!("{}", color); // 输出: RGB (128, 255, 90) 0x80FF5A
}
```

---

## 🔤 原生类型与字面量

### 1. 原生类型分类

Rust 包含以下原生类型：

- **标量类型 (Scalar Types)**：
  - 整型：有符号（`i8`, `i16`, `i32`, `i64`, `i128`, `isize`）及无符号（`u8`, `u16`, `u32`, `u64`, `u128`, `usize`）。
  - 浮点型：`f32`, `f64`。
  - 布尔型：`bool`，取值为 `true` 或 `false`。
  - 字符型：`char`（4 字节 Unicode 标量值），例如 `'a'`、`'🦀'`。
- **复合类型 (Compound Types)**：
  - 元组：例如 `(500, 6.4, 1)`。
  - 数组：例如 `[1, 2, 3, 4, 5]`。

### 2. 字面量与运算符

Rust 拥有丰富的运算符，并且整型字面量支持添加后缀以显式指定类型。

```rust
fn main() {
    // 1. 带有类型后缀的字面量
    let x = 1u8;
    let y = 2u32;
    let z = 3.0f32;

    // 2. 运算符与位运算
    println!("1 + 2 = {}", 1u32 + 2u32);
    println!("1 - 2 = {}", 1i32 - 2i32);
    println!("0011 AND 0101 is {:04b}", 0b0011u32 & 0b0101u32);
    println!("0011 OR 0101 is {:04b}", 0b0011u32 | 0b0101u32);
    println!("0011 XOR 0101 is {:04b}", 0b0011u32 ^ 0b0101u32);
    println!("1 << 5 is {}", 1u32 << 5);
}
```

### 3. 元组 (Tuples) 深度解析

元组是不同类型值的集合。元组可以作为函数的参数和返回值。

#### 测试实例：矩阵转置

```rust
// 包含 4 个浮点数的结构体，表示 2x2 矩阵
#[derive(Debug)]
struct Matrix(f32, f32, f32, f32);

// 实现转置函数，交换右上和左下角元素
fn transpose(matrix: Matrix) -> Matrix {
    Matrix(matrix.0, matrix.2, matrix.1, matrix.3)
}

fn main() {
    let my_matrix = Matrix(1.0, 2.0, 3.0, 4.0);
    println!("原始矩阵: {:?}", my_matrix);
    println!("转置矩阵: {:?}", transpose(my_matrix));
}
```

### 4. 数组 (Arrays) 与切片 (Slices)

- **数组**：是一个在编译期大小已知的相同类型元素的集合，在栈上分配连续内存。
- **切片**：是一个双字对象（类似于指针与长度），用于指向一个连续序列（通常是数组或 `Vec`）的某一段。

```rust
fn analyze_slice(slice: &[i32]) {
    println!("切片第一个元素: {}", slice[0]);
    println!("切片长度: {}", slice.len());
}

fn main() {
    // 固定长度的数组（类型签名中必须包含长度）
    let xs: [i32; 5] = [1, 2, 3, 4, 5];

    // 初始化所有元素为 0 的数组
    let ys: [i32; 500] = [0; 500];

    // 数组分配在栈上
    println!("数组 xs 占用字节数: {}", std::mem::size_of_val(&xs));

    // 数组可以被自动转换为切片
    analyze_slice(&xs);

    // 获取数组 xs 的某一段作为切片 [开始索引..结束索引]（左闭右开）
    analyze_slice(&xs[1..4]);
}
```

---

## 🎨 自定义类型：结构体与枚举

### 1. 结构体 (Structs)

除了经典的命名结构体，Rust 还支持元组结构体和单元结构体：

```rust
// 1. 经典的命名结构体 (Named-field Struct)
struct Point {
    x: f32,
    y: f32,
}

// 2. 元组结构体 (Tuple Struct)
struct Pair(i32, f32);

// 3. 单元结构体 (Unit-like Struct)
struct Unit;
```

### 2. 枚举 (Enums)

枚举允许一个类型只能是几种变体之一。Rust 的枚举极其强大，因为每个变体都可以携带数据：

```rust
// 定义枚举
enum WebEvent {
    PageLoad,                 // 无数据变体
    PageUnload,
    KeyPress(char),           // 包含 char 变体
    Paste(String),            // 包含 String 变体
    Click { x: i64, y: i64 }, // 包含匿名结构体变体
}
```

#### 使用 `use` 引入枚举变体

使用 `use` 声明可以让你省去书写冗长作用域的麻烦：

```rust
enum Status {
    Rich,
    Poor,
}

fn main() {
    // 显式导入枚举变体
    use crate::Status::{Rich, Poor};

    let status = Rich; // 不需要写 Status::Rich
}
```

#### C 风格枚举 (C-like enums)

在需要像 C 语言一样指定枚举变体的数值时，可以使用隐式或显式的整型值绑定：

```rust
// 显式指定整型值的枚举
enum Number {
    Zero, // 默认从 0 开始
    One,
    Two = 100, // 显式赋值为 100
    Three,     // 接着上一个值递增，为 101
}

fn main() {
    // 将枚举转换为 i32
    println!("Zero is {}", Number::Zero as i32);
    println!("Two is {}", Number::Two as i32);
    println!("Three is {}", Number::Three as i32);
}
```

#### 测试实例：递归链表

利用枚举实现一个经典的函数式单链表（Singly Linked List）：

```rust
use crate::List::{Cons, Nil};

enum List {
    // Cons: 包含一个元素和一个指向下一节点的 Box 指针
    Cons(u32, Box<List>),
    // Nil: 表示链表的末尾节点
    Nil,
}

impl List {
    // 创建一个空链表
    fn new() -> List {
        Nil
    }

    // 在链表头部插入元素，并返回新链表
    fn prepend(self, elem: u32) -> List {
        Cons(elem, Box::new(self))
    }

    // 计算链表长度
    fn len(&self) -> u32 {
        match self {
            // self 是不可变引用，因此对下一节点的 Box 只能借用 ref
            Cons(_, ref tail) => 1 + tail.len(),
            Nil => 0,
        }
    }
}

fn main() {
    let mut list = List::new();
    list = list.prepend(1);
    list = list.prepend(2);
    list = list.prepend(3);

    println!("链表长度: {}", list.len()); // 输出: 3
}
```

---

## 🔒 变量绑定与类型系统

### 1. 变量可变性与遮蔽

- **可变性**：变量默认不可变。使用 `mut` 关键字标记为可变。
- **变量遮蔽 (Shadowing)**：允许重新声明同名变量，从而暂时或永久遮蔽前一个变量绑定。

```rust
fn main() {
    let x = 5;
    // x = 6; // ❌ 默认不可变，编译报错

    let mut y = 10;
    y = 15; // ✅ 可变

    // 变量遮蔽
    let shadow = 1;
    let shadow = shadow + 1; // 遮蔽前的 shadow，新 shadow 为 2
    let shadow = "Now I am a string"; // 改变了类型，重新绑定
}
```

### 2. 变量先声明

Rust 允许先声明变量，再进行初始化。但是，**在使用未初始化的变量时，编译器会进行静态拦截**以防止未定义行为：

```rust
fn main() {
    let a; // 仅声明，不初始化
    a = 10; // 初始化
    println!("a = {}", a); // ✅ 合法

    let b: i32;
    // println!("b = {}", b); // ❌ 编译报错：use of possibly-uninitialized variable
}
```

### 3. 冻结 (Freezing)

当一个数据被**不可变借用**时，它在当前借用作用域内会被“冻结”。即使它被声明为可变变量，在冻结期间也无法对其执行写修改操作：

```rust
fn main() {
    let mut _mutable_integer = 7i32;

    {
        // 借用可变整数，数据在此作用域被冻结
        let _large_integer = &_mutable_integer;

        // _mutable_integer = 50; // ❌ 编译报错：cannot assign to `_mutable_integer` because it is borrowed
    } // 借用结束，冻结解除

    _mutable_integer = 50; // ✅ 合法
}
```

### 4. 类型系统进阶

- **`as` 强转**：用于原生类型之间的显式类型转换。
- **类型推断**：编译器非常聪明，能自动推导大多数类型。但在没有足够上下文时需借助类型标注或字面量后缀。
- **类型别名**：使用 `type` 关键字给类型赋予别名（通常用于简化长泛型签名）。

```rust
type NanoSecond = u64;

fn main() {
    // 1. as 强转
    let decimal = 65.4321_f32;
    let integer = decimal as u8; // 截断为 65
    let character = integer as char; // 65 对应 'A'

    // 2. 类型别名
    let ns: NanoSecond = 10000;
}
```

---

## ⚡ 表达式与流程控制

### 1. 表达式 (Expressions) vs 语句 (Statements)

在 Rust 中，大多数代码块都是表达式，即它们**有返回值**。

- **语句**：通常以分号 `;` 结尾，其值始终为单元类型 `()`（空元组）。
- **表达式**：如果不加分号，代码块的最后一行会被作为值返回。

```rust
fn main() {
    let x = 5;

    // 代码块是一个表达式
    let y = {
        let x_squared = x * x;
        let x_cube = x_squared * x;

        // 该行无分号，会被返回并赋值给 y
        x_cube + x_squared + x
    };

    println!("y = {}", y); // 输出: 155
}
```

### 2. 循环控制与标签

对于多层嵌套循环，可以使用生存期标签（Lifetime Label）在一层内部直接跳出外层循环：

```rust
fn main() {
    let mut count = 0;

    // 外层循环加上标签 'outer
    'outer: loop {
        println!("进入外层循环");

        loop {
            println!("进入内层循环");
            count += 1;

            if count == 3 {
                // 直接跳出最外层循环
                break 'outer;
            }
        }
    }
}
```

#### 从 `loop` 返回值

`loop` 可以在 `break` 之后返回一个值给外部绑定：

```rust
fn main() {
    let mut counter = 0;

    let result = loop {
        counter += 1;
        if counter == 10 {
            break counter * 2; // 返回 20
        }
    };
}
```

### 3. 深度模式匹配 (Pattern Matching)

`match` 分支必须穷尽所有可能性。它支持极强的解构能力：

#### 解构元组、枚举与结构体

```rust
struct Foo {
    x: (u32, u32),
    y: u32,
}

fn main() {
    // 1. 解构元组
    let triple = (0, -2, 3);
    match triple {
        (0, y, z) => println!("第一个元素是 0, y: {}, z: {}", y, z),
        _ => println!("其他情况"),
    }

    // 2. 解构结构体
    let foo = Foo { x: (1, 2), y: 3 };
    match foo {
        Foo { x: (1, b), y } => println!("匹配！b: {}, y: {}", b, y),
        Foo { y, .. } => println!("仅匹配 y: {}, 忽略 x", y),
    }
}
```

#### 解构指针与引用

当被匹配的变量是一个引用或指针时，解构有以下需要注意的映射逻辑（配合 `ref` 关键字）：

```rust
fn main() {
    let reference = &4;

    match reference {
        // 如果匹配 &val，得到的是解包后的 i32 拷贝值 val
        &val => println!("Got a value via destructuring: {:?}", val),
    }

    // 如果不想解构，可以利用 ref 关键字将未引用的变量绑定为引用类型
    let value = 5;
    match value {
        ref r => println!("Got a reference to value: {:?}", r), // r 类型为 &i32
    }
}
```

#### match 卫语句 (Guards)

可以用卫语句对匹配的分支加入更加灵活的 `if` 条件过滤：

```rust
fn main() {
    let pair = (2, -2);

    match pair {
        (x, y) if x == y => println!("x == y"),
        (x, y) if x + y == 0 => println!("互为相反数！"),
        (x, y) => println!("普通数值对 ({}, {})", x, y),
    }
}
```

#### 模式绑定 `@`

使用 `@` 可以在匹配模式的同时，将对应解构出的子项绑定到一个新的变量中：

```rust
fn main() {
    let age = 15;

    match age {
        // 匹配 13~19 的范围，并将匹配到的数值绑定到 n 变量上
        n @ 13..=19 => println!("青少年，年龄是: {}", n),
        n => println!("其他年龄: {}", n),
    }
}
```

### 4. `if let` 与 `while let`

当只需要处理一个特定的变体，而不在意其他情况时，`if let` 和 `while let` 是极好的语法糖：

```rust
fn main() {
    let optional = Some(7);

    // 替代了写冗长的 match 覆盖 None 分支
    if let Some(i) = optional {
        println!("Got Some: {}", i);
    }

    // while let 适用于循环消费迭代/变体
    let mut optional_stack = vec![Some(1), Some(2), None];
    while let Some(Some(value)) = optional_stack.pop() {
        println!("Popped: {}", value);
    }
}
```

> [!NOTE]
> **下一步建议**：掌握了 Rust 极其严格的基础语法与类型系统后，请继续阅读 [所有权与生命周期核心](ownership-lifetimes.md)，了解 Rust 独特的 Borrow Checker 是如何保障内存安全与高并发的。
