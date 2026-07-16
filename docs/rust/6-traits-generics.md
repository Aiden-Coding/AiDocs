---
title: 特征与泛型
hide_title: true
sidebar_label: 特征与泛型
sidebar_position: 6
---

# 特征与泛型

特征（Traits）是 Rust 实现抽象的核心机制，类似于其他语言中的接口。泛型则让我们能够编写适用于多种类型的代码。

---

## 特征（Traits）

### 定义特征

特征定义了某个特定类型拥有且可以与其他类型共享的功能：

```rust
trait Summary {
    fn summarize(&self) -> String;
}
```

### 为类型实现特征

```rust
struct NewsArticle {
    headline: String,
    location: String,
    author: String,
    content: String,
}

impl Summary for NewsArticle {
    fn summarize(&self) -> String {
        format!("{}, by {} ({})", self.headline, self.author, self.location)
    }
}

struct Tweet {
    username: String,
    content: String,
    reply: bool,
    retweet: bool,
}

impl Summary for Tweet {
    fn summarize(&self) -> String {
        format!("{}: {}", self.username, self.content)
    }
}
```

### 默认实现

可以为特征方法提供默认实现：

```rust
trait Summary {
    fn summarize_author(&self) -> String;

    fn summarize(&self) -> String {
        format!("(Read more from {}...)", self.summarize_author())
    }
}
```

### 特征作为参数

```rust
fn notify(item: &impl Summary) {
    println!("Breaking news! {}", item.summarize());
}

// 等价的 trait bound 语法
fn notify<T: Summary>(item: &T) {
    println!("Breaking news! {}", item.summarize());
}
```

### 多个特征约束

```rust
use std::fmt::{Debug, Display};

fn compare_prints<T: Debug + Display>(t: &T) {
    println!("Debug: {:?}", t);
    println!("Display: {}", t);
}

// 使用 where 子句使代码更清晰
fn some_function<T, U>(t: &T, u: &U) -> i32
where
    T: Display + Clone,
    U: Clone + Debug,
{
    // 函数体
    42
}
```

### 返回实现了特征的类型

```rust
fn returns_summarizable() -> impl Summary {
    Tweet {
        username: String::from("horse_ebooks"),
        content: String::from("of course, as you probably already know, people"),
        reply: false,
        retweet: false,
    }
}
```

---

## 派生（Derive）

编译器能够提供一些基本特征的默认实现，可以通过 `#[derive]` 属性自动派生：

```rust
#[derive(Debug, Clone, PartialEq)]
struct Point {
    x: i32,
    y: i32,
}

fn main() {
    let p1 = Point { x: 1, y: 2 };
    let p2 = p1.clone();
    
    println!("{:?}", p1);  // Debug
    println!("p1 == p2: {}", p1 == p2);  // PartialEq
}
```

常用的可派生特征：

- `Debug` - 格式化输出用于调试
- `Clone` - 通过拷贝创建值
- `Copy` - 通过简单的位拷贝创建值
- `PartialEq` - 相等性比较
- `Eq` - 完全相等性比较
- `PartialOrd` - 排序比较
- `Ord` - 完全排序比较
- `Default` - 创建类型的默认值

---

## 运算符重载

Rust 允许通过实现特定的特征来重载运算符：

```rust
use std::ops::Add;

#[derive(Debug, PartialEq)]
struct Point {
    x: i32,
    y: i32,
}

impl Add for Point {
    type Output = Point;

    fn add(self, other: Point) -> Point {
        Point {
            x: self.x + other.x,
            y: self.y + other.y,
        }
    }
}

fn main() {
    let p1 = Point { x: 1, y: 2 };
    let p2 = Point { x: 3, y: 4 };
    let p3 = p1 + p2;
    
    println!("{:?}", p3); // Point { x: 4, y: 6 }
}
```

---

## Drop 特征

`Drop` 特征用于在值离开作用域时执行一些代码：

```rust
struct CustomSmartPointer {
    data: String,
}

impl Drop for CustomSmartPointer {
    fn drop(&mut self) {
        println!("Dropping CustomSmartPointer with data `{}`!", self.data);
    }
}

fn main() {
    let c = CustomSmartPointer {
        data: String::from("my stuff"),
    };
    let d = CustomSmartPointer {
        data: String::from("other stuff"),
    };
    println!("CustomSmartPointers created.");
}
// 输出：
// CustomSmartPointers created.
// Dropping CustomSmartPointer with data `other stuff`!
// Dropping CustomSmartPointer with data `my stuff`!
```

