---
title: Rust 函数式编程：闭包与迭代器
hide_title: true
sidebar_label: 闭包与迭代器
---

## 🟢 闭包 (Closures) 的物理实现

Rust 闭包不仅仅是匿名函数，它是自动生成的结构体。

> 🟢 **基础**：掌握基本语法即可阅读 ｜ 🟡 **进阶**：需要有一定 Rust 开发经验 ｜ 🔴 **高级**：面向系统级开发者与性能工程师

### 一、 闭包高级捕获机制与分类

### 1. 自动捕获机制

编译器会根据闭包体对外部变量的使用方式，自动实现以下一个或多个 Trait：

- **`Fn`**：不可变借用外部变量（可以多次调用）。
- **`FnMut`**：可变借用外部变量（可以多次调用，但需要闭包自身可变）。
- **`FnOnce`**：转移外部变量所有权（只能调用一次）。

### 2. 捕获与内存布局

```rust
let base = String::from("prefix_");
let closure = |name: &str| format!("{}{}", base, name); // 借用 base
```

在底层，上述闭包会被编译为类似：

```rust
struct AnonymousClosure<'a> {
    base: &'a String,
}
```

### 3. `move` 关键字与逃逸闭包

当闭包需要逃逸出其定义的作用域（如传入新线程或作为返回值），其捕获的引用必然比原始变量的生命周期更长，此时编译器会强制要求使用 `move` 关键字。

```rust
fn make_greeting(prefix: String) -> impl Fn(&str) -> String {
    // 如果不加 move，prefix 在函数返回后即被销毁，闭包将持有悬垂引用
    // 加上 move 后，prefix 的所有权被转移入闭包内部，生命周期随闭包延续
    move |name| format!("{}, {}!", prefix, name)
}

fn main() {
    let greet = make_greeting("Hello".to_string());
    println!("{}", greet("Alice")); // Hello, Alice!
    println!("{}", greet("Bob"));   // Hello, Bob!
}
```

---

## 🟢 迭代器原理：零成本抽象的典范

Rust 的 `Iterator` 是高度优化的。在大多数情况下，使用迭代器方法（如 `map`, `filter`）生成的机器码，与手动编写的 `for` 循环完全一致，甚至更优（得益于 Bounds Check Elimination）。

### 1. 迭代顺序与消费

```rust
let v = vec![1, 2, 3];
let sum: i32 = v.iter()          // 产生借用迭代器 &i32
                .map(|x| x * 2)  // 适配器 (Adapter)：惰性执行
                .sum();          // 消费者 (Consumer)：触发真正计算
```

### 2. 三种迭代语义

| 获取方法 | 产生的项 | 对应所有权 |
| :--- | :--- | :--- |
| `.iter()` | `&T` | 不可变借用 |
| `.iter_mut()` | `&mut T` | 可变借用 |
| `.into_iter()` | `T` | 所有权转移 (Consumption) |

---

## 🟡 高级迭代器组合链

掌握迭代器链的高级技巧，是写出简洁高性能 Rust 代码的关键。

### 1. `flat_map` vs `filter_map`

- **`filter_map`**：将 `map` 和 `filter` 合并为一步。它接收一个返回 `Option<B>` 的闭包，自动过滤掉 `None` 并解包 `Some` 值，常用于解析可能失败的转换。
- **`flat_map`**：先 `map`，再将结果"压扁"（flatten）一层。当每个元素可以扩展为 0 个或多个新元素时使用。

```rust
fn advanced_iter_demo() {
    let strings = vec!["1", "two", "3", "four", "5"];

    // filter_map：尝试解析为数字，跳过失败项，无需嵌套 match
    let parsed: Vec<i32> = strings
        .iter()
        .filter_map(|s| s.parse::<i32>().ok())
        .collect();
    println!("Parsed numbers: {:?}", parsed); // [1, 3, 5]
}
```

### 2. 收集为高级容器

迭代器的 `collect()` 是极为强大的推导工具。除了收集为 `Vec`，它还可以收集为 `HashMap`，或者配合 `Result` 进行提前返回（早停机制）。

```rust
use std::collections::HashMap;

fn collect_demo() -> Result<(), std::num::ParseIntError> {
    let pairs = vec![("apple", "10"), ("banana", "20"), ("cherry", "not_a_number")];
    
    // 如果想要在包含包含错误的迭代流中早停，只需要将集合类型指定为 Result<_, _> 
    // 下面的代码将会在遇到 "not_a_number" 时立即中断循环，并返回 Err。
    let mapping: Result<HashMap<String, i32>, _> = pairs
        .into_iter()
        .map(|(k, v)| v.parse::<i32>().map(|parsed_v| (k.to_string(), parsed_v)))
        .collect();

    if mapping.is_err() {
         println!("Parse failed due to an invalid integer string.");
    }
    Ok(())
}
```

---

## 🔴 底层优化与零成本抽象揭秘

### 边界检查消除 (Bounds Check Elimination)

传统 `for i in 0..vec.len()` 循环中，由于编译器并不一定能在每一层深层调用中识别出长度不变的推论，每次 `vec[i]` 获取往往会产生显式的边界检查开销 (`if i >= vec.len() { panic!() }`)。

而这正是迭代器的绝对领域。当你使用 `.iter().map().fold()` 模式时，底层的迭代器完全持有内存切片的指针与末端状态。因此在底层汇编中，Rust 编译器（借由 LLVM）可以非常容易地消除所有的边界检查断言，形成极为纯粹的向量化操作（SIMD），这就是为什么习惯使用迭代器的 Rust 程序往往性能会碾压手动索引循环的程序。

### 定制高级内部迭代器 (IntoIterator 规范)

你可以为你自己的数据结构实现 `IntoIterator`。这不仅允许你的类型可被直接应用在 `for _ in _` 语法糖中，并且为你打开了整个 `Itertools` （外部第三方强化库）的强大世界。

```rust
struct Troop {
    soldiers: Vec<String>,
}

// 核心实现，指定返回类型为 IntoIter 以接管所有权
impl IntoIterator for Troop {
    type Item = String;
    type IntoIter = std::vec::IntoIter<Self::Item>;

    fn into_iter(self) -> Self::IntoIter {
        self.soldiers.into_iter()
    }
}
```

> **工程师忠告**：初级开发者编写 `for` 进行强制枚举；终极工程师拥抱 `Iterator` 寻找零成本的多维抽象。请让数据“流”动。
