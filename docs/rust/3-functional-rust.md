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

### 4. Fn, FnMut 与 FnOnce 的解糖本质

在 Rust 标准库中，这三个特征的底层定义（简化版）存在明确的层级与继承关系：

```rust
pub trait FnOnce<Args> {
    type Output;
    extern "rust-call" fn call_once(self, args: Args) -> Self::Output;
}

pub trait FnMut<Args>: FnOnce<Args> {
    extern "rust-call" fn call_mut(&mut self, args: Args) -> Self::Output;
}

pub trait Fn<Args>: FnMut<Args> {
    extern "rust-call" fn call(&self, args: Args) -> Self::Output;
}
```

这说明任何实现了 `Fn` 的闭包都必须实现 `FnMut`，而实现了 `FnMut` 必然实现了 `FnOnce`。
- **`FnOnce`**：`call_once` 参数是 `self`（按值传递）。这导致闭包在执行时其底层的捕获结构体会被消费掉，因而**只能调用一次**。
- **`FnMut`**：`call_mut` 参数是 `&mut self`（可变借用）。这允许闭包修改其捕获的外部变量状态，可以被多次调用，但要求调用它的变量本身被声明为 `mut`。
- **`Fn`**：`call` 参数是 `&self`（只读借用）。仅以只读方式引用外部环境，可以任意无副作用地被多次调用，亦可跨线程并发运行。

### 5. 闭包作为参数与返回值（静动态分发）

由于闭包是一个匿名且唯一的类型，如果需要在函数中传递或返回闭包，必须借助泛型或特征对象。

#### 作为参数

- **静态分发 (Monomorphization)**：使用泛型约束。编译器在编译期会为每一个具体的闭包类型生成独立的函数特化，具有零运行时开销。
- **动态分发 (Trait Object)**：使用指针，在运行期通过虚表（Vtable）派发。

```rust
// 静态分发：通过泛型和 where 子句
fn apply_static<F>(f: F) -> i32
where
    F: Fn(i32) -> i32,
{
    f(10)
}

// 动态分发：使用 dyn 借用特征对象
fn apply_dynamic(f: &dyn Fn(i32) -> i32) -> i32 {
    f(10)
}
```

#### 作为返回值

- **静态分发：使用 `impl Trait`**。编译器会推导匿名闭包的真实大小与类型，但该写法**只能返回单一的闭包类型**（函数内所有返回分支必须生成完全相同的闭包）。
- **动态分发：使用 `Box<dyn Trait>`**。可以配合条件分支返回结构或捕获逻辑完全不同的闭包。

```rust
// 静态分发：只允许返回一种闭包结构
fn returns_closure_static() -> impl Fn(i32) -> i32 {
    |x| x + 1
}

// 动态分发：可借助智能指针返回不同的闭包分支
fn returns_closure_dynamic(cond: bool) -> Box<dyn Fn(i32) -> i32> {
    if cond {
        Box::new(|x| x + 1)
    } else {
        Box::new(|x| x * 2)
    }
}
```

### 6. 闭包在标准库中的应用实例

标准库中的许多集合操作都通过接收闭包作为参数来实现高阶处理。

#### `Iterator::any`

`any` 接收一个闭包，如果迭代器中任意元素满足闭包中的条件，则返回 `true`，否则返回 `false`（具有短路求值特性）：

```rust
fn main() {
    let vec = vec![1, 2, 3];
    // any 接收迭代项的引用，因此 x 的类型为 &i32
    let has_two = vec.iter().any(|&x| x == 2);
    println!("是否存在 2: {}", has_two); // true
}
```

#### `Iterator::find`

`find` 接收一个闭包，在迭代器中查找第一个满足条件的元素。它会返回一个 `Option` 包裹的该元素的借用：