---

## 泛型（Generics）

### 泛型函数

```rust
fn largest<T: PartialOrd>(list: &[T]) -> &T {
    let mut largest = &list[0];

    for item in list {
        if item > largest {
            largest = item;
        }
    }

    largest
}

fn main() {
    let number_list = vec![34, 50, 25, 100, 65];
    let result = largest(&number_list);
    println!("The largest number is {}", result);

    let char_list = vec!['y', 'm', 'a', 'q'];
    let result = largest(&char_list);
    println!("The largest char is {}", result);
}
```

### 泛型结构体

```rust
struct Point<T> {
    x: T,
    y: T,
}

impl<T> Point<T> {
    fn x(&self) -> &T {
        &self.x
    }
}

// 只为特定类型实现方法
impl Point<f32> {
    fn distance_from_origin(&self) -> f32 {
        (self.x.powi(2) + self.y.powi(2)).sqrt()
    }
}
```

### 泛型枚举

```rust
enum Option<T> {
    Some(T),
    None,
}

enum Result<T, E> {
    Ok(T),
    Err(E),
}
```

### 多类型参数

```rust
struct Point<T, U> {
    x: T,
    y: U,
}

impl<T, U> Point<T, U> {
    fn mixup<V, W>(self, other: Point<V, W>) -> Point<T, W> {
        Point {
            x: self.x,
            y: other.y,
        }
    }
}

fn main() {
    let p1 = Point { x: 5, y: 10.4 };
    let p2 = Point { x: "Hello", y: 'c' };

    let p3 = p1.mixup(p2);

    println!("p3.x = {}, p3.y = {}", p3.x, p3.y);
}
```

---

## 类型转换特征

### From 和 Into

`From` 和 `Into` 是配对的类型转换特征：

```rust
#[derive(Debug)]
struct Number {
    value: i32,
}

impl From<i32> for Number {
    fn from(item: i32) -> Self {
        Number { value: item }
    }
}

fn main() {
    let num = Number::from(30);
    println!("{:?}", num);

    // Into 会自动从 From 实现中获得
    let int = 5;
    let num: Number = int.into();
    println!("{:?}", num);
}
```

### TryFrom 和 TryInto

用于可能失败的转换：

```rust
use std::convert::TryFrom;
use std::convert::TryInto;

#[derive(Debug, PartialEq)]
struct EvenNumber(i32);

impl TryFrom<i32> for EvenNumber {
    type Error = ();

    fn try_from(value: i32) -> Result<Self, Self::Error> {
        if value % 2 == 0 {
            Ok(EvenNumber(value))
        } else {
            Err(())
        }
    }
}

fn main() {
    // TryFrom
    assert_eq!(EvenNumber::try_from(8), Ok(EvenNumber(8)));
    assert_eq!(EvenNumber::try_from(5), Err(()));

    // TryInto
    let result: Result<EvenNumber, ()> = 8i32.try_into();
    assert_eq!(result, Ok(EvenNumber(8)));
    
    let result: Result<EvenNumber, ()> = 5i32.try_into();
    assert_eq!(result, Err(()));
}
```

### ToString 和 FromStr

```rust
use std::fmt;

struct Circle {
    radius: i32
}

impl fmt::Display for Circle {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "Circle of radius {}", self.radius)
    }
}

fn main() {
    let circle = Circle { radius: 6 };
    println!("{}", circle.to_string()); // ToString 自动实现
}

// FromStr 示例
use std::str::FromStr;

#[derive(Debug, PartialEq)]
struct Point {
    x: i32,
    y: i32
}

impl FromStr for Point {
    type Err = std::num::ParseIntError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let coords: Vec<&str> = s.trim_matches(|p| p == '(' || p == ')')
                                 .split(',')
                                 .collect();

        let x_fromstr = coords[0].parse::<i32>()?;
        let y_fromstr = coords[1].parse::<i32>()?;

        Ok(Point { x: x_fromstr, y: y_fromstr })
    }
}

fn main() {
    let p = Point::from_str("(1,2)");
    assert_eq!(p.unwrap(), Point{ x: 1, y: 2 })
}
```

