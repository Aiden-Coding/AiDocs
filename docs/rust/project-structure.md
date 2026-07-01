---
title: Rust 项目结构与模块化
hide_title: true
sidebar_label: 项目结构与模块化
sidebar_position: 2
---

## Rust 项目结构与模块化

随着项目规模的增长，我们需要使用模块来组织代码，并在文件系统上进行清晰的分层。本篇将详细介绍 Rust 中的模块系统、可见性控制、Cargo 包管理器的进阶机制以及属性（Attributes）的应用。

> 🟢 **基础**：掌握基本语法即可阅读。

---

## 📂 Rust 模块系统 (Modules)

模块系统允许我们将代码划分为逻辑单元（Modules），并显式控制其**可见性**（Visibility）。

### 1. 可见性控制

在 Rust 中，默认所有的项（如函数、结构体、类型、常量）都是**私有的**（Private）。要使其对外部可见，必须使用 `pub` 关键字。

```rust
// 一个名为 `my_mod` 的模块
mod my_mod {
    // 模块中的项默认是私有的
    fn private_function() {
        println!("called `my_mod::private_function()`");
    }

    // 使用 `pub` 关键字使其公开
    pub fn function() {
        println!("called `my_mod::function()`");
    }

    // 我们可以使用 `pub(crate)` 限定该项仅在当前 crate 内可见
    pub(crate) fn crate_visible_function() {
        println!("called `my_mod::crate_visible_function()`");
    }

    // 嵌套模块
    pub mod nested {
        pub fn function() {
            println!("called `my_mod::nested::function()`");
        }
    }
}
```

### 2. 结构体与枚举的可见性差异

- **结构体**：结构体的字段默认是私有的，即使结构体本身是 `pub` 的。我们需要在各个需要公开的字段前单独添加 `pub`：

  ```rust
  pub struct ClosedBox<T> {
      pub contents: T, // 公开字段
      metadata: String, // 私有字段
  }
  ```

- **枚举**：如果一个枚举被声明为 `pub`，那么它所有的变体（Variants）都会自动变为 `pub`，不需要（也不能）在变体前加 `pub`：

  ```rust
  pub enum Role {
      Admin, // 自动为 pub
      User,  // 自动为 pub
  }
  ```

### 3. `use` 声明

使用 `use` 关键字可以将特定的路径引入到当前作用域中，甚至可以使用 `as` 关键字进行重命名：

```rust
use deeply::nested::function as other_function;

fn main() {
    other_function(); // 相当于调用 deeply::nested::function()
}
```

### 4. `super` 与 `self`

- **`self`**：表示当前的模块。
- **`super`**：表示父级模块（可以方便地用于调用父级作用域的同名项，或在写测试模块时引用父模块定义）。

```rust
fn function() {
    println!("called `function()`");
}

mod cool {
    pub fn function() {
        println!("called `cool::function()`");
    }

    pub fn indirect_call() {
        // 访问当前模块中的 function
        self::function();

        // 访问父模块中的 function
        super::function();
    }
}
```

### 5. 文件分层管理 (File Hierarchy)

对于大型模块，将其内容全部写在一个源文件中会难以维护。Rust 允许我们将模块拆分到不同的文件中。

假设我们在 `main.rs` 中声明模块 `mod my_mod;`：

```rust
// main.rs
mod my_mod; // 编译器会寻找 my_mod.rs 或 my_mod/mod.rs 文件

fn main() {
    my_mod::hello();
}
```

在同级目录下，我们创建 `my_mod.rs` 文件：

```rust
// my_mod.rs
pub fn hello() {
    println!("Hello from my_mod file!");
}
```

---

## 📦 Crate 与 Cargo

- **Crate**：是 Rust 的编译单元。Crate 可以是一个二进制可执行文件（Binary Crate，如 `main.rs` 作为入口），也可以是一个库（Library Crate，以 `lib.rs` 作为入口）。
- **Cargo**：是 Rust 的包管理器，用于自动下载和构建项目依赖。

