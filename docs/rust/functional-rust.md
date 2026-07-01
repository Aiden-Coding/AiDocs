---
title: Rust 函数式编程：闭包与迭代器
hide_title: true
sidebar_label: 闭包与迭代器
---

## Rust 函数式编程与函数特性

Rust 拥有强大的函数式编程基因。函数是一等公民，闭包可以自动捕获作用域变量，而迭代器则是零成本抽象（Zero-cost Abstraction）的典范。本篇将从普通方法与函数特性出发，深度解析闭包的物理结构、迭代器组合链以及底层优化原理。

> 🟢 **基础**：掌握基本语法即可阅读 ｜ 🟡 **进阶**：需要有一定 Rust 开发经验 ｜ 🔴 **高级**：面向系统级开发者与性能工程师

---

## 🟢 函数进阶特性

除了常规函数，Rust 还支持方法（Methods）和一些特殊的函数设计：

### 1. 结构体方法 (Methods)

方法是在结构体、枚举或特征（Trait）的上下文（即 `impl` 块）中定义的函数。它们的第一个参数总是 `self`，代表调用该方法的实例：

```rust
struct Rectangle {
    width: u32,
    height: u32,
}

impl Rectangle {
    // 关联函数 (Associated Function)：不接收 self，类似于静态方法
    fn new(width: u32, height: u32) -> Self {
        Rectangle { width, height }
    }

    // 方法：接收 &self 以读取实例
    fn area(&self) -> u32 {
        self.width * self.height
    }

    // 方法：接收 &mut self 以修改实例
    fn scale(&mut self, factor: u32) {
        self.width *= factor;
        self.height *= factor;
    }
}
```

### 2. 发散函数 (Diverging Functions)

发散函数是指那些**永远不会返回**的函数。它们使用感叹号 `!` 作为返回值类型（空类型/底类型，Never Type）。常见的有 `panic!`、无限循环 `loop` 或退出进程：

```rust
fn foo() -> ! {
    panic!("This function never returns!");
}
```

发散类型的一个极大妙处在于，**它可以被强制转换为任意其他类型**，因此可以出现在需要任何类型值的匹配分支中：

```rust
fn main() {
    let some_value = Some(5);
    // 如果为 None，调用发散函数，由于它返回 !，可以匹配 i32
    let val: i32 = match some_value {
        Some(x) => x,
        None => panic!("Error!"), 
    };
}
```

### 3. 高阶函数 (HOF)

高阶函数（Higher Order Functions）是指接收一个或多个函数/闭包作为参数，或者返回一个函数/闭包的函数。Rust 支持高度声明式的高阶函数风格：

```rust
fn main() {
    // 计算小于 1000 的奇数平方和
    let sum_of_squared_odd_numbers: u32 =
        (0..).map(|n| n * n)                             // 所有自然数的平方
             .take_while(|&n_squared| n_squared < 1000)  // 取平方小于 1000 的数
             .filter(|&n_squared| n_squared % 2 != 0)    // 过滤出奇数
             .sum();                                     // 求和
    println!("结果: {}", sum_of_squared_odd_numbers);
}
```

---

## 🟢 闭包 (Closures) 的物理实现

Rust 闭包不仅是匿名函数，更是一个在编译期自动生成的结构体。

### 1. 自动捕获机制

编译器会根据闭包体对外部变量的使用方式，自动实现以下一个或多个 Trait：
- **`Fn`**：不可变借用外部变量（可以多次调用，且多个线程可以同时调用）。
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

当闭包需要逃逸出其定义的作用域（如传入新线程或作为函数返回值），其捕获的引用生命周期必须足够长，此时编译器会强制要求使用 `move` 关键字将所有权转移进闭包中：

```rust
fn make_greeting(prefix: String) -> impl Fn(&str) -> String {
    // 加上 move 后，prefix 的所有权被转移入闭包内部，生命周期随闭包延续
    move |name| format!("{}, {}!", prefix, name)
}
```

---

## 🟢 迭代器原理：零成本抽象的典范

Rust 的 `Iterator` 是高度优化的。在大多数情况下，使用迭代器方法（如 `map`, `filter`）生成的机器码，与手动编写的 `for` 循环完全一致，甚至更优。

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

### 1. `flat_map` vs `filter_map`

- **`filter_map`**：过滤掉 `None` 并解包 `Some` 值，常用于解析可能失败的转换。
- **`flat_map`**：先进行 `map`，再将嵌套结果“压扁”一层。

### 2. 收集为高级容器与早停机制

迭代器的 `collect()` 可以配合 `Result` 进行提前返回（早停机制）。如果在迭代流中发生任何错误，`collect` 会立即终止并返回第一个 `Err`：

```rust
fn collect_demo() -> Result<Vec<i32>, std::num::ParseIntError> {
    let strings = vec!["1", "2", "3", "not_a_number"];
    // 只要有解析失败的，整个 collect 将在此早停并返回 Err
    let parsed: Result<Vec<i32>, _> = strings.into_iter()
                                             .map(|s| s.parse::<i32>())
                                             .collect();
    parsed
}
```

---

## 🔴 底层优化与零成本抽象揭秘

### 1. 边界检查消除 (Bounds Check Elimination)

传统 `for i in 0..vec.len()` 循环中，每次 `vec[i]` 获取往往会产生编译期的边界检查断言以确保内存安全。

而在迭代器中，底层的迭代器完全持有内存切片的指针与末端状态。因此在编译为底层汇编时，编译器（借由 LLVM）可以消除所有的边界检查断言，形成极其纯粹的向量化指令操作（SIMD）。

### 2. 定制高级内部迭代器 (IntoIterator 规范)

你可以为自定义类型实现 `IntoIterator`。这不仅允许你的类型可被直接应用在 `for _ in _` 语法糖中，并且为你打开了整个 `Iterator` 链式组合的世界。
