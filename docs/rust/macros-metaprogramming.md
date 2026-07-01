---
title: Rust 宏与元编程系统
hide_title: true
sidebar_label: 宏与元编程
---

## 🟢 Rust 宏与元编程系统

元编程（Metaprogramming）是指用代码去生成代码的技术。Rust 提供了极度强大且类型安全的**宏系统**（Macros）。与 C/C++ 中简单的文本替换预处理器宏不同，Rust 的宏是基于抽象语法树（AST）和 Token 流进行操作的，能够在编译期进行强大的代码生成、代码重构及领域专用语言（DSL）的设计，且不会引发符号覆盖等副作用。

> 🟢 **基础**：掌握基本语法即可阅读 ｜ 🟡 **进阶**：需要有一定 Rust 开发经验 ｜ 🔴 **高级**：面向系统级开发者与性能工程师

---

## 🟢 宏的分类与应用场景

Rust 中主要存在两类宏：

1. **声明宏 (Declarative Macros)**：使用 `macro_rules!` 定义。常用于编写简单的代码模板、简化重复的 match 模式、或者接收变长参数列表。
2. **过程宏 (Procedural Macros)**：接受 Token 流并输出 Token 流。主要有三种类型：
   - **派生宏 (Derive Macros)**：在结构体/枚举上方通过 `#[derive(MyTrait)]` 自动为其实现某个特征。
   - **属性宏 (Attribute Macros)**：创建自定义的属性（如 `#[tokio::main]` 或 `#[route(GET, "/")]`）来重构或封装目标项。
   - **类函数宏 (Function-like Macros)**：外观和调用方式类似于普通的声明宏，但其内部计算完全由 Rust 过程宏代码控制。

---

## 🟡 声明宏 (Declarative Macros) 深度解析

声明宏使用一种类似于 `match` 模式匹配的语法。宏调用会被与不同的分支进行比对，并在匹配成功时执行对应的宏替换。

### 1. 指示符 (Designators)

在声明宏中，宏匹配的参数必须指定类型指示符，告诉编译器如何解析传入的代码片段。常用指示符包括：
- `expr`：匹配一个表达式（如 `2 + 2`）。
- `ident`：匹配一个标识符，如变量名或函数名（如 `my_var`）。
- `ty`：匹配一个类型（如 `i32` 或 `Vec<String>`）。
- `path`：匹配一个路径（如 `std::collections::HashMap`）。
- `block`：匹配一个代码块（用大括号包围的代码段）。

### 2. 重复模式匹配

声明宏最强大的地方在于能够处理变长参数。其重复匹配语法为：`$( ... )间隔符 重复控制符`。
- `*`：表示匹配 0 次或多次。
- `+`：表示匹配 1 次或多次。

```rust
// 定义一个简化版的 map 创建宏
#[macro_export]
macro_rules! my_map {
    // 匹配 my_map!(k1 => v1, k2 => v2, ...) 模式
    // $($key:expr => $val:expr),* 表示匹配以逗号分隔的键值对表达式 0 次或多次
    ( $($key:expr => $val:expr),* ) => {
        {
            let mut temp_map = std::collections::HashMap::new();
            $(
                temp_map.insert($key, $val);
            )*
            temp_map
        }
    };
}

fn main() {
    let scores = my_map! {
        "Alice" => 95,
        "Bob" => 88
    };
    println!("Alice's score: {:?}", scores.get("Alice"));
}
```

### 3. 宏的卫生性 (Macro Hygiene)

Rust 声明宏具有**部分卫生性**（Partial Hygiene）。这意味着在宏内部声明的局部临时变量不会与宏调用处的上下文变量发生命名冲突（符号覆盖），从而保障了代码生成的安全性。然而，声明宏对类型和路径是不卫生的，因此在宏内使用外部类型时，建议使用绝对路径（如 `std::collections::HashMap` 而不是 `HashMap`）。

