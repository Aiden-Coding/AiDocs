---
title: "异步流：Stream"
sidebar_position: 99
---

# 异步流：Stream

`Future` 代表一个异步操作最终产生**单个值**，而现实中很多场景需要处理**随时间到来的值序列**：消息队列中的消息、文件的逐行内容、WebSocket 推送的事件流……这正是 `Stream` trait 的用武之地。

`Stream` 之于 `Future`，正如 `Iterator` 之于普通函数调用——它是异步世界中的迭代器。

## Stream trait 定义

`Stream` trait 定义在 `futures` crate 中（标准库尚未稳定），其结构与 `Iterator` 高度对称：

```rust
use std::pin::Pin;
use std::task::{Context, Poll};

// 同步迭代器
pub trait Iterator {
    type Item;
    fn next(&mut self) -> Option<Self::Item>;
}

// 异步流（来自 futures::stream）
pub trait Stream {
    type Item;
    fn poll_next(
        self: Pin<&mut Self>,
        cx: &mut Context<'_>,
    ) -> Poll<Option<Self::Item>>;
}
// Poll::Ready(Some(item)) => 下一个元素就绪
// Poll::Ready(None)       => 流已结束
// Poll::Pending           => 暂无新元素，等待唤醒
```

## Iterator vs Stream 方法对比

| 同步 Iterator | 异步 Stream（StreamExt） | 说明 |
|---|---|---|
| `next()` | `next().await` | 获取下一个元素 |
| `map(f)` | `map(f)` | 变换每个元素 |
| `filter(pred)` | `filter(pred)` | 过滤元素 |
| `take(n)` | `take(n)` | 取前 n 个 |
| `skip(n)` | `skip(n)` | 跳过前 n 个 |
| `collect()` | `collect().await` | 收集到集合 |
| `for_each(f)` | `for_each(f).await` | 对每个元素执行副作用 |
| `fold(init, f)` | `fold(init, f).await` | 累积计算 |
| `flatten()` | `flatten()` | 展平嵌套 |
| `zip(other)` | `zip(other)` | 合并两个流 |

## 使用 StreamExt 扩展方法

`tokio_stream::StreamExt` 和 `futures::StreamExt` 为 Stream 添加了大量便利方法：

```toml
[dependencies]
tokio = { version = "1", features = ["full"] }
tokio-stream = "0.1"
futures = "0.3"
```

```rust
use tokio_stream::{self, StreamExt};

#[tokio::main]
async fn main() {
    // 从迭代器创建 Stream
    let stream = tokio_stream::iter(vec![1u32, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    // 链式操作，与同步 Iterator 写法几乎相同
    let result: Vec<u32> = stream
        .filter(|x| *x % 2 == 0)   // 保留偶数
        .map(|x| x * x)             // 平方
        .take(3)                    // 只取前 3 个
        .collect()
        .await;

    println!("{:?}", result); // [4, 16, 36]
}
```

### 逐元素处理

```rust
use tokio_stream::StreamExt;

async fn process_stream() {
    let mut stream = tokio_stream::iter(0u32..10);

    // 方式一：while let 循环（最直观）
    while let Some(item) = stream.next().await {
        println!("处理元素：{}", item);
        tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
    }

    // 方式二：for_each
    tokio_stream::iter(0u32..5)
        .for_each(|item| async move {
            println!("元素：{}", item);
        })
        .await;
}
```

## 创建 Stream

### 从通道（Channel）创建

Tokio 的 `mpsc` 通道可以直接转换为 Stream，这是生产实践中最常见的用法：

```rust
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;
use tokio_stream::StreamExt;

#[tokio::main]
async fn main() {
    let (tx, rx) = mpsc::channel::<String>(32);

    // 生产者：在单独任务中发送数据
    tokio::spawn(async move {
        for i in 0..5 {
            tx.send(format!("消息 {}", i)).await.unwrap();
            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        }
        // tx drop 后，接收端的 Stream 会结束
    });

    // 将 Receiver 转换为 Stream
    let mut stream = ReceiverStream::new(rx);

    while let Some(msg) = stream.next().await {
        println!("收到：{}", msg);
    }

    println!("流结束");
}
```

## 实战：逐行异步读取文件

`tokio::io::BufReader` 结合 `lines()` 方法可以将文件转换为逐行的 Stream：