```rust
fn main() {
    let vec = vec![1, 2, 3];
    // find 同样接收迭代项的引用，因为 iter() 产生引用，闭包参数 x 类型为 &&i32
    let found = vec.iter().find(|&&x| x == 2);
    println!("找到的元素: {:?}", found); // Some(2)
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

---

## 🟡 扩展迭代器组合器

### 1. `chain` — 串联两个迭代器

```rust
fn main() {
    let a = [1, 2, 3];
    let b = [4, 5, 6];
    let combined: Vec<i32> = a.iter().chain(b.iter()).copied().collect();
    println!("{:?}", combined); // [1, 2, 3, 4, 5, 6]
}
```

### 2. `zip` — 将两个迭代器逐元素配对

```rust
fn main() {
    let names = ["Alice", "Bob", "Carol"];
    let scores = [95, 80, 88];
    let paired: Vec<_> = names.iter().zip(scores.iter()).collect();
    for (name, score) in &paired {
        println!("{}: {}", name, score);
    }
}
```

### 3. `flatten` — 展平嵌套迭代器

```rust
fn main() {
    let nested = vec![vec![1, 2], vec![3, 4], vec![5]];
    let flat: Vec<i32> = nested.into_iter().flatten().collect();
    println!("{:?}", flat); // [1, 2, 3, 4, 5]
}
```

### 4. `scan` — 带状态的累加转换

`scan` 类似 `fold`，但每一步都产出中间值，而不仅仅是最终结果：

```rust
fn main() {
    // 计算运行前缀和
    let running_sum: Vec<i32> = (1..=5)
        .scan(0, |acc, x| {
            *acc += x;
            Some(*acc)
        })
        .collect();
    println!("{:?}", running_sum); // [1, 3, 6, 10, 15]
}
```

### 5. `peekable` — 向前窥视下一个元素

```rust
fn main() {
    let mut iter = [1, 2, 3].iter().peekable();

    // 查看下一个元素而不消费它
    if let Some(&&next) = iter.peek() {
        println!("下一个是: {}", next); // 1
    }

    // 元素仍然存在
    println!("消费: {}", iter.next().unwrap()); // 1
    println!("消费: {}", iter.next().unwrap()); // 2
}
```

---

## 🟡 为自定义类型实现 IntoIterator

要让你的自定义集合类型支持 `for` 循环，只需实现 `IntoIterator`：

```rust
struct Fibonacci {
    curr: u64,
    next: u64,
}

impl Fibonacci {
    fn new() -> Self {
        Fibonacci { curr: 0, next: 1 }
    }
}

// 实现 Iterator — 定义 next() 逻辑
impl Iterator for Fibonacci {
    type Item = u64;

    fn next(&mut self) -> Option<Self::Item> {
        let result = self.curr;
        let new_next = self.curr + self.next;
        self.curr = self.next;
        self.next = new_next;
        Some(result)
    }
}

// 实现 IntoIterator — 让自定义类型直接在 for 循环中使用
struct FibSequence(usize); // 包含要产出多少项

impl IntoIterator for FibSequence {
    type Item = u64;
    type IntoIter = std::iter::Take<Fibonacci>;

    fn into_iter(self) -> Self::IntoIter {
        Fibonacci::new().take(self.0)
    }
}

