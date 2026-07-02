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

### Newtype 模式

使用元组结构体包装类型来实现外部特征：

```rust
use std::fmt;

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
> **下一步**：掌握了特征和泛型后，继续学习 [错误处理](error-handling.md)，了解如何优雅地处理程序中的错误。
