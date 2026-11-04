---
title: "深入 Future：Pin 与 Unpin"
sidebar_position: 98
---

# 深入 Future：Pin 与 Unpin

在深入学习异步编程时，你会不可避免地遇到 `Pin`、`Unpin` 和"固定"（pinning）的概念。这是 Rust 异步系统中最难理解的部分之一，但理解它对于手写 Future、使用 trait object 以及正确处理异步值至关重要。

## 自引用结构体：问题的根源

Rust 的异步函数会被编译器转换成**状态机枚举**（见 [Future 内部原理](ch21-05-future-internals.md)）。这个状态机有时会产生**自引用结构体**（self-referential struct）——结构体中某个字段持有指向自身另一个字段的指针。

```rust
// 假设编译器生成了类似这样的状态机（伪代码）
struct MyFutureState {
    buffer: Vec<u8>,
    // 指向 buffer 内部某个位置的引用！
    slice: *const u8, // 指向 buffer[0]
}
```

问题在于：**如果这个结构体被移动（move）到内存中的另一个位置，`slice` 指针就会失效，因为它仍然指向旧地址**。

```
移动前：
  buffer 位于地址 0x1000
  slice  = 0x1000  ✅ 有效

移动后：
  buffer 位于地址 0x2000
  slice  = 0x1000  ❌ 悬空指针！
```

在普通 Rust 代码中，借用检查器会防止这类问题。但对于跨 `.await` 保存状态的异步状态机，编译器无法静态防止所有移动情况，因此需要运行时机制——这就是 `Pin` 存在的原因。

## Pin\<P\> 类型

`Pin<P>` 是一个包装指针类型的智能指针，其中 `P` 通常是 `&mut T`、`Box<T>` 等指针类型。它的核心语义是：**被 `Pin` 包裹的值在内存中不能移动**。

```rust
use std::pin::Pin;

// Pin<&mut T> 保证 T 在内存中的位置不会改变
fn poll_my_future(pinned: Pin<&mut MyFuture>) {
    // 通过 Pin<&mut T> 访问 T，编译器保证不会发生移动
}
```

`Pin` 通过类型系统强制执行这一约束：它**不暴露** `&mut T`（普通可变引用），因为持有 `&mut T` 就可以通过 `std::mem::swap` 等方式移动值。

### 创建 Pin 的方式

```rust
use std::pin::Pin;

// 方式一：Box::pin —— 堆分配并固定
let pinned: Pin<Box<dyn Future<Output = ()>>> = Box::pin(async {
    println!("固定在堆上");
});

// 方式二：std::pin::pin! 宏（Rust 1.68+）—— 栈上固定
async fn example() {
    let fut = async { 42u32 };
    let pinned = std::pin::pin!(fut); // 固定在栈上
    let result = pinned.await;
    println!("{}", result);
}

// 方式三：unsafe 的 Pin::new_unchecked（需要自行保证安全性）
// 仅在实现自定义数据结构时使用
```

## Unpin Marker Trait

`Unpin` 是一个标记 trait（marker trait），实现了 `Unpin` 的类型可以安全地从 `Pin` 中移出，因为它们不含自引用，移动不会导致问题。

Rust 标准库中绝大多数类型都自动实现了 `Unpin`：

- 所有基本类型：`i32`、`f64`、`bool` 等
- `String`、`Vec<T>`（当 `T: Unpin`）
- `Box<T>`（当 `T: Unpin`）
- `Arc<T>`、`Mutex<T>` 等

**`!Unpin`**（未实现 Unpin）的类型：

- 由 `async fn` / `async` 块生成的 Future（可能含自引用状态机）
- 手动标记为 `PhantomPinned` 的类型

```rust
use std::marker::PhantomPinned;

// 手动标记为 !Unpin，防止被意外移动
struct SelfReferential {
    data: String,
    ptr: *const String, // 指向 self.data
    _pin: PhantomPinned, // 告知编译器：这个类型不可移动
}
```

## Pin 在实践中的用法

### 存储 async fn 的返回值

当你需要将 Future 存储在结构体字段中，或作为 trait object 传递时，需要使用 `Pin<Box<dyn Future>>`：

```rust
use std::future::Future;
use std::pin::Pin;

type BoxFuture<'a, T> = Pin<Box<dyn Future<Output = T> + Send + 'a>>;

struct TaskRunner {
    // 存储任意异步任务
    pending_tasks: Vec<BoxFuture<'static, ()>>,
}

impl TaskRunner {
    fn add_task<F>(&mut self, fut: F)
    where
        F: Future<Output = ()> + Send + 'static,
    {
        self.pending_tasks.push(Box::pin(fut));
    }
}
```

