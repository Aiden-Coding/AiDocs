---
title: Rust 函数式编程：闭包与迭代器
hide_title: true
sidebar_label: 闭包与迭代器
---

## Rust 函数式编程：闭包与迭代器

Rust 并非纯函数式语言，但它深度吸收了函数式编程的精髓。通过**惰性求值（Lazy Evaluation）**与**高效闭包**，开发者可以用声明式（Declarative）的代码风格写出命令式（Imperative）的执行效率。

---

## 迭代器原理：零成本抽象的典范

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

## 高级迭代器组合链

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

    // flat_map：将每行文字拆分为单词
    let sentences = vec!["hello world", "foo bar baz"];
    let words: Vec<&str> = sentences
        .iter()
        .flat_map(|s| s.split_whitespace())
        .collect();
    println!("Words: {:?}", words); // ["hello", "world", "foo", "bar", "baz"]
}
```

### 2. 用 `by_ref()` 防止迭代器被提前消费

当需要在同一个迭代器上执行多个阶段性的消费操作时，`by_ref()` 允许你借用迭代器，避免所有权被提前转移。

```rust
fn by_ref_demo() {
    let mut iter = vec![1, 2, 3, 4, 5, 6].into_iter();

    // 使用 by_ref() 借用迭代器，只消费前 3 个元素
    let first_three: Vec<i32> = iter.by_ref().take(3).collect();
    println!("First three: {:?}", first_three); // [1, 2, 3]

    // iter 的所有权未被转移，可以继续使用
    let rest: Vec<i32> = iter.collect();
    println!("Rest: {:?}", rest); // [4, 5, 6]
}
```

---

## 闭包 (Closures) 的物理实现

Rust 闭包不仅仅是匿名函数，它是自动生成的结构体。

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

## 高阶生命周期限定 (HRTB)

当你需要定义一个接受闭包且该闭包涉及引用的函数时，可能会遇到 `for<'a>` 语法。这保证了闭包能处理**任意**生命周期的参数，而不仅仅是某个特定生命周期。

```rust
fn apply<F>(f: F)
where
    for<'a> F: Fn(&'a str),
{
    f("dynamic_string");
}
```

---

## 模式匹配的函数式应用

现代 Rust 将函数式编程的精髓进一步融入模式匹配语法中，使代码更加简洁直观。

### 1. `let else` 语句

`let else` 提供了一种"提前返回"的优雅写法，用来替代 `if let ... { return; }` 的冗余写法，尤其适合 Option/Result 的快速解包。

```rust
fn process(maybe_val: Option<i32>) -> i32 {
    // 若 maybe_val 为 None，直接执行 else 分支（必须是 diverging 表达式，如 return/panic）
    let Some(val) = maybe_val else {
        return -1;
    };

    // 进入此处时，val 已经解包完毕，类型为 i32
    val * 2
}
```

### 2. `matches!` 宏

`matches!` 宏可以将 `match` 表达式简化为一行布尔表达式，尤其适合在 `filter` 等场合进行枚举变体判断。

```rust
#[derive(Debug)]
enum Status {
    Active,
    Pending,
    Disabled,
}

fn main() {
    let statuses = vec![Status::Active, Status::Pending, Status::Active, Status::Disabled];

    // 使用 matches! 代替 match/if let 进行过滤
    let active_count = statuses.iter().filter(|s| matches!(s, Status::Active)).count();
    println!("Active count: {}", active_count); // 2
}
```

> [!TIP]
> **性能贴士**：在嵌套循环中，优先使用 `Iterator::fold` 或 `Iterator::collect` 而非手动往 `Vec` 中 `push`，这样可以更好地利用编译器的 SIMD 指令和循环展开优化。