---

## 关联类型

关联类型是一个将类型占位符与特征关联起来的方式：

```rust
trait Iterator {
    type Item;  // 关联类型

    fn next(&mut self) -> Option<Self::Item>;
}

struct Counter {
    count: u32,
}

impl Iterator for Counter {
    type Item = u32;  // 指定关联类型

    fn next(&mut self) -> Option<Self::Item> {
        self.count += 1;

        if self.count < 6 {
            Some(self.count)
        } else {
            None
        }
    }
}
```

---

## 特征对象与动态分发

### 静态分发 vs 动态分发

**静态分发**（使用泛型）：

```rust
fn print_it<T: Display>(item: T) {
    println!("{}", item);
}
```

**动态分发**（使用特征对象）：

```rust
fn print_it(item: &dyn Display) {
    println!("{}", item);
}
```

### 特征对象

```rust
trait Draw {
    fn draw(&self);
}

struct Button {
    label: String,
}

impl Draw for Button {
    fn draw(&self) {
        println!("Drawing button: {}", self.label);
    }
}

struct TextField {
    text: String,
}

impl Draw for TextField {
    fn draw(&self) {
        println!("Drawing text field: {}", self.text);
    }
}

fn main() {
    let components: Vec<Box<dyn Draw>> = vec![
        Box::new(Button { label: String::from("OK") }),
        Box::new(TextField { text: String::from("Enter text") }),
    ];

    for component in components.iter() {
        component.draw();
    }
}
```

### 特征对象安全 (Object Safety)

并非所有的特征都能够作为特征对象（如 `Box<dyn Draw>`）使用。只有**对象安全（Object Safe）**的特征才能拥有动态虚表并在运行时实例化特征对象。

如果一个特征符合以下两个核心规则，它就是对象安全的：
1. **特征方法的所有返回类型都不能是 `Self`**（因为特征对象在运行期类型已被擦除，无法预知 `Self` 的真实大小和实际类型）。
2. **特征方法不能有任何泛型类型参数**（因为泛型方法要求在编译期进行 Monomorphization 特化展开，而在运行期使用特征对象时，编译器无法得知究竟该特化哪一个泛型单态版）。

#### 破坏对象安全的常见特征

例如标准库的 `Clone` 特征是非对象安全的，因为其定义中包含返回 `Self` 的方法：`fn clone(&self) -> Self;`

```rust
// ❌ 编译报错：特征 `Clone` 不能作为特征对象使用
// let my_clonable: Box<dyn Clone>;
```

#### 局部方法豁免：`where Self: Sized`

如果特征中某个必要的方法返回了 `Self`，但你仍然希望该特征可以被用作特征对象，可以在该非安全的方法后附加 `where Self: Sized` 约束。这会通知编译器在构建特征对象虚表时，**直接排除此方法**，从而使特征整体重获对象安全性：

```rust
trait MyWidget {
    // 1. 符合对象安全规则，可以正常参与动态分发
    fn render(&self);

    // 2. 本方法由于返回 Self，默认会导致特征非对象安全。
    // 通过添加 `where Self: Sized` 约束，将其从特征对象中隔离。
    fn make_copy(&self) -> Self
    where
        Self: Sized;
}

fn render_widgets(widgets: Vec<Box<dyn MyWidget>>) {
    for widget in widgets {
        widget.render(); // ✅ 正常运行
        // widget.make_copy(); // ❌ 编译报错：特征对象无法调用此方法
    }
}
```

---

## 高级特性

### Supertraits

一个特征可以依赖另一个特征：

```rust
use std::fmt;

trait OutlinePrint: fmt::Display {
    fn outline_print(&self) {
        let output = self.to_string();
        let len = output.len();
        println!("{}", "*".repeat(len + 4));
        println!("*{}*", " ".repeat(len + 2));
        println!("* {} *", output);
        println!("*{}*", " ".repeat(len + 2));
        println!("{}", "*".repeat(len + 4));
    }
}

struct Point {
    x: i32,
    y: i32,
}

impl fmt::Display for Point {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "({}, {})", self.x, self.y)
    }
}

impl OutlinePrint for Point {}

fn main() {
    let p = Point { x: 1, y: 3 };
    p.outline_print();
}
```

