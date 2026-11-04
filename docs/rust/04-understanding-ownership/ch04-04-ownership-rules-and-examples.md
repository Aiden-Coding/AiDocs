---
title: "所有权规则与代码案例"
sidebar_position: 18
---

# 所有权规则与代码案例

本节把所有权规则整理成检查清单，并用可独立运行的程序演示移动、`move` 闭包、复制、函数传参、借用和切片。每个代码块都是独立示例；标为 `does_not_compile` 的代码用于观察编译器错误，不应与通过示例混在同一个程序中。

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

## 案例二补充：部分移动与重新赋值

### 移动结构体中的一个字段

```rust
struct User {
    name: String,
    email: String,
    active: bool,
}

fn main() {
    let user = User {
        name: String::from("Lin"),
        email: String::from("lin@example.com"),
        active: true,
    };

    let name = user.name; // 只把 name 字段移动出来
    println!("{name}");
    println!("{} ({})", user.email, user.active); // 未移动字段仍可使用

    // println!("{user:?}"); // 整个 user 已部分移动，不能再整体使用
}
```

部分移动后，仍可使用未移动的字段；但不能再整体借用、传递或销毁该结构体。若类型实现了 `Drop`，通常不能从中单独移动字段，因为析构函数需要完整的 `self`。

### 移动后给原绑定重新赋值

```rust
fn main() {
    let mut current = String::from("old");
    let previous = current; // 原 String 移动给 previous

    current = String::from("new"); // 为 current 初始化一个新值
    println!("previous = {previous}, current = {current}");
}
```

移动后，绑定 `current` 暂时未初始化，不能读取；若它是可变绑定，可以在再次读取前重新赋值。新值与已移动的旧值无关。

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

## `move` 关键字：把捕获值移入闭包或异步块 {#move-keyword}

赋值和函数传参中的移动是 Rust 的**所有权语义**，不需要也没有 `move` 关键字。`move` 关键字用于闭包和 `async` 块，要求它们按值捕获所使用的环境变量，而不是按引用借用。

### 默认闭包按使用方式借用

```rust
fn main() {
    let name = String::from("Rust");
    let print_name = || println!("{name}");

    print_name();
    println!("still owned here: {name}");
}
```

闭包只读取 `name`，所以默认不可变借用它；闭包调用后，外层仍可使用 `name`。

### `move` 闭包获取捕获值

```rust
fn main() {
    let name = String::from("Rust");
    let print_name = move || println!("{name}");

    print_name();
    // println!("{name}"); // 编译失败：String 已移动到闭包
}
```

`move` 使非 `Copy` 的 `String` 所有权进入闭包。闭包被丢弃时，仍由闭包拥有的 `name` 随之清理。

### `move` 对 Copy 值的效果不同

```rust
fn main() {
    let count = 3_u32;
    let show_count = move || println!("{count}");

    show_count();
    println!("count remains usable: {count}");
}
```

`move` 要求按值捕获，但 `u32` 实现 `Copy`，因此捕获时复制数值，外层的 `count` 仍有效。判断外层变量是否失效，要看捕获类型是否实现 `Copy`，不能只看有没有写 `move`。

### `move` 与闭包调用 trait 不是一回事

`move` 决定**如何捕获**环境；闭包实现 `Fn`、`FnMut` 还是仅 `FnOnce`，取决于闭包体如何使用捕获值。

```rust
fn call_twice<F: Fn()>(f: F) {
    f();
    f();
}

fn main() {
    let label = String::from("ready");
    let print_label = move || println!("{label}");

    call_twice(print_label);
}
```

这个 `move` 闭包只读取捕获值，仍实现 `Fn`，可以被调用多次。若闭包体消费捕获值，则通常只能实现 `FnOnce`。更多捕获规则见[闭包章节](../13-functional-features/ch13-01-closures.md)。

### 在线程和 async 任务中的用途

`std::thread::spawn` 要求线程闭包拥有或使用满足线程生命周期要求的数据，`move` 常用于把数据带入新线程：

```rust
use std::thread;

fn main() {
    let message = String::from("hello from another thread");
    let handle = thread::spawn(move || {
        println!("{message}");
    });

    handle.join().expect("thread panicked");
}
```

同样，`async move` 会把使用到的变量按值捕获进 Future。Future 仍是惰性的，需 `.await` 或交给执行器驱动：

```rust
fn main() {
    let message = String::from("owned by the future");
    let future = async move {
        println!("{message}");
    };

    // message 已移动进 Future；Future 在此被丢弃，所以闭包体没有运行。
    drop(future);
}
```

实际异步任务通常由运行时的 `spawn` 驱动；跨线程调度时，运行时还可能要求 Future 满足 `Send + 'static`。`move` 可以解决借用局部变量导致的生命周期问题，但不会自动让捕获值变成 `Send`，也不会改变其本身的线程安全属性。

## `String`、`str` 与 `&str`

