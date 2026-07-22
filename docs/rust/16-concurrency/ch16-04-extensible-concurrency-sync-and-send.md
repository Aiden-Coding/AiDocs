---
title: "使用 Sync 和 Send trait 的可扩展并发"
sidebar_position: 77
---

## 使用 `Sync` 和 `Send` trait 的可扩展并发

Rust 的并发模型中一个有趣的方面是：语言本身对并发知之 **甚少**。我们之前讨论的几乎所有内容，都属于标准库，而不是语言本身的内容。由于不需要语言提供并发相关的基础设施，并发方案不受标准库或语言所限：我们可以编写自己的或使用别人编写的并发功能。

然而有两个并发概念是内嵌于语言中的：`std::marker` 中的 `Sync` 和 `Send` trait。

### 通过 `Send` 允许在线程间转移所有权

`Send` 标记 trait 表明类型的所有权可以在线程间传递。几乎所有的 Rust 类型都是`Send` 的，不过有一些例外，包括 `Rc<T>`：这是不能 `Send` 的，因为如果克隆了 `Rc<T>` 的值并尝试将克隆的所有权转移到另一个线程，这两个线程都可能同时更新引用计数。为此，`Rc<T>` 被实现为用于单线程场景，这时不需要为拥有线程安全的引用计数而付出性能代价。

因此，Rust 类型系统和 trait bound 确保永远也不会意外的将不安全的 `Rc<T>` 在线程间发送。当尝试在示例 16-14 中这么做的时候，会得到错误 `the trait Send is not implemented for Rc<Mutex<i32>>`。而使用标记为 `Send` 的 `Arc<T>` 时，就没有问题了。

如下示例展示了 `Rc<T>` 与 `Arc<T>` 在跨线程传递时的行为差异：

```rust
use std::rc::Rc;
use std::sync::Arc;
use std::thread;

fn main() {
    // 错误演示：Rc<T> 没有实现 Send，不能跨线程传输
    // let rc_val = Rc::new(42);
    // thread::spawn(move || {
    //     println!("{}", rc_val); // 编译错误：`Rc<i32>` cannot be sent between threads safely
    // });

    // 正确演示：Arc<T> 实现了 Send 和 Sync，可安全跨线程发送
    let arc_val = Arc::new(42);
    let arc_clone = Arc::clone(&arc_val);

    let handle = thread::spawn(move || {
        println!("线程中获取 Arc 值: {}", arc_clone);
    });

    handle.join().unwrap();
}
```

任何完全由 `Send` 的类型组成的类型也会自动被标记为 `Send`。几乎所有基本类型都是 `Send` 的，除了第 19 章将会讨论的裸指针（raw pointer）。

### `Sync` 允许多线程访问

`Sync` 标记 trait 表明一个实现了 `Sync` 的类型可以安全的在多个线程中拥有其值的引用。换一种方式来说，对于任意类型 `T`，如果 `&T`（`T` 的引用）是 `Send` 的话 `T` 就是 `Sync` 的，这意味着其引用就可以安全的发送到另一个线程。类似于 `Send` 的情况，基本类型是 `Sync` 的，完全由 `Sync` 的类型组成的类型也是 `Sync` 的。

智能指针 `Rc<T>` 也不是 `Sync` 的，出于其不是 `Send` 相同的原因。`RefCell<T>`（第 15 章讨论过）和 `Cell<T>` 系列类型不是 `Sync` 的。`RefCell<T>` 在运行时所进行的借用检查也不是线程安全的。`Mutex<T>` 是 `Sync` 的，正如 [“在线程间共享 `Mutex<T>`”][sharing-a-mutext-between-multiple-threads] 部分所讲的它可以被用来在多线程中共享访问。

下面的代码演示了在多线程中使用 `Mutex<T>` 配合 `Arc<T>` 来实现安全的跨线程共享与修改：

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    // Mutex<T> 是 Sync 的，借助 Arc<T> 可以在多线程间共享并发安全的数据
    let counter = Arc::new(Mutex::new(0));
    let mut handles = vec![];

    for _ in 0..10 {
        let counter_clone = Arc::clone(&counter);
        let handle = thread::spawn(move || {
            let mut num = counter_clone.lock().unwrap();
            *num += 1;
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("最终计数结果: {}", *counter.lock().unwrap());
}
```

### 手动实现 `Send` 和 `Sync` 是不安全的

通常并不需要手动实现 `Send` 和 `Sync` trait，因为由 `Send` 和 `Sync` 的类型组成的类型，自动就是 `Send` 和 `Sync` 的。因为他们是标记 trait，甚至都不需要实现任何方法。他们只是用来加强并发相关的不可变性的。

手动实现这些标记 trait 涉及到编写不安全的 Rust 代码，第 19 章将会讲述具体的方法；当前重要的是，在创建新的由不是 `Send` 和 `Sync` 的部分构成的并发类型时需要多加小心，以确保维持其安全保证。[《Rust 秘典》][nomicon] 中有更多关于这些保证以及如何维持他们的信息。

[nomicon]: https://doc.rust-lang.org/stable/nomicon/

## 总结

这不会是本书最后一个出现并发的章节：第 20 章的项目会在更现实的场景中使用这些概念，而不像本章中讨论的这些小例子。

正如之前提到的，因为 Rust 本身很少有处理并发的部分内容，有很多的并发方案都由 crate 实现。他们比标准库要发展的更快；请在网上搜索当前最新的用于多线程场景的 crate。

Rust 提供了用于消息传递的通道，和像 `Mutex<T>` 和 `Arc<T>` 这样可以安全的用于并发上下文的智能指针。类型系统和借用检查器会确保这些场景中的代码，不会出现数据竞争和无效的引用。一旦代码可以编译了，我们就可以坚信这些代码可以正确的运行于多线程环境，而不会出现其他语言中经常出现的那些难以追踪的 bug。并发编程不再是什么可怕的概念：无所畏惧地并发吧！

接下来，让我们讨论一下当 Rust 程序变得更大时，有哪些符合语言习惯的问题建模方法和结构化解决方案，以及 Rust 的风格是如何与面向对象编程（Object Oriented Programming）中那些你所熟悉的概念相联系的。

[sharing-a-mutext-between-multiple-threads]: ch16-03-shared-state#在线程间共享-mutext