### 孤儿规则 (Orphan Rule) 与 Newtype 模式

#### 1. 什么是孤儿规则？

Rust 强制实施一个非常严格的类型系统约束，称为**孤儿规则（Orphan Rule）**：在为类型实现特征时，**特征（Trait）或类型（Type）必须至少有一个定义在当前 Crate 中**。

- **允许**：为你本地定义的结构体 `NewsArticle` 实现标准库的 `Display` 特征。
- **允许**：为标准库的 `Vec<T>` 类型实现你本地定义的 `Summary` 特征。
- **禁止**：为标准库的 `Vec<T>` 类型实现标准库的 `Display` 特征。因为两者都定义在外部标准库中。

这一规则能够彻底避免多个独立的第三方库在不知道彼此存在的情况下，为同一个外部类型实现相同的外部特征（即命名冲突或特征实现冲突），从而保证了整个 Rust 依赖生态的可合并与安全集成。

#### 2. 绕过限制：Newtype 模式

如果确实需要为外部类型实现外部特征，唯一的机制是使用 **Newtype 模式**：定义一个元组结构体，在本地 Crate 中包装那个外部类型，使得这个包裹后的元组结构体成为本地定义的新类型，从而完美规避孤儿规则。

```rust
use std::fmt;

// Vec<String> 和 Display 特征都属于外部库，无法直接结合
// Wrapper 是在本地 Crate 定义的元组结构体，包装了 Vec<String>
struct Wrapper(Vec<String>);

impl fmt::Display for Wrapper {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "[{}]", self.0.join(", "))
    }
}

fn main() {
    let w = Wrapper(vec![String::from("hello"), String::from("world")]);
    println!("w = {}", w);
}
```

---

## 实践示例

### 示例 1：实现一个通用的容器

```rust
use std::fmt::Display;

struct Pair<T> {
    first: T,
    second: T,
}

impl<T> Pair<T> {
    fn new(first: T, second: T) -> Self {
        Self { first, second }
    }
}

impl<T: Display + PartialOrd> Pair<T> {
    fn cmp_display(&self) {
        if self.first >= self.second {
            println!("The largest member is first = {}", self.first);
        } else {
            println!("The largest member is second = {}", self.second);
        }
    }
}

fn main() {
    let pair = Pair::new(10, 20);
    pair.cmp_display();
}
```

### 示例 2：构建插件系统

```rust
trait Plugin {
    fn name(&self) -> &str;
    fn execute(&self);
}

struct LoggerPlugin;

impl Plugin for LoggerPlugin {
    fn name(&self) -> &str {
        "Logger"
    }
    
    fn execute(&self) {
        println!("Logging data...");
    }
}

struct CachePlugin;

impl Plugin for CachePlugin {
    fn name(&self) -> &str {
        "Cache"
    }
    
    fn execute(&self) {
        println!("Caching data...");
    }
}

fn run_plugins(plugins: Vec<Box<dyn Plugin>>) {
    for plugin in plugins {
        println!("Running plugin: {}", plugin.name());
        plugin.execute();
    }
}

fn main() {
    let plugins: Vec<Box<dyn Plugin>> = vec![
        Box::new(LoggerPlugin),
        Box::new(CachePlugin),
    ];
    
    run_plugins(plugins);
}
```

---

> [!TIP]
> **下一步**：掌握了特征和泛型后，继续学习 [错误处理](7-error-handling.md)，了解如何优雅地处理程序中的错误。

---

## 泛型关联类型 (GAT - Generic Associated Types)

Rust 1.65 稳定了**泛型关联类型（Generic Associated Types，GAT）**。GAT 允许在 trait 的关联类型上添加泛型参数（包括生命周期），解决了之前无法在 trait 中表达带生命周期关联类型的限制。

### 经典用例：带生命周期的迭代器

