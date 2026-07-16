---
title: 所有权与生命周期
hide_title: true
sidebar_label: 所有权与生命周期
sidebar_position: 5
---

# 所有权与生命周期

Rust 使用所有权系统来管理内存，这是 Rust 最独特也是最重要的特性。理解所有权对于掌握 Rust 至关重要。

---

## 所有权（Ownership）

### 所有权规则

Rust 的所有权系统遵循三条基本规则：

1. Rust 中的每一个值都有一个被称为其**所有者**（owner）的变量
2. 值在任一时刻有且只有一个所有者
3. 当所有者（变量）离开作用域，这个值将被丢弃（drop）

```rust
fn main() {
    {                      // s 在这里无效，它尚未声明
        let s = "hello";   // 从此处起，s 是有效的

        // 使用 s
        println!("{}", s);
    }                      // 此作用域已结束，s 不再有效
}
```

### 移动（Move）

当我们将一个变量赋值给另一个变量时，如果类型没有实现 `Copy` trait，所有权会发生转移：

```rust
fn main() {
    let s1 = String::from("hello");
    let s2 = s1; // s1 的所有权移动到了 s2

    // println!("{}", s1); // ❌ 编译错误：value borrowed after move
    println!("{}", s2); // ✅ 正常工作
}
```

对于存储在栈上的简单类型（如整数），赋值会进行拷贝：

```rust
fn main() {
    let x = 5;
    let y = x; // x 被拷贝给 y

    println!("x = {}, y = {}", x, y); // ✅ x 和 y 都可用
}
```

### 克隆（Clone）

如果确实需要深度复制堆上的数据，可以使用 `clone` 方法：

```rust
fn main() {
    let s1 = String::from("hello");
    let s2 = s1.clone(); // 深度拷贝

    println!("s1 = {}, s2 = {}", s1, s2); // ✅ 都可用
}
```

### 所有权与函数

将值传递给函数在语义上与给变量赋值相似：

```rust
fn main() {
    let s = String::from("hello");  // s 进入作用域

    takes_ownership(s);             // s 的值移动到函数里
                                    // s 到这里不再有效

    let x = 5;                      // x 进入作用域

    makes_copy(x);                  // x 应该移动函数里，
                                    // 但 i32 是 Copy 的，所以后面可继续使用 x

} // 这里，x 先移出了作用域，然后是 s。但因为 s 的值已被移走，没有特殊之处

fn takes_ownership(some_string: String) { // some_string 进入作用域
    println!("{}", some_string);
} // 这里，some_string 移出作用域并调用 `drop` 方法

fn makes_copy(some_integer: i32) { // some_integer 进入作用域
    println!("{}", some_integer);
} // 这里，some_integer 移出作用域。没有特殊之处
```

### 返回值与作用域

返回值也可以转移所有权：

```rust
fn main() {
    let s1 = gives_ownership();         // gives_ownership 将返回值移给 s1

    let s2 = String::from("hello");     // s2 进入作用域

    let s3 = takes_and_gives_back(s2);  // s2 被移动到 takes_and_gives_back 中,
                                        // 它也将返回值移给 s3
} // s3 移出作用域并被丢弃。s2 也移出作用域，但已被移走，所以什么也不会发生。
  // s1 移出作用域并被丢弃

fn gives_ownership() -> String {             
    let some_string = String::from("yours"); 
    some_string                              
}

fn takes_and_gives_back(a_string: String) -> String { 
    a_string  
}
```

---

## 引用与借用（References and Borrowing）

### 引用

引用允许你使用值但不获取其所有权：

```rust
fn main() {
    let s1 = String::from("hello");

    let len = calculate_length(&s1); // 传递引用

    println!("The length of '{}' is {}.", s1, len);
}

fn calculate_length(s: &String) -> usize { 
    s.len()
} // s 离开了作用域。但因为它并不拥有引用值的所有权，所以什么也不会发生
```

我们将创建一个引用的行为称为**借用**（borrowing）。

### 可变引用

可以创建一个可变引用来修改借用的值：

