---
title: "所有权常见坑"
sidebar_position: 19
---

# 所有权常见坑

遇到所有权错误时，不要先盲目添加 `clone()` 或生命周期标注。先确认值由谁拥有、借用会持续到哪里，以及函数真正需要的是所有权还是访问权。基础规则和完整示例见[所有权规则与代码案例](./ch04-04-ownership-rules-and-examples.md)。

## 把移动误认为复制

赋值和传参不会自动复制 `String`、`Vec<T>` 等非 `Copy` 值。移动后，原绑定不能再读取：

```rust,ignore,does_not_compile
fn main() {
    let name = String::from("Rust");
    let owned_name = name;

    println!("{name}"); // 编译失败：所有权已移动到 owned_name
}
```

若函数只需读取数据，优先借用，避免“传入再返回”或不必要的克隆：

```rust
fn print_name(name: &str) {
    println!("{name}");
}

fn main() {
    let name = String::from("Rust");
    print_name(&name);
    println!("{name}"); // 所有权仍属于 main
}
```

只有调用方和接收方都需要独立拥有数据时，才考虑 `clone()`；它可能复制堆数据并分配内存。函数参数何时用 `String`、`&String` 或 `&str`，见[所有权规则与代码案例中的字符串类型说明](./ch04-04-ownership-rules-and-examples.md)。

## 误以为借用总持续到代码块结束

借用通常持续到最后一次使用，而不是一律持续到所在作用域结束。下面的可变借用合法，因为不可变引用已不再使用：

```rust
fn main() {
    let mut text = String::from("hello");
    let read_only = &text;
    println!("{read_only}");

    let writable = &mut text;
    writable.push_str(", Rust");
    println!("{writable}");
}
```

反过来，如果不可变引用之后还要使用，就不能在两者重叠期间创建可变引用：

```rust,ignore,does_not_compile
fn main() {
    let mut text = String::from("hello");
    let read_only = &text;
    let writable = &mut text;

    println!("{read_only} {writable}");
}
```

不要只看花括号判断借用范围；看引用最后一次被使用的位置。`String` 切片也会借用原字符串，因此切片仍在使用时，不能清空或修改原字符串。详见[引用与借用](./ch04-02-references-and-borrowing.md)和[切片类型](./ch04-03-slices.md)。

## 尝试返回局部变量的引用

局部变量在函数返回时离开作用域。返回指向它的引用会产生悬垂引用，Rust 会拒绝：

```rust,ignore,does_not_compile
fn dangling_reference<'a>() -> &'a String {
    let text = String::from("hello");
    &text
}
```

需要把结果交给调用方持有时，返回拥有所有权的值：

```rust
fn make_greeting() -> String {
    String::from("hello")
}
```

若结果来自输入，返回输入的借用，并让签名表达这种关系：

```rust
fn first_word(text: &str) -> &str {
    text.split_whitespace().next().unwrap_or("")
}
```

生命周期标注只能描述引用之间已有的有效关系，不能让局部变量活得更久。

## 把 `move` 当成“闭包只能调用一次”

`move` 控制闭包如何捕获环境变量，不直接决定闭包实现 `Fn`、`FnMut` 还是 `FnOnce`。闭包体只读取捕获值时，即使使用 `move`，仍可能多次调用：

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

若被捕获值实现 `Copy`，按值捕获会复制它，外层绑定仍可用；非 `Copy` 值通常会移动进闭包。要判断是否能重复调用，还要看闭包体是否消费捕获值。详见[`move` 关键字与闭包调用 trait](./ch04-04-ownership-rules-and-examples.md#move-keyword)。

## 遇到错误就加 `clone()`

`clone()` 可以解决“需要两份独立所有权”的问题，但常常掩盖了接口不该取得所有权这一事实。修改前先问：

- 函数是否只读取数据？改用 `&T`，文本参数通常用 `&str`。
- 函数是否需要修改调用方的数据？考虑 `&mut T`。
- 调用方是否还要在函数之后使用原值？若函数应消费数据，明确让它接收所有权；否则改为借用。
- 两处是否确实需要独立拥有同一份数据？只有此时才考虑克隆，或根据共享模型选择 `Rc<T>` / `Arc<T>`。

编译器常见提示也能帮助定位：`E0382` 通常表示值已移动，`E0502` 或 `E0499` 通常表示借用冲突，`E0515` 通常表示返回了局部数据的引用。先追踪所有权和引用的使用范围，再按错误原因修正。