```rust
// GAT 允许关联类型携带生命周期参数
trait LendingIterator {
    type Item<'a> where Self: 'a; // 关联类型带有生命周期参数 'a

    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>>;
}

// 一个逐行借用文件内容的迭代器（不复制字符串）
struct LineReader {
    lines: Vec<String>,
    index: usize,
}

impl LendingIterator for LineReader {
    type Item<'a> = &'a str where Self: 'a;

    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> {
        if self.index < self.lines.len() {
            let line = &self.lines[self.index];
            self.index += 1;
            Some(line)
        } else {
            None
        }
    }
}

fn main() {
    let mut reader = LineReader {
        lines: vec!["hello".to_string(), "world".to_string()],
        index: 0,
    };
    while let Some(line) = reader.next() {
        println!("{}", line);
    }
}
```

---

## 孤儿规则 (Orphan Rule) 与 Newtype 模式

### 孤儿规则

Rust 的**孤儿规则（Orphan Rule）**规定：要为类型 `T` 实现 trait `Tr`，则 `T` 或 `Tr` 中**至少有一个**必须在当前 crate 中定义。这防止了不同 crate 之间对同一类型的 trait 实现产生冲突。

```rust
// ❌ 不允许：为外部类型实现外部 trait
// impl std::fmt::Display for Vec<i32> { ... }
// Display 和 Vec 都不属于当前 crate，违反孤儿规则。

// ✅ 允许：为自定义类型实现外部 trait
struct Wrapper(Vec<i32>);

impl std::fmt::Display for Wrapper {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        write!(f, "[{}]", self.0.iter().map(|x| x.to_string()).collect::<Vec<_>>().join(", "))
    }
}

fn main() {
    let w = Wrapper(vec![1, 2, 3]);
    println!("{}", w); // [1, 2, 3]
}
```

### Newtype 模式

**Newtype 模式**（如上面的 `Wrapper`）是绕过孤儿规则的标准做法，同时还带来额外好处：
- 为已有类型实现外部 trait（绕过孤儿规则）。
- 隐藏内部实现细节，暴露更清晰的公开 API。
- 利用类型系统区分语义相同但含义不同的值（如 `Meters` vs `Feet`）。

```rust
// 用 Newtype 区分单位，防止混用
struct Meters(f64);
struct Feet(f64);

impl Meters {
    fn to_feet(&self) -> Feet {
        Feet(self.0 * 3.28084)
    }
}

fn build_wall(height: Meters) {
    println!("墙高 {} 米", height.0);
}

fn main() {
    let height = Meters(2.5);
    let height_in_feet = height.to_feet();

    build_wall(Meters(2.5));
    // build_wall(height_in_feet); // ❌ 编译报错：类型不匹配，防止单位混用
}
```

---

## 父 Trait 与 Supertrait

如果一个 trait 的实现依赖于另一个 trait 的功能，可以通过 **supertrait** 表达这种依赖：

```rust
use std::fmt;

// OutlinePrint 要求实现者必须同时实现 fmt::Display
trait OutlinePrint: fmt::Display {
    fn outline_print(&self) {
        // 可以直接使用 Display 的功能，因为 supertrait 约束保证了它存在
        let output = self.to_string();
        let len = output.len();
        println!("{}", "*".repeat(len + 4));
        println!("* {} *", output);
        println!("{}", "*".repeat(len + 4));
    }
}

struct Point {
    x: i32,
    y: i32,
}

// 先实现 Display（supertrait 要求）
impl fmt::Display for Point {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "({}, {})", self.x, self.y)
    }
}

// 再实现 OutlinePrint
impl OutlinePrint for Point {}

fn main() {
    let p = Point { x: 1, y: 3 };
    p.outline_print();
}
```

---

## `Index` 与 `IndexMut`：自定义 `[]` 运算符

实现 `Index` 和 `IndexMut` trait 可以让自定义类型支持 `container[key]` 语法：

