---
title: "泛型关联类型（GAT）"
sidebar_position: 115
---

# 泛型关联类型

泛型关联类型（*Generic Associated Types*，简称 GAT）于 Rust 1.65 正式稳定，是 Rust 类型系统的一次重大扩展。GAT 允许 trait 中的**关联类型本身携带泛型参数**（包括生命周期和类型参数），解决了此前多年无法用安全 Rust 表达的设计模式。

## 核心概念

普通关联类型是固定的：

```rust
trait Iterator {
    type Item;  // 固定类型，不带参数
    fn next(&mut self) -> Option<Self::Item>;
}
```

GAT 允许关联类型带参数：

```rust
trait LendingIterator {
    type Item<'a> where Self: 'a;  // 关联类型带生命周期参数
    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>>;
}
```

`where Self: 'a` 是必要的约束，确保 `Self` 的存活时间不短于借用 `'a`。

## 经典场景：借用式迭代器

标准库 `Iterator` 的 `Item` 是值类型，每次 `next` 都会**转移**元素所有权。这意味着从切片迭代时，只能迭代副本（`Copy` 类型）或克隆数据。

借用式迭代器（*lending iterator*）每次返回指向内部数据的**引用**，零拷贝且不转移所有权：

```rust
trait LendingIterator {
    type Item<'a> where Self: 'a;

    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>>;
}

// 窗口迭代器：每次返回切片的一段，不复制数据
struct WindowIter<'s> {
    slice: &'s [i32],
    pos: usize,
    window: usize,
}

impl<'s> LendingIterator for WindowIter<'s> {
    type Item<'a> = &'a [i32] where Self: 'a;

    fn next<'a>(&'a mut self) -> Option<&'a [i32]> {
        if self.pos + self.window <= self.slice.len() {
            let win = &self.slice[self.pos..self.pos + self.window];
            self.pos += 1;
            Some(win)
        } else {
            None
        }
    }
}

fn main() {
    let data = vec![1, 2, 3, 4, 5];
    let mut iter = WindowIter { slice: &data, pos: 0, window: 3 };

    while let Some(window) = iter.next() {
        println!("{:?}", window);
        // 输出：[1, 2, 3]  [2, 3, 4]  [3, 4, 5]
    }
}
```

## 无 GAT 时的痛点

在 GAT 稳定前，同样的场景需要在 trait 层面引入额外的生命周期参数，或依赖 `unsafe` 和裸指针：

```rust
// GAT 之前的曲线救国写法：trait 本身带生命周期参数
trait OldLendingIterator<'a> {
    type Item;
    fn next(&'a mut self) -> Option<Self::Item>;
}
// 缺陷：无法在同一个 trait object 中混用不同生命周期
```

GAT 让这类设计在类型层面直接表达，无需 `unsafe`。

## Container trait：类型参数化的关联类型

GAT 不仅支持生命周期参数，也支持类型参数：

```rust
trait Container {
    type Item<T>;           // 关联类型带类型参数
    fn empty<T>() -> Self::Item<T>;
    fn insert<T>(container: &mut Self::Item<T>, item: T);
}

struct VecContainer;

impl Container for VecContainer {
    type Item<T> = Vec<T>;

    fn empty<T>() -> Vec<T> {
        Vec::new()
    }

    fn insert<T>(container: &mut Vec<T>, item: T) {
        container.push(item);
    }
}
```

这让「容器类型」的抽象成为可能，而无需将元素类型提升到 trait 本身的泛型参数上。

## 使用限制与注意事项

- 目前 `for<'a>` 语法（HRTB）与 GAT 组合使用时有部分已知限制，详见[高阶 Trait Bound](ch25-02-hrtb.md)章节
- GAT 的 `where` 子句中必须包含必要的约束，编译器有时会提示遗漏的约束
- 标准库的 `Iterator` 目前不会改用 GAT，二者并存，`LendingIterator` 作为独立 trait 在社区生态中推进