```rust
fn main() {
    let mut s = String::from("hello");

    change(&mut s);

    println!("{}", s); // 输出：hello, world
}

fn change(some_string: &mut String) {
    some_string.push_str(", world");
}
```

### 可变引用的限制

可变引用有一个很大的限制：在同一时间只能有一个对某一特定数据的可变引用：

```rust
fn main() {
    let mut s = String::from("hello");

    let r1 = &mut s;
    // let r2 = &mut s; // ❌ 编译错误：cannot borrow `s` as mutable more than once

    println!("{}", r1);
}
```

这个限制可以在编译时防止数据竞争。

### 不可变引用与可变引用

不能在拥有不可变引用的同时拥有可变引用：

```rust
fn main() {
    let mut s = String::from("hello");

    let r1 = &s; // 没问题
    let r2 = &s; // 没问题
    println!("{} and {}", r1, r2);
    // 此位置之后 r1 和 r2 不再使用

    let r3 = &mut s; // 没问题！
    println!("{}", r3);
}
```

### 悬垂引用

Rust 编译器保证引用永远不会变成悬垂引用（dangling references）：

```rust
fn main() {
    let reference_to_nothing = dangle();
}

fn dangle() -> &String { // ❌ 编译错误
    let s = String::from("hello");
    &s
} // s 离开作用域并被丢弃，其内存被释放
```

正确的做法是直接返回 `String`：

```rust
fn no_dangle() -> String {
    let s = String::from("hello");
    s // 返回 String，所有权被移出
}
```

---

## 生命周期（Lifetimes）

### 生命周期标注语法

生命周期标注并不改变任何引用的生命周期的长短。它们描述了多个引用生命周期相互的关系：

```rust
&i32        // 引用
&'a i32     // 带有显式生命周期的引用
&'a mut i32 // 带有显式生命周期的可变引用
```

### 函数中的生命周期标注

```rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() {
        x
    } else {
        y
    }
}

fn main() {
    let string1 = String::from("long string is long");
    
    {
        let string2 = String::from("xyz");
        let result = longest(string1.as_str(), string2.as_str());
        println!("The longest string is {}", result);
    }
}
```

生命周期标注 `'a` 的实际生命周期等同于 `x` 和 `y` 的生命周期中较小的那一个。

### 结构体定义中的生命周期标注

当结构体持有引用时，需要为每一个引用添加生命周期标注：

```rust
struct ImportantExcerpt<'a> {
    part: &'a str,
}

fn main() {
    let novel = String::from("Call me Ishmael. Some years ago...");
    let first_sentence = novel.split('.').next().expect("Could not find a '.'");
    let i = ImportantExcerpt {
        part: first_sentence,
    };
    
    println!("{}", i.part);
}
```

这个标注意味着 `ImportantExcerpt` 的实例不能比其 `part` 字段中的引用存在得更久。

### 生命周期省略规则

编译器使用三条规则来判断引用何时不需要明确的生命周期标注：

**规则一**：每一个是引用的参数都有它自己的生命周期参数

```rust
fn foo(x: &i32)              // fn foo<'a>(x: &'a i32)
fn foo(x: &i32, y: &i32)     // fn foo<'a, 'b>(x: &'a i32, y: &'b i32)
```

**规则二**：如果只有一个输入生命周期参数，那么它被赋予所有输出生命周期参数

```rust
fn foo(x: &i32) -> &i32      // fn foo<'a>(x: &'a i32) -> &'a i32
```

**规则三**：如果方法有多个输入生命周期参数并且其中一个参数是 `&self` 或 `&mut self`，那么 `self` 的生命周期被赋予所有输出生命周期参数

### 方法定义中的生命周期标注

```rust
impl<'a> ImportantExcerpt<'a> {
    fn level(&self) -> i32 {
        3
    }
    
    fn announce_and_return_part(&self, announcement: &str) -> &str {
        println!("Attention please: {}", announcement);
        self.part
    }
}
```

### 静态生命周期

`'static` 是一个特殊的生命周期，其生命周期能够存活于整个程序期间：

