---
title: Rust 宏与元编程系统
hide_title: true
sidebar_label: 宏与元编程
---

## Rust 宏与元编程系统

元编程（Metaprogramming）是指用代码去生成代码的技术。Rust 提供了极度强大且类型安全的**宏系统**（Macros）。与 C/C++ 中简单的文本替换预处理器宏不同，Rust 的宏是基于抽象语法树（AST）和 Token 流进行操作的，能够在编译期进行强大的代码生成、代码重构及领域专用语言（DSL）的设计。

> 🟢 **基础**：掌握基本语法即可阅读 ｜ 🟡 **进阶**：需要有一定 Rust 开发经验 ｜ 🔴 **高级**：面向系统级开发者与性能工程师

---

## 🟢 宏的分类与应用场景

Rust 中主要存在两类宏：

1. **声明宏 (Declarative Macros)**：使用 `macro_rules!` 定义。常用于编写简单的代码模板、简化重复代码 (DRY) 或接收可变参数列表。
2. **过程宏 (Procedural Macros)**：接受 Token 流并输出 Token 流。主要有三种类型：
   - **派生宏 (Derive Macros)**：通过 `#[derive(MyTrait)]` 自动为其实现某个特征。
   - **属性宏 (Attribute Macros)**：创建自定义的属性来重构或封装目标项。
   - **类函数宏 (Function-like Macros)**：外观和调用方式类似于普通的声明宏，但其内部计算完全由 Rust 过程宏代码控制。

---

## 🟡 声明宏 (Declarative Macros) 深度解析

声明宏使用一种类似于 `match` 模式匹配的语法。宏调用会被与不同的分支进行比对，并在匹配成功时执行对应的宏替换。

### 1. 指示符 (Designators)

在声明宏中，宏匹配的参数必须指定类型指示符，告诉编译器如何解析传入的代码片段。常用指示符包括：

| 指示符 | 匹配内容 | 示例 |
| :--- | :--- | :--- |
| `block` | 一个代码块（用大括号包围的代码段） | `{ let x = 1; x }` |
| `expr` | 一个表达式 | `2 + 2`, `func(val)` |
| `ident` | 一个标识符（变量名、函数名等） | `x`, `my_function` |
| `item` | 一个完整的项（函数、结构体、模块等） | `fn foo() {}` |
| `pat` | 一个模式（如模式匹配的分支模式） | `Some(x)`, `_` |
| `path` | 一个路径（通常用于表示类型路径） | `std::collections::HashMap` |
| `stmt` | 一条语句 | `let x = 5;` |
| `tt` | 单个 Token 树（最灵活的匹配单元） | 任意符号或括号包裹的块 |
| `ty` | 一个类型 | `i32`, `Vec<String>` |

### 2. 宏的重载与可变参数

声明宏可以像 `match` 分支一样重载不同的参数结构，并使用 `$( ... )间隔符 重复控制符` 处理变长（可变）参数列表：

- `*`：表示匹配 0 次或多次。
- `+` | 表示匹配 1 次或多次。

```rust
// 定义一个支持重载和可变参数的 calculator 宏
macro_rules! calculate {
    // 分支 1：匹配无参数调用
    () => {
        println!("No expression to calculate!");
    };
    
    // 分支 2：匹配单个表达式
    ($val:expr) => {
        println!("Result: {}", $val);
    };

    // 分支 3：匹配多个以逗号分隔的表达式（可变参数）
    ($($val:expr),+) => {
        $(
            println!("Result: {}", $val);
        )+
    };
}

fn main() {
    calculate!();             // 触发分支 1
    calculate!(1 + 2);         // 触发分支 2
    calculate!(1 + 2, 3 * 4);  // 触发分支 3
}
```

### 3. DRY (Don't Repeat Yourself) 原则实践

声明宏非常适合自动为多种不同类型生成相似的方法或特征实现，避免手动编写大量样板代码：

```rust
struct AddEngine;
struct SubEngine;

// 定义一个宏，自动为传入的引擎类实现特定的运算特征
macro_rules! impl_op {
    ($engine:ty, $method:ident, $op:tt) => {
        impl $engine {
            pub fn run(&self, a: i32, b: i32) -> i32 {
                a $op b
            }
        }
    };
}

// 自动实现 run 方法
impl_op!(AddEngine, run, +);
impl_op!(SubEngine, run, -);
```

### 4. DSL (领域专用语言) 构建

我们可以通过宏自定义一套极其特殊的语法，直接解析并编译看似非 Rust 的代码片段：

```rust
// 定义一个微型命令式 DSL 宏
macro_rules! my_dsl {
    (print $val:expr) => {
        println!("{}", $val);
    };
    (add $a:expr to $b:expr) => {
        println!("{} + {} = {}", $a, $b, $a + $b);
    };
}

fn main() {
    my_dsl!(print "Running DSL...");
    my_dsl!(add 10 to 20); // 输出: 10 + 20 = 30
}
```

---

## 🔴 过程宏 (Procedural Macros) 开发指南

过程宏相当于编译器插件。它接受一段 Rust 源代码的 Token 流作为输入，并在编译期运行宏代码，最终输出替换后的 Token 流。过程宏必须定义在一个独立的、特有的 crate 中，该 crate 的 `Cargo.toml` 中必须配置 `proc-macro = true`。

### 自定义 Derive 宏实现

下面是一个经典的自定义派生宏的实现架构：

```rust
use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, DeriveInput};

#[proc_macro_derive(Hello)]
pub fn hello_macro_derive(input: TokenStream) -> TokenStream {
    // 1. 利用 syn 将原始 TokenStream 解析为结构体 AST
    let ast = parse_macro_input!(input as DeriveInput);

    // 2. 获取结构体的名称标识符
    let name = &ast.ident;

    // 3. 利用 quote! 模板生成目标 Rust 代码的 TokenStream
    let gen = quote! {
        impl #name {
            pub fn hello_world() {
                println!("Hello, World! My name is {}", stringify!(#name));
            }
        }
    };

    // 4. 转换为标准的 proc_macro::TokenStream 返回
    gen.into()
}
```

---

## 🔴 属性宏与类函数宏

除了派生宏，属性宏（Attribute Macros）和类函数宏（Function-like Macros）可以处理更加复杂的逻辑定义。

### 属性宏示例

属性宏接收两个 `TokenStream`：一个是属性本身（如路由参数），另一个是该属性附着的代码实体：

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
