---
title: "所有权规则与代码案例"
sidebar_position: 18
---

# 所有权规则与代码案例

本节把所有权规则整理成检查清单，并用可独立运行的程序演示移动、复制、函数传参、借用和切片。每个代码块都是独立示例；标为 `does_not_compile` 的代码用于观察编译器错误，不应与通过示例混在同一个程序中。

## 三条所有权规则

1. **每个值都有所有者**：所有者通常是一个变量，也可以是拥有该值的结构体字段或集合元素。
2. **同一时刻只有一个所有者**：赋值或传参可能把所有权移动给新所有者；原变量随后不能再使用该值。
3. **所有者离开作用域时，值被丢弃**：Rust 自动调用析构逻辑释放资源；若所有权已移动，原变量不会再次释放该值。

基本类型与实现 `Copy` 的类型在赋值时复制值，不会使原变量失效。`Rc<T>`、`Arc<T>` 等智能指针提供引用计数的共享所有权，是显式采用的另一种所有权模型。

## 案例一：作用域结束时释放资源

```rust
struct Resource(&'static str);

impl Drop for Resource {
    fn drop(&mut self) {
        println!("drop {}", self.0);
    }
}

fn main() {
    let outer = Resource("outer");
    {
        let inner = Resource("inner");
        println!("inner scope ending");
    } // inner 在此处被 drop

    println!("outer scope ending");
} // outer 在此处被 drop
```

输出顺序是 `inner` 先于 `outer`：嵌套作用域结束时先清理内层值。程序无需手动调用 `drop`；离开作用域会自动清理仍由该作用域拥有的值。

## 案例二：赋值时移动所有权

```rust
fn main() {
    let first = String::from("Rust");
    let second = first;

    println!("{second}");
    // println!("{first}"); // 编译失败：String 已移动到 second
}
```

`String` 在栈上的指针、长度和容量被转交给 `second`，堆上文本不做隐式深拷贝。若两个变量都需要独立拥有字符串，可以显式克隆：

```rust
fn main() {
    let first = String::from("Rust");
    let second = first.clone();

    println!("first = {first}, second = {second}");
}
```

`clone()` 会复制字符串内容，可能分配内存；只读借用通常更便宜，见后文。

## 案例三：Copy 类型赋值后仍可使用

```rust
fn main() {
    let first = 42_u32;
    let second = first;

    println!("first = {first}, second = {second}");
}
```

`u32` 实现了 `Copy`，赋值复制其值。元组仅当所有字段都实现 `Copy` 时才实现 `Copy`，例如 `(u8, bool)` 可复制，而 `(u8, String)` 不可复制。

## 案例四：函数传参会移动或复制

```rust
fn consume(text: String) {
    println!("consumed: {text}");
} // text 离开作用域，String 被释放

fn inspect(number: u32) {
    println!("copied: {number}");
}

fn main() {
    let text = String::from("hello");
    consume(text);
    // println!("{text}"); // 编译失败：text 已移动到 consume

    let number = 7;
    inspect(number);
    println!("number remains usable: {number}");
}
```

把值传给函数与赋值遵循同样的规则：非 `Copy` 值通常移动到参数；`Copy` 值复制到参数。

## 案例五：返回值也能转移所有权

```rust
fn add_suffix(mut text: String) -> String {
    text.push_str(" Rust");
    text
}

fn main() {
    let greeting = String::from("Hello");
    let greeting = add_suffix(greeting);

    println!("{greeting}");
}
```

`greeting` 移入函数，修改后再作为返回值移回调用方。若函数只需读取数据，不必通过“传入再返回”保留所有权；使用借用即可。

## 两条借用规则

对同一份数据，引用必须遵守以下规则：

- 可以同时存在多个不可变引用 `&T`。
- 有可变引用 `&mut T` 时，不可同时存在其他指向同一数据的引用；也不能同时有多个可变引用。
- 引用不能比其所指向的数据活得更久。