```rust
fn main() {
    let s: &'static str = "I have a static lifetime.";
    println!("{}", s);
}
```

所有的字符串字面值都拥有 `'static` 生命周期。

### 匿名生命周期 `'_`

在一些情况下，我们可能在定义结构体或实现特征时显式使用生命周期参数，但在使用这些类型时，我们不希望或者没必要重复命名这些生命周期参数。为此，Rust 提供了**匿名生命周期（Anonymous Lifetime）** `'_` 占位符，由编译器自动推导。

典型场景：

```rust
struct StrReader<'a> {
    content: &'a str,
}

// 1. 无需在函数签名中命名生命周期
// 这里的 `'_` 告诉编译器：“这里有一个生命周期，请使用标准的生命周期省略规则自动推导它”
fn get_first_word(reader: StrReader<'_>) -> &str {
    reader.content.split_whitespace().next().unwrap_or("")
}

// 2. 在 impl 块中实现带生命周期参数的结构体
// 如果 impl 中不需要特别为生命周期标注泛型逻辑，也可以使用 `'_`
impl StrReader<'_> {
    fn print(&self) {
        println!("{}", self.content);
    }
}
```

### 生命周期约束 (Lifetimes Bounds)

生命周期约束描述了生命周期之间、或者泛型类型与生命周期之间的生存长度契约关系。主要包括两类：

#### 1. 生命周期与生命周期的约束：`'a: 'b`

读作“生命周期 `'a` 至少和 `'b` 活得一样久”（'a outlives 'b）。如果一个引用 `'a` 的生命周期约束于 `'b`，说明在 `'b` 的整个有效区间内， `'a` 也是安全可用的。

```rust
// 返回值借用了 x。
// 因为编译器必须确保返回的引用有效，我们约定返回引用的生命周期为 'b，
// 这要求输入生命周期 'a 必须活得比 'b 长 ('a: 'b)
fn select_helper<'a, 'b>(x: &'a str, _y: &'b str) -> &'b str 
where
    'a: 'b,
{
    x
}
```

#### 2. 类型与生命周期的约束：`T: 'a`

读作“类型 `T` 必须活得和 `'a` 一样久”（T outlives 'a）。这意味：
- 类型 `T` 中持有的**任何引用**其生命周期都不能短于 `'a`。
- 如果 `T` 是一个不包含任何引用的全所有权类型（如 `String` 或 `i32`），它天然满足 `T: 'static`，因而也必然满足任意 `T: 'a` 的要求。

这在为包含引用的泛型结构体实现特征（如多线程派发任务）时非常关键：

```rust
use std::thread;

// `T: 'static` 约束意味着泛型数据不能带有任何比 'static 短的引用，
// 这样在多线程并发执行时，即使主线程退出，子线程执行 `T` 也是安全的
fn spawn_task<T>(task: T) 
where
    T: FnOnce() + Send + 'static,
{
    thread::spawn(move || {
        task();
    });
}
```

---

## RAII 与 Drop

### 资源获取即初始化（RAII）

Rust 强制实施 RAII（Resource Acquisition Is Initialization），变量离开作用域时自动释放资源：

```rust
fn create_box() {
    let _box1 = Box::new(3i32);
    // `_box1` 在这里被销毁，内存得到释放
}

fn main() {
    let _box2 = Box::new(5i32);
    
    {
        let _box3 = Box::new(4i32);
        // `_box3` 在这里被销毁
    }
    
    for _ in 0u32..1_000 {
        create_box();
    }
    
    // `_box2` 在这里被销毁
}
```

### 析构函数（Drop）

可以通过实现 `Drop` trait 来自定义析构行为：

```rust
struct ToDrop;

impl Drop for ToDrop {
    fn drop(&mut self) {
        println!("ToDrop is being dropped");
    }
}

