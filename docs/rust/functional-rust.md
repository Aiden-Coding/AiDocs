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
let closure = |name| format!("{}{}", base, name); // 借用 base
```

在底层，上述闭包会被编译为类似：
```rust
struct AnonymousClosure<'a> {
    base: &'a String,
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

> **性能贴士**：在嵌套循环中，优先使用 `Iterator::fold` 或 `Iterator::collect` 而非手动往 `Vec` 中 `push`，这样可以更好地利用编译器的 SIMD 指令和循环展开优化。