| 类型 | 是否拥有数据 | 是否可变 | 常见来源/用途 |
|---|---|---|---|
| `String` | 拥有 UTF-8 缓冲区 | 绑定声明为 `mut` 时可修改 | 运行时创建、拼接或接收的文本 |
| `str` | 本身不拥有数据，且是动态大小类型 | 不能直接作为普通局部值使用 | 通常通过引用访问 |
| `&str` | 借用一段 UTF-8 文本 | 只读 | 字符串字面量、`String` 的视图、函数参数 |
| `&mut str` | 可变借用一段文本切片 | 受独占可变借用规则约束 | 较少直接使用 |

字符串字面量的类型是 `&'static str`；`String` 可通过解引用强制转换为 `&str`。因此函数若只需读取文本，通常接受 `&str`，既能接收字面量，也能接收 `String` 的借用：

```rust
fn greet(name: &str) {
    println!("Hello, {name}");
}

fn main() {
    let owned = String::from("Ada");
    greet(&owned); // String 借用并转换为 &str，不转移所有权
    greet("Grace"); // 字面量本身就是 &str

    owned.push('!'); // greet 返回后，owned 仍由 main 拥有
}
```

只有函数需要取得并保存文本所有权时，参数才通常使用 `String`；需要修改调用方字符串时可使用 `&mut String`。第 8 章详见[字符串与 UTF-8](../08-common-collections/ch08-02-strings.md)。

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

## 生命周期直觉与所有权选择

引用只能在其指向的数据有效期间使用。函数返回引用时，引用必须来自调用方提供且仍然有效的数据，不能指向函数内部创建后即被丢弃的局部值。

```rust
fn first_word(text: &str) -> &str {
    match text.find(' ') {
        Some(index) => &text[..index],
        None => text,
    }
}

fn main() {
    let text = String::from("hello Rust");
    let word = first_word(&text);
    println!("{word}");
}
```

此签名省略了生命周期标注；编译器会根据引用输入与输出的规则推断返回切片借用自 `text`。当函数有多个引用输入时，需要时可用生命周期参数明确它们与返回引用的关系，例如：

```rust
fn longer<'a>(left: &'a str, right: &'a str) -> &'a str {
    if left.len() >= right.len() {
        left
    } else {
        right
    }
}
```

`'a` 不会延长任何数据的存活时间；它表达调用者必须保证返回引用所依赖的数据至少在相应使用期间有效。完整规则见[生命周期语法](../10-generics-traits-lifetimes/ch10-03-lifetime-syntax.md)。

### 该拥有、借用还是共享

| 需求 | 常见选择 | 含义 |
|---|---|---|
| 只读使用数据，不需要留存 | `&T` 或针对文本的 `&str` | 临时借用，不转移所有权 |
| 临时修改调用方的数据 | `&mut T` | 独占可变借用 |
| 函数要消费、保存或返回这个值 | 按值传入 `T` | 转移所有权 |
| 需要独立拥有一份相同内容 | `clone()` | 显式复制，可能产生分配 |
| 单线程多个所有者 | `Rc<T>` | 引用计数共享所有权 |
| 多线程多个所有者 | `Arc<T>` | 原子引用计数共享所有权 |

先考虑借用是否能满足需求；只有所有权确实需要转移、复制或共享时，再选择对应方式。`Rc<T>` 和 `Arc<T>` 的完整用法见[引用计数智能指针](../15-smart-pointers/ch15-04-rc.md)。

## 常见操作规则速查

| 操作 | `String` 等非 `Copy` 值 | `Copy` 类型 |
|---|---|---|
| `let other = value` | 移动；原绑定不能再使用 | 复制；原绑定仍可使用 |
| `function(value)` | 通常移动到参数 | 复制到参数 |
| `function(&value)` | 不转移所有权，只读借用 | 不转移所有权 |
| `function(&mut value)` | 不转移所有权，独占可变借用 | 同样受借用规则约束 |
| `move || { ... value ... }` | 按值捕获，非 `Copy` 值移入闭包 | 按值捕获时复制，外层值仍可用 |
| `async move { ... value ... }` | 按值捕获到 Future | 按值捕获时复制 |
| 从函数返回 `value` | 所有权转移给调用方 | 复制值给调用方 |
| `value.clone()` | 显式克隆，可能复制堆数据 | 显式复制，通常无必要 |

遇到所有权编译错误时，可依次检查：值当前由谁拥有；是否发生了移动；是否只需借用；引用最后一次使用位置在哪里；函数是否应该返回拥有的数据；是否确实需要显式 `clone()`。

## 学习路径

- [所有权与栈、堆、移动和 Copy 的基础说明](ch04-01-what-is-ownership.md)
- [引用、可变借用、借用冲突和悬垂引用](ch04-02-references-and-borrowing.md)
- [字符串及其他类型的切片](ch04-03-slices.md)