### 1. 依赖管理 (`Cargo.toml`)

我们可以直接在 `Cargo.toml` 的 `[dependencies]` 下声明依赖：

```toml
[dependencies]
# 1. 声明来自 crates.io 托管站点的依赖与对应版本
serde = "1.0"

# 2. 声明来自本地路径的依赖
my_local_utils = { path = "../my_local_utils" }

# 3. 声明来自 Git 仓库的依赖
tokio = { git = "https://github.com/tokio-rs/tokio", branch = "master" }
```

### 2. 构建脚本 (Build Scripts)

如果在编译前需要执行一些特殊的构建任务（例如编译 C 语言底层库、生成代码或进行系统级探针），可以在项目根目录下创建 `build.rs`。Cargo 在编译当前项目前会自动编译并执行该脚本。

```rust
// build.rs
fn main() {
    // 告诉 Cargo 在 src/hello.c 发生改变时重新运行此构建脚本
    println!("cargo:rerun-if-changed=src/hello.c");
}
```

---

## 🏷️ 属性 (Attributes)

属性是应用于某些模块、crate 或项的元数据（Metadata），它们使用 `#[attribute]` 声明，或者使用 `#![attribute]`（带感叹号，作用于当前整个文件或模块）。

### 1. 条件编译 `#[cfg(...)]`

通过 `cfg` 属性，我们可以控制代码仅在满足特定编译条件时才进行编译：

```rust
// 仅在目标操作系统为 linux 时编译此函数
#[cfg(target_os = "linux")]
fn are_you_on_linux() {
    println!("Yes, this is Linux!");
}

// 仅在执行测试（cargo test）时编译此模块
#[cfg(test)]
mod tests {
    // ...
}
```

#### 自定义条件编译

除了系统默认提供的 `target_os` 等条件外，我们还可以通过自定义条件标签来控制编译。

在代码中，我们可以使用自定义标志：

```rust
#[cfg(some_custom_flag)]
fn conditional_function() {
    println!("仅在 some_custom_flag 启用时，该函数才会被编译！");
}
```

在编译时，我们可以通过传参启用该标志：

- 使用 `rustc` 编译时：`rustc --cfg some_custom_flag main.rs`。
- 使用 Cargo 时：在 `Cargo.toml` 中配置 `[features]`，或者在运行时通过环境变量/参数传递。

### 2. 常见属性

- `#[allow(dead_code)]`：允许存在未使用的代码，编译器不会对此进行警告。
- `#[derive(...)]`：为类型自动派生常用特征（如 `Clone`, `Debug` 等）。
- `#[inline]`：向编译器建议将该函数进行内联展开，以优化性能。

---

## 🌐 兼容性与补充

### 1. 原始标识符 (Raw Identifiers)

Rust 拥有许多保留字（关键字），例如 `try`、`match`、`fn` 等。如果你的外部底层库（或者老版本代码）中使用了这些关键字作为函数或变量名，你可以使用 `r#` 原始标识符来绕过编译限制：

```rust
fn r#match() {
    println!("This function is named `match`!");
}

fn main() {
    r#match(); // 正常调用
}
```

### 2. 文档注释 (Doc Comments)

Rust 支持使用特定的文档注释，运行 `cargo doc --open` 可以自动生成 HTML 文档：

- `///`：为它之后的项生成文档。
- `//!`：为包含它的项（如整个模块或 Crate 文件头部）生成文档。

```rust
//! # My Awesome Utility Crate
//!
//! 提供了一系列基础的数学运算。

/// 计算两个整数的和。
///
/// # 示例
///
/// ```
/// let result = hello_rust::add(2, 3);
/// assert_eq!(result, 5);
/// ```
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}
```

> [!NOTE]
> **下一步建议**：掌握了项目的组织与分层设计后，请继续阅读 [所有权与生命周期核心](ownership-lifetimes.md)，深入了解 Rust 在处理复杂模块架构时的内存所有权与生命周期治理。
