---
title: "异步工程实践"
sidebar_position: 103
---

# 异步工程实践

异步语法不会自动解决资源限制、取消、阻塞或关闭问题。下面以 Tokio 为例说明常见工程边界；其他运行时应使用对应的等价 API。

## Future 与任务取消

Future 被丢弃时，其计算不再被驱动。`tokio::select!`、超时包装器或任务 abort 都可能触发取消。取消不等同于回滚：远端可能已经收到请求，文件或数据库操作也可能已产生部分效果。

```rust
tokio::select! {
    result = read_next_message(&mut connection) => {
        handle(result).await;
    }
    _ = shutdown.cancelled() => {
        // 停止接收新工作，按协议完成清理
    }
}
```

使用 `select!` 包裹多步操作前，应确认该操作在被取消并重试时是否安全。Tokio 文档会说明常用 I/O 方法的取消安全性；例如，`read` 可安全用于 `select!`，而 `read_exact` 被取消时可能已消费部分输入，重试不能假定从原位置开始。对有副作用的请求使用幂等键、事务或显式状态机，而不是假定丢弃 Future 会撤销副作用。

## 有界队列实现背压

无界生产速度快于消费速度时，队列会持续增长并耗尽内存。使用有界通道可让发送方在队列满时等待：

```rust
let (tx, mut rx) = tokio::sync::mpsc::channel::<Job>(64);

// 生产方：队列满时 send().await 会等待容量
tx.send(job).await?;

// 消费方按自身能力处理
while let Some(job) = rx.recv().await {
    process(job).await;
}
```

容量应根据消息大小、并发和延迟目标设定。还可使用 `Semaphore` 限制同时执行的请求数；仅限制队列长度并不限制已取出并正在处理的任务数。

## 隔离阻塞与 CPU 密集工作

在异步任务中调用 `std::thread::sleep`、同步网络/文件 API 或长时间 CPU 循环，会占住运行时工作线程，延迟其他任务。优先使用对应异步 API；必须调用阻塞 API 时，将其放到运行时提供的阻塞线程池，例如 Tokio 的 `spawn_blocking`：

```rust
let result = tokio::task::spawn_blocking(|| {
    legacy_library::compute()
})
.await??;
```

阻塞任务启动后通常不能像普通 Future 那样立即中断。需要限制提交数量、处理 JoinError，并评估关闭等待时间。持续且高负载的 CPU 计算可考虑专用线程池或并行计算库。

## 优雅关闭与任务生命周期

关闭流程通常包括：停止接收新请求、通知现有任务收尾、设定有界等待时间、汇总任务结果，最后强制终止超时任务。不要只丢弃 JoinHandle 就假设任务已完成。

```toml
[dependencies]
tokio = { version = "1", features = ["macros", "rt-multi-thread", "sync", "time"] }
tokio-util = { version = "0.7", features = ["rt"] }
```

```rust
use tokio_util::sync::CancellationToken;

let shutdown = CancellationToken::new();
let worker_shutdown = shutdown.clone();

let worker = tokio::spawn(async move {
    tokio::select! {
        _ = worker_shutdown.cancelled() => {
            flush_pending_work().await;
        }
        _ = run_service() => {}
    }
});

shutdown.cancel();
worker.await?;
```

真实服务还应处理操作系统信号、停止接入、超时策略和子任务集合。取消令牌只是通知机制；任务必须主动观察它，并确保收尾逻辑能完成。

## 异步测试与时间控制

使用运行时测试宏执行异步测试，并避免依赖真实网络或不稳定的长时间等待：

```rust
#[tokio::test]
async fn receives_message() {
    let (tx, mut rx) = tokio::sync::mpsc::channel(1);
    tx.send("hello").await.unwrap();

    assert_eq!(rx.recv().await, Some("hello"));
}
```

对计时器逻辑，可启用 Tokio `test-util` feature，使用暂停时间和推进时间的 API，让超时测试快速且可重复。测试还应验证取消后的资源清理、队列满时的背压、任务错误传播及关闭期限。