简写为：**多个只读引用，或一个独占可变引用；不能同时两者兼有。** 这是对同一数据的访问规则，不是说整个程序只能有一个可变引用。

### 多个不可变借用

```rust
fn main() {
    let name = String::from("Ada");
    let first = &name;
    let second = &name;

    println!("{first} and {second}");
}
```

### 一个可变借用

```rust
fn append_world(text: &mut String) {
    text.push_str(", world");
}

fn main() {
    let mut message = String::from("hello");
    append_world(&mut message);
    println!("{message}");
}
```

可变借用要求原变量可变。借用期间，调用方不能通过其他引用读取或修改同一数据。

### 冲突借用：同时存在可变和不可变引用

```rust,ignore,does_not_compile
fn main() {
    let mut value = String::from("hello");
    let read_only = &value;
    let writable = &mut value;

    println!("{read_only} {writable}");
}
```

不可变引用稍后仍会被使用，因此它的借用与可变借用重叠，编译器拒绝此代码。若先完成只读工作，再创建可变借用，借用范围不重叠即可：

```rust
fn main() {
    let mut value = String::from("hello");
    let read_only = &value;
    println!("{read_only}");

    let writable = &mut value;
    writable.push_str(", Rust");
    println!("{writable}");
}
```

借用通常持续到最后一次使用，而不一定持续到包围它的花括号结束；这是非词法生命周期（NLL）的常见表现。

## 案例六：不能返回局部变量的引用

```rust,ignore,does_not_compile
fn dangling_reference() -> &String {
    let text = String::from("temporary");
    &text
}
```

函数返回时 `text` 离开作用域并被释放，返回的引用将悬垂。需要把所有权返回给调用方：

```rust
fn owned_text() -> String {
    String::from("valid after return")
}

fn main() {
    let text = owned_text();
    println!("{text}");
}
```

## 案例七：切片借用会阻止冲突修改

```rust,ignore,does_not_compile
fn first_word(text: &str) -> &str {
    match text.find(' ') {
        Some(index) => &text[..index],
        None => text,
    }
}

fn main() {
    let mut text = String::from("hello Rust");
    let word = first_word(&text);
    text.clear(); // 编译失败：word 仍借用 text
    println!("{word}");
}
```

`word` 是指向 `text` 内容的不可变切片。只要后续还会使用 `word`，就不能通过 `clear()` 获取同一字符串的可变借用。若先结束切片的使用，修改就合法：

```rust
fn first_word(text: &str) -> &str {
    match text.find(' ') {
        Some(index) => &text[..index],
        None => text,
    }
}

fn main() {
    let mut text = String::from("hello Rust");
    let word = first_word(&text);
    println!("{word}");

    text.clear();
    println!("cleared: {text}");
}
```

## 常见操作规则速查

| 操作 | `String` 等非 `Copy` 值 | `Copy` 类型 |
|---|---|---|
| `let other = value` | 移动；原绑定不能再使用 | 复制；原绑定仍可使用 |
| `function(value)` | 通常移动到参数 | 复制到参数 |
| `function(&value)` | 不转移所有权，只读借用 | 不转移所有权 |
| `function(&mut value)` | 不转移所有权，独占可变借用 | 同样受借用规则约束 |
| 从函数返回 `value` | 所有权转移给调用方 | 复制值给调用方 |
| `value.clone()` | 显式克隆，可能复制堆数据 | 显式复制，通常无必要 |

遇到所有权编译错误时，可依次检查：值当前由谁拥有；是否发生了移动；是否只需借用；引用最后一次使用位置在哪里；函数是否应该返回拥有的数据；是否确实需要显式 `clone()`。

## 学习路径

- [所有权与栈、堆、移动和 Copy 的基础说明](ch04-01-what-is-ownership.md)
- [引用、可变借用、借用冲突和悬垂引用](ch04-02-references-and-borrowing.md)
- [字符串及其他类型的切片](ch04-03-slices.md)
