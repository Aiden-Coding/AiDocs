---
title: "Future 与 async/await 语法"
sidebar_position: 96
---

# Future 与 async/await 语法

## Future trait 定义

`Future` 是 Rust 异步编程的核心抽象，定义在标准库 `std::future` 模块中：

```rust
pub trait Future {
    /// Future 完成时产生的值的类型
    type Output;

    /// 尝试将 Future 推进到完成状态
    ///
    /// 若未完成，返回 `Poll::Pending` 并安排在就绪时通过 `cx` 中的 Waker 通知执行器。
    /// 若已完成，返回 `Poll::Ready(val)`。
    fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output>;
}
```

关键点：

- `poll` 方法接受 `Pin<&mut Self>`，这是为了支持含有自引用的异步状态机（详见 [Pin 与 Unpin](ch21-03-more-futures.md)）
- `Context` 包含一个 `Waker`，Future 可在无法继续时保存 Waker，待条件就绪后调用 `Waker::wake()` 通知执行器重新 poll
- Future **惰性求值**：创建 Future 本身不执行任何操作，必须通过 `.await` 或执行器驱动才会运行

## async fn：编译器的魔法

`async fn` 是创建 Future 最自然的方式。编译器会将其转换为返回 `impl Future<Output = T>` 的普通函数：

```rust
// 我们写的代码
async fn greet(name: &str) -> String {
    format!("你好，{}！", name)
}

// 编译器大致等价于（简化版）
fn greet(name: &str) -> impl Future<Output = String> + '_ {
    async move {
        format!("你好，{}！", name)
    }
}
```

这意味着调用 `greet("Alice")` 只是创建了一个 Future 对象，**并不执行函数体**。只有对返回值调用 `.await` 时，才会驱动执行器轮询这个 Future。

### async 块

除了 `async fn`，还可以在任意位置使用 `async` 块创建匿名 Future：

```rust
use tokio::fs;

async fn read_config() -> String {
    // async 块：在 async fn 内部创建局部 Future
    let content = async {
        fs::read_to_string("config.toml").await.unwrap_or_default()
    }
    .await;

    content
}
```

**`async fn` 与 `async` 块的区别：**

| 对比维度 | `async fn` | `async` 块 |
|---|---|---|
| 位置 | 函数定义 | 任意表达式位置 |
| 命名 | 有函数名 | 匿名 |
| 生命周期推断 | 自动捕获参数生命周期 | 需手动处理（通常用 `async move`） |
| 返回类型标注 | 在函数签名中声明 | 由块内最后一个表达式推断 |
| 适用场景 | 可复用的异步逻辑 | 局部的一次性异步操作 |

## .await 操作符的语义

`.await` 是异步编程的核心操作符，其语义是：

1. 对当前 Future 调用 `poll`
2. 若结果为 `Poll::Ready(val)`，解包 `val` 并继续执行
3. 若结果为 `Poll::Pending`，**暂停当前任务**，将控制权让回执行器，执行器可以去运行其他就绪任务
4. 当 Waker 被唤醒后，执行器重新 poll，循环直至 Ready

`.await` **只能在 `async` 上下文（`async fn` 或 `async` 块）中使用**，这是编译期强制要求。

## 完整示例：异步 HTTP 请求

以下示例使用 `reqwest` 库并发发送 HTTP 请求，展示 async/await 在实际项目中的用法。

依赖配置：

```toml
[dependencies]
tokio = { version = "1", features = ["full"] }
reqwest = { version = "0.12", features = ["json"] }
serde = { version = "1", features = ["derive"] }
```

代码示例：

```rust
use reqwest::Client;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
struct Post {
    id: u32,
    title: String,
    body: String,
}

async fn fetch_post(client: &Client, id: u32) -> Result<Post, reqwest::Error> {
    let url = format!("https://jsonplaceholder.typicode.com/posts/{}", id);
    let post = client
        .get(&url)
        .send()
        .await?           // 等待发送请求完成
        .json::<Post>()
        .await?;          // 等待响应体反序列化完成
    Ok(post)
}

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let client = Client::new();

    println!("开始获取文章...");
    let post = fetch_post(&client, 1).await?;
    println!("标题：{}", post.title);

    Ok(())
}
```

## 同步版 vs 异步版：读取文件对比

通过对比，可以直观感受 async/await 如何以"同步"的写法表达异步逻辑：

```rust
// ── 同步版本 ──────────────────────────────────────────
use std::fs;
use std::io;

fn read_two_files_sync() -> io::Result<(String, String)> {
    let a = fs::read_to_string("file_a.txt")?; // 阻塞线程
    let b = fs::read_to_string("file_b.txt")?; // 阻塞线程
    Ok((a, b))
}

// ── 异步版本 ──────────────────────────────────────────
use tokio::fs;
use std::io;

async fn read_two_files_async() -> io::Result<(String, String)> {
    let a = fs::read_to_string("file_a.txt").await?; // 让出控制权
    let b = fs::read_to_string("file_b.txt").await?; // 让出控制权
    Ok((a, b))
}
```

异步版本在等待每个文件读取时，线程可以处理其他任务，整体吞吐量显著更高。

## 常见错误与陷阱

### 错误一：在非 async 上下文中使用 .await

```rust
fn not_async() {
    // ❌ 编译错误：`await` is only allowed inside `async` functions and blocks
    let result = some_future().await;
}
```

修正方式：要么将函数改为 `async fn`，要么使用运行时的 `block_on`：

```rust
fn not_async() {
    // ✅ 在同步上下文中运行异步代码（会阻塞当前线程）
    let result = tokio::runtime::Runtime::new()
        .unwrap()
        .block_on(some_future());
}
```

### 错误二：持有跨 .await 点的非 Send 类型

```rust
use std::rc::Rc; // Rc 不是 Send

async fn bad_example() {
    let local = Rc::new(42); // Rc 不能跨线程传递
    some_io().await;         // ❌ 多线程运行时下编译错误
    println!("{}", local);
}
```

修正：使用 `Arc` 替代 `Rc`，或在 `.await` 之前 drop 非 Send 值：

```rust
use std::arc::Arc;

async fn good_example() {
    let shared = Arc::new(42); // Arc 是 Send
    some_io().await;           // ✅
    println!("{}", shared);
}
```

### 错误三：忘记 .await 导致 Future 未执行

```rust
async fn process() {
    // ❌ 这里只创建了 Future，但没有 .await，函数体不会执行！
    // 编译器会发出 "unused implementor of Future" 警告
    tokio::time::sleep(Duration::from_secs(1));

    // ✅ 正确写法
    tokio::time::sleep(Duration::from_secs(1)).await;
}
```

## 小结

- `Future` trait 是异步编程的基石，`poll` 方法驱动状态推进
- `async fn` 是创建 Future 的语法糖，编译器将其转换为状态机
- `.await` 在 Future 未就绪时让出执行权，就绪后继续执行，实现协作式调度
- `async` 块可在任意表达式位置创建匿名 Future
- 只有 `.await` 或执行器驱动才会实际执行 Future，创建 Future 本身无副作用

下一节将学习如何利用 `join!` 和 `select!` 实现真正的并发执行。