fn main() {
    // 直接使用 for 循环
    for fib in FibSequence(8) {
        print!("{} ", fib);
    }
    println!(); // 0 1 1 2 3 5 8 13

    // 享用完整的迭代器组合链
    let sum: u64 = FibSequence(10).into_iter().sum();
    println!("前 10 项斐波那契数之和: {}", sum); // 88
}
```

---

## 🟡 聚合迭代器：`fold`、`reduce` 与 `sum`/`product`

### 1. `fold` — 带初始值的累积

`fold` 接受一个初始值和一个二元闭包，从左到右将所有元素累积：

```rust
fn main() {
    let numbers = vec![1, 2, 3, 4, 5];

    // 等价于 sum()，但更灵活
    let sum = numbers.iter().fold(0, |acc, &x| acc + x);
    println!("总和: {}", sum); // 15

    // 用 fold 构建字符串
    let words = vec!["Hello", "beautiful", "world"];
    let sentence = words.iter().fold(String::new(), |mut acc, &w| {
        if !acc.is_empty() { acc.push(' '); }
        acc.push_str(w);
        acc
    });
    println!("{}", sentence); // "Hello beautiful world"

    // 用 fold 实现 map + filter 的组合
    let even_squares: Vec<i32> = (1..=10).fold(Vec::new(), |mut acc, x| {
        if x % 2 == 0 { acc.push(x * x); }
        acc
    });
    println!("{:?}", even_squares); // [4, 16, 36, 64, 100]

    // 统计最大值（等价于 max()）
    let max = numbers.iter().fold(i32::MIN, |acc, &x| acc.max(x));
    println!("最大值: {}", max); // 5
}
```

### 2. `reduce` — 无初始值的累积

`reduce` 与 `fold` 类似，但以迭代器第一个元素作为初始值，返回 `Option`（空迭代器返回 `None`）：

```rust
fn main() {
    let numbers = vec![1, 2, 3, 4, 5];

    // 求积
    let product = numbers.iter().copied().reduce(|acc, x| acc * x);
    println!("乘积: {:?}", product); // Some(120)

    // 找最长字符串
    let words = vec!["apple", "banana", "kiwi", "strawberry"];
    let longest = words.iter().copied().reduce(|a, b| {
        if a.len() >= b.len() { a } else { b }
    });
    println!("最长: {:?}", longest); // Some("strawberry")

    // 空迭代器返回 None
    let empty: Vec<i32> = vec![];
    println!("空集合 reduce: {:?}", empty.iter().copied().reduce(|a, b| a + b)); // None
}
```

### 3. `fold` vs `reduce` 对比

| 特性 | `fold(init, f)` | `reduce(f)` |
| :--- | :--- | :--- |
| 初始值 | 显式提供 | 第一个元素 |
| 返回类型 | `B`（可与元素不同类型） | `Option<T>` |
| 空迭代器 | 返回初始值 | 返回 `None` |
| 适合场景 | 类型转换、复杂累积 | 同类元素的简单归约 |

---

## 🟡 切片迭代器：`windows`、`chunks`、`split_at`

### 1. `windows` — 滑动窗口

产生所有长度为 `n` 的**连续重叠子切片**：

```rust
fn main() {
    let data = [1, 2, 3, 4, 5];

    // 每次滑动 1 步，窗口大小为 3
    for window in data.windows(3) {
        println!("{:?}", window);
    }
    // [1, 2, 3]
    // [2, 3, 4]
    // [3, 4, 5]

    // 实用：计算相邻元素之差（一阶差分）
    let diffs: Vec<i32> = data.windows(2)
        .map(|w| w[1] - w[0])
        .collect();
    println!("差分: {:?}", diffs); // [1, 1, 1, 1]

    // 检测是否有连续三个递增元素
    let has_increasing = data.windows(3)
        .any(|w| w[0] < w[1] && w[1] < w[2]);
    println!("有连续递增三元: {}", has_increasing); // true
}
```

### 2. `chunks` — 非重叠分块

将切片分成大小为 `n` 的**不重叠块**（最后一块可能不足 `n` 个元素）：

```rust
fn main() {
    let data = [1, 2, 3, 4, 5, 6, 7];

    for chunk in data.chunks(3) {
        println!("{:?}", chunk);
    }
    // [1, 2, 3]
    // [4, 5, 6]
    // [7]        ← 最后一块不足 3 个

    // chunks_exact：只产出完整的块，尾部余数可用 remainder() 获取
    let mut iter = data.chunks_exact(3);
    for chunk in &mut iter {
        println!("完整块: {:?}", chunk);
    }
    println!("余数: {:?}", iter.remainder()); // [7]

    // 实用：批量处理（每批 2 个）
    let tasks = vec!["a", "b", "c", "d", "e"];
    for (batch_idx, batch) in tasks.chunks(2).enumerate() {
        println!("批次 {}: {:?}", batch_idx, batch);
    }
}
```

### 3. `split_at` — 切片拆分

将切片在指定位置拆分为两个不重叠的子切片：

```rust
fn main() {
    let data = [1, 2, 3, 4, 5];

    // 在索引 2 处拆分
    let (left, right) = data.split_at(2);
    println!("left: {:?}", left);  // [1, 2]
    println!("right: {:?}", right); // [3, 4, 5]

    // split_at_mut：可变拆分（借用检查器允许同时持有两个可变子切片）
    let mut arr = [1, 2, 3, 4, 5];
    let (left, right) = arr.split_at_mut(3);
    left[0] = 10;
    right[0] = 40;
    println!("{:?}", arr); // [10, 2, 3, 40, 5]

    // split：按条件分割成多个子切片
    let sentence = "hello world foo bar";
    let words: Vec<&str> = sentence.split(' ').collect();
    println!("{:?}", words); // ["hello", "world", "foo", "bar"]

    // splitn：最多分割 n 次
    let limited: Vec<&str> = sentence.splitn(3, ' ').collect();
    println!("{:?}", limited); // ["hello", "world", "foo bar"]
}
```