fn main() {
    let _x = ToDrop;
    println!("Made a ToDrop!");
} // _x 在这里被 drop
```

### 提前 drop

可以使用 `std::mem::drop` 显式地提前 drop 值：

```rust
fn main() {
    let _x = ToDrop;
    println!("Made a ToDrop!");
    
    drop(_x);
    println!("Dropped early!");
}
```

---

## 高级特性

### 部分移动

在单个变量的解构过程中，可以同时使用移动和引用模式绑定：

```rust
fn main() {
    #[derive(Debug)]
    struct Person {
        name: String,
        age: u8,
    }

    let person = Person {
        name: String::from("Alice"),
        age: 20,
    };

    // `name` 从 person 中移走，但 `age` 被引用
    let Person { name, ref age } = person;

    println!("The person's age is {}", age);
    println!("The person's name is {}", name);

    // 错误！部分移动值：`person` 部分被移动
    // println!("The person struct is {:?}", person);

    // `person.age` 仍然可用，因为我们只是借用了它
    println!("The person's age from person struct is {}", person.age);
}
```

### ref 模式

使用 `ref` 关键字可以在模式匹配中创建引用：

```rust
#[derive(Clone, Copy)]
struct Point { x: i32, y: i32 }

fn main() {
    let c = 'Q';

    // 赋值语句中左边的 `ref` 关键字等价于右边的 `&` 符号
    let ref ref_c1 = c;
    let ref_c2 = &c;

    println!("ref_c1 equals ref_c2: {}", *ref_c1 == *ref_c2);

    let point = Point { x: 0, y: 0 };

    // 在解构一个结构体时 `ref` 同样有效
    let _copy_of_x = {
        let Point { x: ref ref_to_x, y: _ } = point;
        *ref_to_x
    };

    // `point` 的可变拷贝
    let mut mutable_point = point;

    {
        // `ref` 可以与 `mut` 结合以创建可变引用
        let Point { x: _, y: ref mut mut_ref_to_y } = mutable_point;
        *mut_ref_to_y = 1;
    }

    println!("point is ({}, {})", point.x, point.y);
    println!("mutable_point is ({}, {})", mutable_point.x, mutable_point.y);
}
```

### 非词法生命周期（NLL）

从 Rust 2018 edition 开始，借用检查器使用非词法生命周期，使得借用分析更加智能：

```rust
fn main() {
    let mut s = String::from("hello");

    let r1 = &s;
    let r2 = &s;
    println!("{} and {}", r1, r2);
    // 新编译器能检测到 r1 和 r2 不再使用

    let r3 = &mut s; // 没问题！
    println!("{}", r3);
}
```

---

## 实践示例

### 示例 1：修复所有权错误

```rust
// 错误的代码
fn main() {
    let s = String::from("hello");
    take_ownership(s);
    println!("{}", s); // 错误！s 已被移动
}

fn take_ownership(some_string: String) {
    println!("{}", some_string);
}

// 解决方案 1：使用引用
fn main() {
    let s = String::from("hello");
    take_reference(&s);
    println!("{}", s); // ✅ 正常工作
}

fn take_reference(some_string: &String) {
    println!("{}", some_string);
}

// 解决方案 2：返回所有权
fn main() {
    let s = String::from("hello");
    let s = take_and_return(s);
    println!("{}", s); // ✅ 正常工作
}

fn take_and_return(some_string: String) -> String {
    println!("{}", some_string);
    some_string
}
```

### 示例 2：生命周期实践

```rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() {
        x
    } else {
        y
    }
}

fn main() {
    let string1 = String::from("abcd");
    let string2 = "xyz";

    let result = longest(string1.as_str(), string2);
    println!("The longest string is {}", result);
}
```

### 示例 3：结构体与生命周期

```rust
struct Book<'a> {
    title: &'a str,
    author: &'a str,
}

fn main() {
    let title = String::from("Rust Programming");
    let author = String::from("Steve Klabnik");
    
    let book = Book {
        title: &title,
        author: &author,
    };
    
    println!("{} by {}", book.title, book.author);
}
```

---

> [!TIP]
> **下一步**：掌握了所有权和生命周期后，请继续学习 [特征与泛型](6-traits-generics.md)，了解 Rust 的类型系统和抽象能力。
