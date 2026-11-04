---
title: "异步运行时选择"
sidebar_position: 102
---

# 异步运行时选择

Rust 标准库提供 `Future` trait 和 `async` 语法，但不提供通用异步执行器、网络 reactor 或定时器。运行时负责驱动 Future，并通常集成 I/O、任务调度、同步原语和诊断工具。

## 常见选择

| 运行时/生态 | 常见定位 | 选择时检查 |
|---|---|---|
| [Tokio](https://tokio.rs) | 网络服务、通用异步应用，生态与集成范围广 | features、任务模型、同步/异步 API 边界 |
| [smol](https://github.com/smol-rs/smol) | 轻量、可组合的异步组件 | 需要的 I/O 驱动和周边库是否齐全 |
| [async-std](https://async.rs) | 提供接近标准库风格的异步 API | 当前维护状态、版本兼容性与依赖生态 |
| [Embassy](https://embassy.dev) | 嵌入式与 `no_std` 异步应用 | MCU 支持、硬件驱动、内存与中断约束 |

生态维护状态和 API 会随时间变化。生产选型时应检查项目发布记录、兼容矩阵和所需 crate，而不要只依赖旧文章中的流行度比较。

## 选型维度

1. **目标平台**：桌面/服务器、浏览器、嵌入式，以及是否需要 `no_std`。
2. **库兼容性**：HTTP、数据库、TLS、消息队列等依赖是否使用同一运行时或可互操作。
3. **调度需求**：任务数量、工作线程、阻塞操作隔离、定时器和优雅关闭。
4. **限制与可观测性**：二进制体积、运行时控制、日志/tracing、测试支持。
5. **维护与升级**：MSRV、版本策略、漏洞响应与团队熟悉度。

异步 trait 本身并不决定运行时；库可定义 Future 接口而不创建运行时，把执行策略留给应用。

## Tokio 最小入口

```toml
[dependencies]
tokio = { version = "1", features = ["macros", "rt-multi-thread", "time"] }
```

```rust
#[tokio::main]
async fn main() {
    tokio::time::sleep(std::time::Duration::from_millis(10)).await;
}
```

使用最小必要的 Cargo features，有助于减少依赖和编译范围。不同运行时不可假定可以混用各自的 I/O 类型或任务句柄；在应用边界明确由谁创建和关闭运行时。

## 库与应用的边界

- **应用**通常选择并启动一个运行时，配置线程、信号处理和生命周期。
- **库**通常暴露 async API，不应悄悄创建嵌套运行时或强制阻塞调用方。
- **集成**时确认类型、TLS 实现、feature flags 和同步原语的兼容性。
- **测试**时使用运行时提供的测试宏或显式测试执行器，并控制时间、并发与资源清理。

运行时选定后，仍需处理任务取消、背压和阻塞代码隔离，参见[异步工程实践](ch21-08-async-engineering.md)。