```rust
use std::ops::{Index, IndexMut};

struct Matrix {
    data: Vec<Vec<f64>>,
    rows: usize,
    cols: usize,
}

impl Matrix {
    fn new(rows: usize, cols: usize) -> Self {
        Matrix {
            data: vec![vec![0.0; cols]; rows],
            rows,
            cols,
        }
    }
}

// 实现 Index：支持不可变访问 matrix[(row, col)]
impl Index<(usize, usize)> for Matrix {
    type Output = f64;

    fn index(&self, (row, col): (usize, usize)) -> &f64 {
        assert!(row < self.rows && col < self.cols, "索引越界");
        &self.data[row][col]
    }
}

// 实现 IndexMut：支持可变访问 matrix[(row, col)] = value
impl IndexMut<(usize, usize)> for Matrix {
    fn index_mut(&mut self, (row, col): (usize, usize)) -> &mut f64 {
        assert!(row < self.rows && col < self.cols, "索引越界");
        &mut self.data[row][col]
    }
}

fn main() {
    let mut m = Matrix::new(3, 3);
    m[(0, 0)] = 1.0;
    m[(1, 1)] = 5.0;
    m[(2, 2)] = 9.0;

    println!("m[0][0] = {}", m[(0, 0)]); // 1.0
    println!("m[1][1] = {}", m[(1, 1)]); // 5.0
}
```

---

## 虚类型参数 (Phantom Types) 与 `PhantomData`

**虚类型参数（Phantom Type）**是指在类型定义中出现但在运行时不持有任何数据的泛型参数。其核心用途是在**编译期**通过类型系统区分语义不同但内存表示相同的值。

### 1. 为什么需要 PhantomData

如果泛型参数 `T` 未被实际字段使用，编译器会报 `unused type parameter` 错误。`PhantomData<T>` 占位符解决此问题：大小为 0，运行时无开销，但在类型系统中等同于"持有一个 `T`"。

```rust
use std::marker::PhantomData;

// 带单位的数值类型：编译器阻止不同单位混算
struct Meters;
struct Feet;

#[derive(Debug, Clone, Copy)]
struct Distance<Unit> {
    value: f64,
    _unit: PhantomData<Unit>, // 零大小，不占内存
}

impl<Unit> Distance<Unit> {
    fn new(value: f64) -> Self {
        Distance { value, _unit: PhantomData }
    }

    fn value(&self) -> f64 { self.value }
}

impl Distance<Meters> {
    fn to_feet(self) -> Distance<Feet> {
        Distance::new(self.value * 3.28084)
    }
}

fn build_wall(height: Distance<Meters>) {
    println!("墙高 {} 米", height.value());
}

fn main() {
    let h_meters = Distance::<Meters>::new(2.5);
    let h_feet = h_meters.to_feet();

    build_wall(h_meters);
    // build_wall(h_feet); // ❌ 编译报错：期望 Meters，得到 Feet

    println!("{:.2} 米 = {:.2} 英尺", h_meters.value(), h_feet.value());
    // Distance<Meters> 和 Distance<Feet> 内存布局相同，但类型不同
    assert_eq!(std::mem::size_of::<Distance<Meters>>(), std::mem::size_of::<f64>());
}
```

### 2. PhantomData 控制型变（Variance）

在 `unsafe` 代码中，用 `PhantomData` 告诉编译器泛型参数的所有权/借用语义：

```rust
use std::marker::PhantomData;

// 自定义迭代器持有生命周期 'a 的引用（协变）
struct Iter<'a, T> {
    ptr: *const T,
    end: *const T,
    // 告诉编译器：逻辑上持有 &'a T，对 'a 和 T 都是协变
    _marker: PhantomData<&'a T>,
}

// 自定义可变迭代器（对 T 不变，因为可以写入）
struct IterMut<'a, T> {
    ptr: *mut T,
    end: *mut T,
    // 告诉编译器：逻辑上持有 &'a mut T，对 T 不变
    _marker: PhantomData<&'a mut T>,
}
```

### 3. PhantomData 选型速查

| `PhantomData<T>` 写法 | 语义 | 型变 |
| :--- | :--- | :--- |
| `PhantomData<T>` | 拥有 T（会 drop T） | 对 T 协变 |
| `PhantomData<&'a T>` | 借用 &'a T | 对 'a 和 T 协变 |
| `PhantomData<&'a mut T>` | 借用 &'a mut T | 对 'a 协变，对 T 不变 |
| `PhantomData<*const T>` | 持有裸指针 | 对 T 协变 |
| `PhantomData<*mut T>` | 持有可变裸指针 | 对 T 不变 |
| `PhantomData<fn(T)>` | 函数参数 | 对 T 逆变 |