---

## 🔴 过程宏 (Procedural Macros) 开发指南

过程宏相当于编译器插件。它接受一段 Rust 源代码的 Token 流作为输入，并在编译期运行宏代码，最终输出替换后的 Token 流。

### 1. 过程宏的物理机制

开发过程宏有三个核心规则：
- 过程宏必须定义在一个独立的、特有的 crate 中，该 crate 的 `Cargo.toml` 中必须配置 `proc-macro = true`。
- 过程宏不能在定义它的同一个 crate 中被直接调用，下游项目需要引入该 crate 才能使用该宏。
- 核心物理流为：`fn my_macro(input: TokenStream) -> TokenStream`。

### 2. 核心辅助库

在实际开发中，我们通常需要以下三个核心库来辅助处理 AST 和 Token 流：
- **`proc_macro`**：Rust 标准库，提供基础的 `TokenStream` 类型。
- **`syn`**：将 `TokenStream` 强行解析成高度结构化的抽象语法树（AST），方便我们读取结构体的字段、泛型等元数据。
- **`quote`**：与 `syn` 相反，它允许我们使用类似于普通 Rust 语法的模板编写代码，并将其转换回 `TokenStream`。

### 3. 实战：实现一个自定义 Derive 宏

假设我们要编写一个名为 `Hello` 的派生宏，为任意结构体自动实现包含 `hello_world()` 方法的 `Hello` 特征。

#### 1) 过程宏库的 Cargo.toml 配置

```toml
[package]
name = "hello_macro"
version = "0.1.0"
edition = "2021"

[lib]
proc-macro = true

[dependencies]
syn = { version = "2.0", features = ["full", "extra-traits"] }
quote = "1.0"
proc-macro2 = "1.0"
```

#### 2) `src/lib.rs` 的宏实现代码

```rust
use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, DeriveInput};

#[proc_macro_derive(Hello)]
pub fn hello_macro_derive(input: TokenStream) -> TokenStream {
    // 步骤 1：利用 syn 将原始 TokenStream 解析为 DeriveInput（结构体 AST）
    let ast = parse_macro_input!(input as DeriveInput);

    // 步骤 2：获取结构体的名称标识符
    let name = &ast.ident;

    // 步骤 3：利用 quote! 模板生成目标 Rust 代码的 TokenStream
    let gen = quote! {
        impl #name {
            pub fn hello_world() {
                println!("Hello, World! My name is {}", stringify!(#name));
            }
        }
    };

    // 步骤 4：转换为标准的 proc_macro::TokenStream 返回
    gen.into()
}
```

#### 3) 在下游项目中使用该宏

```rust
use hello_macro::Hello;

#[derive(Hello)]
struct Pancakes;

fn main() {
    // 宏在编译期静态生成了 hello_world() 方法
    Pancakes::hello_world(); // 输出：Hello, World! My name is Pancakes
}
```

---

## 🔴 属性宏与 DSL 构建进阶

除了 Derive 宏外，属性宏（Attribute Macros）能够操纵更广泛的语法单元，比如替换函数的定义体或注入中间件逻辑。

### 属性宏示例架构

相比派生宏，属性宏接收两个 `TokenStream`：一个是属性宏内的参数，另一个宏所贴附的代码块。它是实现 `#[tokio::main]` 或 Web 框架路由抽象如 `#[get("/index")]` 的底层基石。

```rust
#[proc_macro_attribute]
pub fn route(attr: TokenStream, item: TokenStream) -> TokenStream {
    // attr 包含如 "/index", GET 等信息
    // item 包含完整的函数定义语法树
    // 返回重写的包装代码...
    item
}
```

> **工程师格言**：宏是赋予开发者构建领域特定生态的尚方宝剑，但也容易造成阅读困局与超长编译时长。在决定引入过程宏之前，优先审视传统的 Trait 和泛型以及闭包，能否已足以解决当前问题。
