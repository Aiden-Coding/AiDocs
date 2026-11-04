---
title: "Future 内部原理：状态机与 Waker"
sidebar_position: 100
---

# Future 内部原理：状态机与 Waker

理解 `Future` 的轮询协议，有助于解释 `.await` 如何让出执行权，以及运行时如何在 I/O 就绪后恢复任务。本节建立在 [Future 与 async/await 语法](ch21-01-futures-and-syntax.md)之上。

## async 代码会变成状态机

编译器会把 `async fn` 和 `async` 块转换为实现 `Future` 的匿名状态机。跨越 `.await` 的局部变量需要保存在状态中，因为函数可能在一个 `.await` 处暂停，稍后再从那里继续。

例如：

```rust
async fn load_and_format() -> String {
    let data = load_data().await;
    format!("结果：{data}")
}
```

概念上，编译器会生成代表“开始”“等待 `load_data`”“已完成”等阶段的状态，以及恢复执行所需的局部值。实际布局是编译器实现细节，不应依赖具体字段顺序或状态表示。

## `poll` 与任务协作

`Future` 的核心接口可概括为：

```rust,ignore
fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output>;
```

- `Poll::Ready(value)`：计算完成并产出结果。
- `Poll::Pending`：当前无法继续；Future 必须确保条件就绪时会通知执行器。
- `Context` 提供当前任务的 `Waker`。
- `Pin` 允许 Future 在轮询期间满足其可能存在的自引用状态约束。

执行器轮询任务。遇到 `Pending` 后，执行器可以运行其他已就绪任务，而不是阻塞在当前 Future 上。Future 完成后，调用方不应再轮询它。

## Waker 与就绪通知

异步 I/O 资源通常会注册任务的 Waker。当资源可读、计时器到期或通道收到消息时，相关组件调用 `wake`，提示执行器再次轮询任务。`wake` 是通知而不是直接执行 Future；调度和再次轮询由执行器负责。

自定义 Future 需要遵守以下原则：

1. 返回 `Pending` 前，安排好条件就绪时的唤醒路径。
2. 避免“检查状态”和“注册 Waker”之间出现丢失唤醒的竞态；通常要在注册后重新检查状态，或使用能原子协调二者的原语。
3. 不要在 `poll` 中执行长时间阻塞工作，否则会阻塞运行时工作线程。
4. 可能自引用的 Future 必须遵守 `Pin` 的不移动约束。
5. 处理重复唤醒与并发唤醒；唤醒可能发生多次，Future 仍须正确判断当前状态。

这也是生产代码通常优先组合运行时和生态提供的 I/O Future，而不是自行实现轮询器的原因。

## Future 状态流转

```text
创建 Future
    |
执行器 poll
    |-- Ready(value) --> 任务完成
    |
    `-- Pending ------> 等待资源就绪
                           |
                           `-- Waker 通知执行器
                                  |
                                  `-- 再次 poll
```

`Future` 是惰性的：创建值本身不会驱动计算。它必须被 `.await`，或交给执行器/组合器驱动。组合器可以在同一个任务中轮询多个 Future；`spawn` 则把任务交给运行时调度。

## 自定义 Future 的边界

手写 `Future` 时，首先确认现有 API 是否已经提供合适抽象。一个正确的 `poll` 实现需要处理状态保存、Waker 注册、竞态、Pin 不变式和完成后的行为；仅返回 `Pending` 而没有可靠唤醒路径会让任务永久停滞。

常见 I/O 运行时通过 reactor、系统事件通知和执行器队列协作完成这套流程。了解 `poll` 与 Waker 后，可继续学习 [Trait 中的异步方法](ch21-06-async-traits.md)和[异步运行时选择](ch21-07-runtimes.md)。
