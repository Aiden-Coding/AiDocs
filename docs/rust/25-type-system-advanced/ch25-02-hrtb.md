---
title: "高阶 Trait Bound（HRTB）"
sidebar_position: 116
---

# 高阶 Trait Bound

高阶 Trait Bound（*Higher-Ranked Trait Bounds*，简称 HRTB）用于约束一个 trait 对**所有可能的生命周期**都成立，而不仅仅是某个特定的生命周期。

## 问题背景

考虑一个接受闭包的函数：

```rust
// 普通 Fn bound：'a 是调用者确定的某个具体生命周期
fn apply<'a, F: Fn(&'a str) -> &'a str>(f: F, s: &'a str) -> &'a str {
    f(s)
}
```

这看起来没问题，但当我们想**存储**这个闭包，并在不同生命周期的字符串上调用时，问题就出现了：存储的闭包只对创建时推断出的那一个 `'a` 有效，无法复用于其他生命周期。

## HRTB 语法

使用 `for<'a>` 语法表达「对任意生命周期 `'a` 都成立」：

```rust
// HRTB：闭包对任意生命周期的 &str 都能返回 &str
fn apply_hrtb<F>(f: F, s: &str) -> &str
where
    F: for<'a> Fn(&'a str) -> &'a str,
{
    f(s)
}
```

`for<'a>` 的含义是「对于任意可能的生命周期 `'a`，`F` 都实现了 `Fn(&'a str) -> &'a str`」。这比固定一个 `'a` 要求更强，表达能力更高。

## 在 trait object 中使用

HRTB 最常见的场景是存储对任意生命周期都有效的闭包：

```rust
// 存储可对任意生命周期的 &str 操作的闭包
struct Transformer {
    f: Box<dyn for<'a> Fn(&'a str) -> &'a str>,
}

impl Transformer {
    fn new(f: impl for<'a> Fn(&'a str) -> &'a str + 'static) -> Self {
        Self { f: Box::new(f) }
    }

    fn transform<'a>(&self, s: &'a str) -> &'a str {
        (self.f)(s)
    }
}

fn main() {
    let t = Transformer::new(|s| s.trim());

    let owned = String::from("  hello  ");
    let result = t.transform(&owned);
    println!("{}", result); // "hello"
}
```

## 编译器的自动推断

在实践中，大多数闭包的 `Fn` Bound 会被编译器自动提升为 HRTB，无需手写 `for<'a>`。以下两种写法通常等价：

```rust
// 手动写 HRTB
fn call<F: for<'a> Fn(&'a str) -> usize>(f: F) -> usize {
    f("hello")
}

// 编译器自动推断（等价）
fn call_auto<F: Fn(&str) -> usize>(f: F) -> usize {
    f("hello")
}
```

当 `Fn` 的参数中含有引用且没有指定具体生命周期时，编译器会自动引入 HRTB 约束。

## 需要显式写出 HRTB 的场景

以下情况需要明确写出 `for<'a>`：

1. **手动实现 trait**，而非使用闭包：

```rust
struct MyFn;

// 为自定义类型实现 Fn，需要明确指定 HRTB 范围
impl<'a> Fn<(&'a str,)> for MyFn {
    extern "rust-call" fn call(&self, (s,): (&'a str,)) -> &'a str {
        s
    }
}
```

2. **泛型约束中要明确区分**普通生命周期参数和 HRTB：

```rust
// F 只对调用者给出的 'a 有效
fn limited<'a, F: Fn(&'a str) -> &'a str>(f: F, s: &'a str) -> &'a str { f(s) }

// F 对任意生命周期都有效（要求更严格）
fn universal<F: for<'a> Fn(&'a str) -> &'a str>(f: F, s: &str) -> &str { f(s) }
```

3. **结合 GAT 使用**（详见[泛型关联类型](ch25-01-gat.md)章节）

## 常见编译错误

```rust
// 错误示例：试图存储只对某个具体生命周期有效的闭包
fn make_transformer<'a>(prefix: &'a str) -> Box<dyn Fn(&'a str) -> String + 'a> {
    // 这个 trait object 只在 'a 存活期间有效
    Box::new(move |s| format!("{}{}", prefix, s))
}
// 问题：返回的 Box 无法在 'a 结束后使用
```

正确做法是让闭包捕获 `String`（拥有所有权），而非捕获引用，以摆脱生命周期绑定。
