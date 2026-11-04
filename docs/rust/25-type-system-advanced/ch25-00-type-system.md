---
title: "Rust 类型系统深化"
sidebar_position: 114
---

# Rust 类型系统深化

Rust 的类型系统是其安全保证的核心支柱。在[第十章](../10-generics-traits-lifetimes/ch10-00-generics.md)中，我们学习了泛型、trait 和生命周期的基础。本章将深入探索类型系统的高级特性，这些特性在系统库、框架和高性能代码中被广泛使用。

## 本章涵盖的主题

| 章节 | 特性 | 稳定版本 |
|------|------|---------|
| [泛型关联类型](ch25-01-gat.md) | GAT（Generic Associated Types） | Rust 1.65 |
| [高阶 Trait Bound](ch25-02-hrtb.md) | HRTB（Higher-Ranked Trait Bounds） | 早期稳定 |
| [PhantomData 与型变](ch25-03-phantomdata.md) | 零开销类型标记与协变/逆变/不变 | 早期稳定 |
| [Const 泛型](ch25-04-const-generics.md) | 编译期常量参数化 | Rust 1.51+ |

## 适合的读者

本章面向已经熟悉以下内容的读者：

- 泛型函数与泛型结构体
- trait 定义与实现，包括关联类型
- 生命周期标注与借用规则
- 基础 `unsafe` Rust 概念（部分章节涉及）

## 这些特性解决什么问题

### 泛型关联类型（GAT）

在 GAT 稳定之前，借用式迭代器（每次迭代返回引用而非所有权值）无法用安全的 Rust 表达。GAT 让关联类型本身携带生命周期参数，从根本上解决了这一限制。

### 高阶 Trait Bound（HRTB）

当一个函数接受一个闭包，且这个闭包需要对**任意**生命周期都有效时，普通的生命周期标注无法表达，需要 `for<'a>` 语法。

### PhantomData 与型变

裸指针不携带所有权信息，编译器无法推断 `Drop` 顺序和借用规则。`PhantomData` 是告知编译器「这个类型逻辑上拥有或借用某个值」的零成本工具。

### Const 泛型

在编译期就确定数组大小、矩阵维度，让类型系统表达固定长度与维度约束。Const 泛型本身不保证消除边界检查；编译器仍会按通常规则检查索引。
