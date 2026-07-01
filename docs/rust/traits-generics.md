---
title: Rust 特征系统与零成本抽象
hide_title: true
sidebar_label: 特征与泛型
---

## Rust 特征系统与零成本抽象

在 Rust 中，特征（Trait）是定义共享行为的唯一保障。它不仅是接口（Interface），更是实现零成本抽象（Zero-cost Abstractions）的核心，支撑着泛型（Generics）、类型转换、运算符重载以及动态派发等高级特性。

> 🟢 **基础**：掌握基本语法即可阅读 ｜ 🟡 **进阶**：需要有一定 Rust 开发经验 ｜ 🔴 **高级**：面向系统级开发者与性能工程师

---

## 🟢 Trait 基础

### 1. 共享行为的机制

Trait 是对未知类型（`Self`）定义的方法集。它类似于其他语言中的接口：

```rust
trait Greet {
    fn greet(&self) -> String; // 抽象方法
    fn greet_loudly(&self) -> String { // 默认实现
        self.greet().to_uppercase()
    }
}
```

### 2. 派生特征 (Derivable Traits)

使用 `#[derive(...)]` 属性宏，可以让编译器自动生成常用特征的默认实现：
- `Debug`：允许使用 `{:?}` 打印调试。
- `Clone` 与 `Copy`：控制深浅拷贝行为。
- `PartialEq` 与 `Eq`：控制等值比较（`==`）。
- `Default`：提供零值或默认构造状态。

---

## 🟢 标准库常用转换特征 (Conversion)

RBE 中关于类型转换的特征是极其常用的工具：

### 1. `From` 与 `Into`

`From` 和 `Into` 特征是相互配对的。实现 `From` 会自动为类型实现 `Into`：

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
    // 1. 使用 From
    let num = Number::from(30);

    // 2. 使用 Into（需要指明目标类型）
    let int_val = 5;
    let num2: Number = int_val.into();
    println!("num: {:?}, num2: {:?}", num, num2);
}
```

### 2. `TryFrom` 与 `TryInto`

类似于 `From` 和 `Into`，但用于**可能会失败的转换**，它们返回一个 `Result`：

```rust
use std::convert::TryFrom;

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
```

### 3. `ToString` 与 `FromStr`

- `ToString`：通常不直接实现。相反，应该实现 `fmt::Display`，这样标准库会自动实现 `ToString`。
- `FromStr`：用于将字符串反解析为目标类型，是 `str::parse` 背后工作的核心：

```rust
use std::str::FromStr;

struct Point { x: i32, y: i32 }

impl FromStr for Point {
    type Err = std::num::ParseIntError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let coords: Vec<&str> = s.trim_matches(|p| p == '(' || p == ')')
                                 .split(',')
                                 .collect();
        let x_val = coords[0].trim().parse::<i32>()?;
        let y_val = coords[1].trim().parse::<i32>()?;
        Ok(Point { x: x_val, y: y_val })
    }
}
```

---

## 🟡 泛型进阶与约束

### 1. 泛型约束 (Bounds) 与多重约束

泛型可以让代码复用性更高，但我们通常需要对参数能做什么进行“约束”。多重约束使用 `+` 连接：

```rust
use std::fmt::Debug;

// 约束 T 必须同时实现 Debug 和 Clone
fn print_and_clone<T: Debug + Clone>(arg: &T) -> T {
    println!("Printing: {:?}", arg);
    arg.clone()
}
```

#### 空约束 (Empty Bounds)

在 Rust 中，即使一个特征不包含任何方法，实现它也可以作为类型安全的标记（Marker）。这种约束被称为**空约束**（在标准库中广泛存在，如 `Send`、`Sync`、`Copy` 等）：

```rust
// 定义一个空特征，起标记作用
trait RedColor {}

struct Apple;
struct Banana;

impl RedColor for Apple {} // 仅为 Apple 实现该特征

// 约束 T 必须实现 RedColor。虽然 RedColor 没有方法，但它起到了编译期标记筛选的作用
fn paint_red<T: RedColor>(item: T) {
    println!("Painting it red!");
}