### 完整示例：动态分发异步任务

```rust
use std::future::Future;
use std::pin::Pin;

// 定义一个返回 Pin<Box<dyn Future>> 的异步工厂
fn create_task(id: u32) -> Pin<Box<dyn Future<Output = String> + Send>> {
    Box::pin(async move {
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        format!("任务 {} 完成", id)
    })
}

#[tokio::main]
async fn main() {
    let tasks: Vec<Pin<Box<dyn Future<Output = String> + Send>>> =
        (1..=5).map(create_task).collect();

    let results = futures::future::join_all(tasks).await;
    for result in results {
        println!("{}", result);
    }
}
```

## 什么时候需要关心 Pin

大多数情况下，你**不需要直接操作 Pin**，因为：

- 使用 `async/await` 语法时，编译器自动处理 Pin
- Tokio 的 `spawn`、`join!` 等工具内部已经处理好 Pin

**以下场景需要显式使用 Pin：**

1. **手写 `Future` impl**：`poll` 方法签名要求 `Pin<&mut Self>`
2. **存储 Future 在结构体字段中**：需要 `Pin<Box<dyn Future<...>>>`
3. **实现组合子**（combinator）：如自定义 `join`、`select` 等
4. **使用 `dyn Future` trait object**：动态分发时必须固定

## 安全操作 Pin 中的值

对于实现了 `Unpin` 的类型，可以安全地获取 `&mut T`：

```rust
use std::pin::Pin;

fn modify_unpin(mut pinned: Pin<&mut String>) {
    // String 实现了 Unpin，可以安全获取 &mut String
    let s: &mut String = pinned.as_mut().get_mut();
    s.push_str(" 追加内容");
}
```

对于 `!Unpin` 的类型，必须使用 `unsafe`：

```rust
use std::pin::Pin;

// ⚠️ 只有在确定不会发生移动时才能这样做
unsafe fn get_mut_unchecked<T>(pinned: Pin<&mut T>) -> &mut T {
    // SAFETY: 调用者保证在此引用的生命周期内不移动 T
    Pin::get_unchecked_mut(pinned)
}
```

## 警示：绝对不要对 !Unpin 类型不当操作

```rust
use std::pin::Pin;
use std::marker::PhantomPinned;

struct NotMovable {
    data: u32,
    _pin: PhantomPinned,
}

async fn dangerous_example() {
    let mut val = NotMovable { data: 42, _pin: PhantomPinned };
    let pinned = unsafe { Pin::new_unchecked(&mut val) };

    // ❌ 绝对不要这样做：在 Pin 存在期间移动原值
    // let moved = val; // 这会导致 pinned 成为悬空指针！

    // ✅ 通过 pinned 访问数据，不要移动原值
    drop(pinned); // 先释放 Pin
    // 现在才可以移动 val（但已经没有意义了）
}
```

## Pin 与 async 生态

标准库和常用 crate 中常见的 Pin 相关类型：

```rust
// tokio 中的常见 Pin 用法
use tokio::io::{AsyncRead, AsyncWrite};
use std::pin::Pin;
use std::task::{Context, Poll};

// AsyncRead trait 要求 Pin<&mut Self>
// 这正是因为异步 I/O 对象内部可能含有跨 await 的状态
pub trait AsyncRead {
    fn poll_read(
        self: Pin<&mut Self>,
        cx: &mut Context<'_>,
        buf: &mut tokio::io::ReadBuf<'_>,
    ) -> Poll<std::io::Result<()>>;
}
```

## 小结

- **自引用结构体**是 `async` 状态机的固有特性，移动会导致指针失效
- **`Pin<P>`** 通过类型系统保证被包裹的值不会被移动
- **`Unpin`** 是大多数普通类型都实现的标记 trait，表示可以安全移动
- 日常使用 `async/await` 不需要手动处理 Pin；手写 Future 或使用 trait object 时才需要
- 使用 `Box::pin(fut)` 或 `std::pin::pin!(fut)` 是最安全的固定方式
- **永远不要对 `!Unpin` 类型在 `Pin` 存在期间移动原值**

下一节将探讨异步流（Stream）——处理异步数据序列的强大抽象。
