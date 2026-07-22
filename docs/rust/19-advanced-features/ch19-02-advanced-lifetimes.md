---
title: "高级生命周期"
sidebar_position: 87.5
---

## 高级生命周期

第 10 章 [“生命周期与引用有效性”][lifetimes]<!-- ignore --> 部分，我们学习了如何使用生命周期标注来确保引用在需要的期间保持有效。在本节中，我们将探索生命周期的三个更高级的特性：

* 生命周期子类型（*lifetime subtyping*）
* 生命周期约束（*lifetime bounds*）
* 特性对象生命周期（*trait object lifetimes*）

### 生命周期子类型确保一个生命周期长于另一个

生命周期子类型（*lifetime subtyping*）指定一个生命周期应当长于另一个生命周期。

假设我们有一个结构体 `Context`，它包含一个字符串切片的引用：

```rust
struct Context<'s>(&'s str);
```

现在我们需要定义另一个结构体 `Parser`，它持有 `Context` 的引用：

```rust
struct Parser<'c, 's> {
    context: &'c Context<'s>,
}
```

这里 `Parser` 包含对 `Context` 的引用，而 `Context` 本身包含对字符串切片的引用。为了保证 `Parser` 中的引用有效，`Context` 的引用生命周期 `'c` 不能长于 `Context` 内部数据字符串切片的生命周期 `'s`。也就是说，`'s` 必须至少和 `'c` 一样长（即 `'s` 活得比 `'c` 久）。

我们可以使用生命周期子类型语法 `'s: 'c`（读作 “生命周期 `'s` 至少和 `'c` 一样长”，或 “`'s` 涵盖 `'c`”）来向编译器表达这种关系：

```rust
struct Parser<'c, 's: 'c> {
    context: &'c Context<'s>,
}
```

如此一来，Rust 编译器就能确保当 `Parser` 存在时，`Context` 及其内部引用的字符串数据都保持有效。

### 生命周期约束指定泛型类型的生命周期

在第 10 章中，我们学习了如何使用 trait bounds 来限制泛型类型。类似地，我们也可以将生命周期约束应用于泛型类型。

例如，假设我们要实现一个持有某种泛型类型 `T` 的引用的结构体 `Ref`：

```rust
struct Ref<'a, T>(&'a T);
```

如果我们尝试编译这段代码，编译器会提示错误，因为 Rust 无法确定泛型类型 `T` 能存活多久。如果 `T` 是一个包含引用的类型，那么 `T` 内部引用的生命周期必须比引用本身的生命周期 `'a` 更长。

为了指定 `T` 中的任何引用都必须活得比 `'a` 久，我们可以使用生命周期约束语法 `T: 'a`：

```rust
struct Ref<'a, T: 'a>(&'a T);
```

这限定了类型 `T` 必须满足生命周期 constraints `'a`：即如果 `T` 包含引用，这些引用的生命周期必须至少与 `'a` 一样长。如果是拥有所有权的类型（如 `i32` 或 `String`），则自动满足 `T: 'static` 约束，进而满足任何 `T: 'a` 约束。

### 特性对象生命周期

在第 17 章 [“顾及不同类型值的 trait 对象”][trait-objects]<!-- ignore --> 部分，我们探讨了使用 trait 对象来实现多态。当 trait 对象内部包含引用时，其生命周期管理需要特别注意。

在 Rust 中，特性对象（*trait objects*）如 `Box<dyn Redo>` 或 `&dyn Redo` 有如下默认生命周期规则：

1. 特性对象的默认生命周期是 `'static`。例如，`Box<dyn Redo>` 实际上是 `Box<dyn Redo + 'static>`。
2. 如果 trait 对象绑定到了带有生命周期的引用，如 `&'a dyn Redo`，则默认生命周期继承该引用的生命周期 `'a`，即 `&'a (dyn Redo + 'a)`。

如果我们需要覆盖这些默认规则，可以显式添加生命周期标注：

```rust
trait Redo {
    fn redo(&self);
}

struct MyStruct<'a> {
    // 显式指定 dyn Trait 的生命周期至少为 'a
    redo_obj: Box<dyn Redo + 'a>,
}
```

这里 `Box<dyn Redo + 'a>` 明确指定了 trait 对象包含的数据及其引用的生命周期必须至少与 `'a` 一样长。

[lifetimes]: ../10-generics-traits-lifetimes/ch10-03-lifetime-syntax.md
[trait-objects]: ../17-oop/ch17-02-trait-objects.md