fn main() {
    paint_red(Apple);  // ✅ 成功！
    // paint_red(Banana); // ❌ 编译期报错：RedColor 特征未实现！
}
```

### 2. `where` 子句

当泛型参数较多或约束非常复杂时，使用 `where` 子句可以让类型签名更清晰：

```rust
// 使用 where 提高可读性
fn some_function<T, U>(t: &T, u: &U) -> i32
where
    T: Debug,
    U: Clone + Debug,
{
    10
}
```

### 3. Newtype 惯用法与孤儿规则

- **孤儿规则**：只有当特征或类型中至少有一个是在当前 crate 内定义时，才能为类型实现特征。
- **Newtype**：使用元组结构体包裹标准库或第三方库类型，从而绕过孤儿规则。

```rust
struct MyVec(Vec<i32>); // 用 Newtype 包装

impl std::fmt::Display for MyVec {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        write!(f, "Count: {}", self.0.len())
    }
}
```

### 4. 关联类型 vs 泛型参数

- **关联类型**：作为特征的“输出”，即每个实现者对应唯一的关联类型（如 `Iterator::Item`）。
- **泛型参数**：允许一个类型对同一个特征有多种不同的输入实现（如 `Add<Rhs>`）。

---

## 🟡 动态派发与胖指针

当我们无法在编译期确定所有的具体类型时，需要使用 Trait 对象（`dyn Trait`）进行**动态派发**。

- **胖指针**：Trait 对象在内存中是一个包含 **数据指针** 和 **虚表指针** 的胖指针。
- **使用限制**：只有**对象安全**（Object Safe）的 Trait 才能被用作 Trait 对象（例如方法不能返回 `Self`，也不能带泛型参数）。

---

## 🔴 虚类型参数与 PhantomData

虚类型（Phantom Type）参数是不在运行时使用，但在编译期进行静态安全检查的类型参数。我们使用 `std::marker::PhantomData` 来声明它们。

### 测试实例：单位安全检查 (Units)

这个例子展示了如何通过虚类型参数在编译阶段自动防御非法物理单位加减运算：

```rust
use std::ops::Add;
use std::marker::PhantomData;

// 定义物理量单位标记（这些类型从不实例化）
#[derive(Debug, Clone, Copy)]
struct Inch;
#[derive(Debug, Clone, Copy)]
struct Mm;

// Length 结构体带有虚类型参数 Unit
#[derive(Debug, Clone, Copy)]
struct Length<Unit> {
    value: f64,
    _marker: PhantomData<Unit>,
}

// 为同单位 Length 实现加法
impl<Unit> Add for Length<Unit> {
    type Output = Length<Unit>;

    fn add(self, rhs: Self) -> Self::Output {
        Length {
            value: self.value + rhs.value,
            _marker: PhantomData,
        }
    }
}

fn main() {
    let one_inch = Length::<Inch> { value: 1.0, _marker: PhantomData };
    let ten_mm = Length::<Mm> { value: 10.0, _marker: PhantomData };

    let two_inches = one_inch + one_inch; // ✅ 成功！
    // let error = one_inch + ten_mm; // ❌ 编译期拦截：类型不匹配！
}
```

---

## 🔴 特性 Trait 进阶

### 1. 运算符重载 (std::ops)

通过实现 `std::ops` 命名空间下的特征，可以为自定义类型重载运算符：

```rust
use std::ops::Add;

struct Foo;
struct Bar;
struct FooBar;

impl Add<Bar> for Foo {
    type Output = FooBar;

    fn add(self, _rhs: Bar) -> FooBar {
        FooBar
    }
}
```

### 2. Supertraits (父 trait)

父 trait 表达了一种特征之间的继承依赖关系：

```rust
use std::fmt;

// 实现 Printable 必须也实现 fmt::Display
trait Printable: fmt::Display {
    fn print_self(&self) {
        println!("Value: {}", self);
    }
}
```

### 3. 消除重叠 Trait 冲突 (Fully Qualified Syntax)

当一个类型实现了多个具有同名方法的 Trait 时，使用普通方法调用会产生歧义。此时需要使用**完全限定语法**：

```rust
trait UsernameWidget {
    fn get(&self) -> String;
}

trait AgeWidget {
    fn get(&self) -> i32;
}

struct Form { username: String, age: i32 }

impl UsernameWidget for Form {
    fn get(&self) -> String { self.username.clone() }
}

impl AgeWidget for Form {
    fn get(&self) -> i32 { self.age }
}

fn main() {
    let form = Form { username: "Alice".to_string(), age: 20 };

    // 显式指定调用的特征方法
    let name = UsernameWidget::get(&form);
    let age = AgeWidget::get(&form);
}
```

> [!NOTE]
> **架构建议**：静态派发是 Rust 零成本抽象的精髓，能在编译期发现问题并提高性能；如果需要处理异构集合，请使用 `Box<dyn Trait>`。