```rust
use tokio::fs::File;
use tokio::io::{self, AsyncBufReadExt, BufReader};
use tokio_stream::wrappers::LinesStream;
use tokio_stream::StreamExt;

#[tokio::main]
async fn main() -> io::Result<()> {
    let file = File::open("large_data.log").await?;
    let reader = BufReader::new(file);
    // lines() 返回 Lines<BufReader<File>>，可转换为 Stream
    let mut lines = LinesStream::new(reader.lines());

    let mut line_count = 0u64;
    let mut error_count = 0u64;

    while let Some(line) = lines.next().await {
        let line = line?; // 处理 IO 错误
        line_count += 1;

        if line.contains("ERROR") {
            error_count += 1;
            println!("错误行 {}：{}", line_count, line);
        }
    }

    println!("共读取 {} 行，发现 {} 条错误", line_count, error_count);
    Ok(())
}
```

## 实战：WebSocket 消息流处理

```rust
use futures::StreamExt;
use tokio_tungstenite::{connect_async, tungstenite::Message};

#[tokio::main]
async fn main() {
    let url = "wss://echo.websocket.org";
    let (ws_stream, _) = connect_async(url).await.expect("连接失败");
    let (mut write, mut read) = ws_stream.split();

    // 读取端作为 Stream 处理
    tokio::spawn(async move {
        while let Some(msg) = read.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    println!("收到文本：{}", text);
                }
                Ok(Message::Binary(data)) => {
                    println!("收到二进制数据：{} 字节", data.len());
                }
                Ok(Message::Close(_)) => {
                    println!("连接关闭");
                    break;
                }
                Err(e) => {
                    eprintln!("WebSocket 错误：{}", e);
                    break;
                }
                _ => {}
            }
        }
    });
}
```

## async-stream crate：用宏生成 Stream

手写 `Stream` impl 相当繁琐，`async-stream` crate 提供了 `stream!` 和 `try_stream!` 宏，让生成 Stream 像写 `async fn` 一样简单：

```toml
[dependencies]
async-stream = "0.3"
```

```rust
use async_stream::stream;
use futures::pin_mut;
use tokio_stream::StreamExt;

fn fibonacci_stream() -> impl futures::Stream<Item = u64> {
    stream! {
        let (mut a, mut b) = (0u64, 1u64);
        loop {
            yield a; // 用 yield 产生值，类似生成器
            let next = a + b;
            a = b;
            b = next;
        }
    }
}

#[tokio::main]
async fn main() {
    let fib = fibonacci_stream();
    pin_mut!(fib);

    // 取前 10 个斐波那契数
    let nums: Vec<u64> = fib.take(10).collect().await;
    println!("{:?}", nums);
    // [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
}
```

### try_stream! 处理可能失败的流

```rust
use async_stream::try_stream;
use futures::Stream;

fn read_lines(path: &str) -> impl Stream<Item = Result<String, std::io::Error>> + '_ {
    try_stream! {
        let file = tokio::fs::File::open(path).await?;
        let mut reader = tokio::io::BufReader::new(file);
        let mut line = String::new();

        loop {
            use tokio::io::AsyncBufReadExt;
            let n = reader.read_line(&mut line).await?;
            if n == 0 {
                break; // EOF
            }
            yield line.trim().to_string();
            line.clear();
        }
    }
}
```

## Stream 合并与分发

```rust
use tokio_stream::StreamExt;

async fn merge_streams_example() {
    let stream1 = tokio_stream::iter(vec!["A1", "A2", "A3"]);
    let stream2 = tokio_stream::iter(vec!["B1", "B2", "B3"]);

    // merge：交错合并两个流（哪个先就绪用哪个）
    let merged = stream1.merge(stream2);
    let all: Vec<&str> = merged.collect().await;
    println!("{:?}", all); // 顺序不确定，但包含所有元素

    // zip：将两个流配对合并
    let nums = tokio_stream::iter(1u32..=3);
    let strs = tokio_stream::iter(vec!["一", "二", "三"]);
    let zipped: Vec<(u32, &str)> = nums.zip(strs).collect().await;
    println!("{:?}", zipped); // [(1, "一"), (2, "二"), (3, "三")]
}
```

## 小结

- `Stream` 是异步世界的 `Iterator`，用于处理按时间到来的值序列
- `StreamExt` 提供 `map`、`filter`、`take`、`collect` 等丰富的链式方法
- 最常见的 Stream 来源：通道（`ReceiverStream`）、文件行（`LinesStream`）、网络连接
- `async-stream` 的 `stream!` 宏让自定义 Stream 像写 `async fn` 一样简单
- `while let Some(item) = stream.next().await` 是消费 Stream 的标准模式

下一节将深入 Future 的内部原理，了解状态机与 Waker 机制的实现细节。
