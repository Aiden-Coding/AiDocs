---
title: "Trait 中的异步方法"
sidebar_position: 101
---

# Trait 中的异步方法

异步 trait 方法适合把 I/O 或延迟计算抽象为可替换实现。Rust 1.75 稳定了在 trait 中声明 `async fn` 以及返回 `impl Future` 的能力；具体的动态分发仍需额外设计。

## 静态分发：直接使用 async trait 方法

```rust
trait DataSource {
    async fn fetch(&self, key: &str) -> Result<String, String>;
}

struct MemorySource;

impl DataSource for MemorySource {
    async fn fetch(&self, key: &str) -> Result<String, String> {
        Ok(format!("value for {key}"))
    }
}

async fn load<S: DataSource>(source: &S, key: &str) -> Result<String, String> {
    source.fetch(key).await
}
```

泛型调用通常采用静态分发，编译器为具体实现生成相应代码。它不要求把 Future 放到堆上，但不同实现可能导致更多单态化代码。

## 显式表达 Send 约束

trait 中的 `async fn` 隐式返回 Future；调用方无法仅从该签名要求返回 Future 一定实现 `Send`。如果公共 API 需要允许 Future 跨线程调度，可显式写出返回 Future 的 trait 方法：

```rust
use std::future::Future;

trait SendDataSource {
    fn fetch<'a>(
        &'a self,
        key: &'a str,
    ) -> impl Future<Output = Result<String, String>> + Send + 'a;
}

impl SendDataSource for MemorySource {
    fn fetch<'a>(
        &'a self,
        key: &'a str,
    ) -> impl Future<Output = Result<String, String>> + Send + 'a {
        async move { Ok(format!("value for {key}")) }
    }
}
```

是否需要 `Send` 取决于调用场景和运行时。单线程执行器可能接受 `!Send` Future；多线程 `spawn` 通常要求任务可在线程间转移。不要为了“异步”而无条件增加 `Send` 约束。

## 动态分发：显式装箱 Future

含 `async fn` 或返回位置 `impl Future` 的 trait 通常不能直接作为 `dyn Trait` 使用，因为每个实现返回的具体 Future 类型不同。需要运行时多态时，可将 Future 装箱为 trait object：

```rust
use std::{future::Future, pin::Pin};

type BoxFuture<'a, T> = Pin<Box<dyn Future<Output = T> + Send + 'a>>;

trait DynDataSource {
    fn fetch<'a>(&'a self, key: &'a str) -> BoxFuture<'a, Result<String, String>>;
}

impl DynDataSource for MemorySource {
    fn fetch<'a>(&'a self, key: &'a str) -> BoxFuture<'a, Result<String, String>> {
        Box::pin(async move { Ok(format!("value for {key}")) })
    }
}
```

装箱带来间接调用和通常的堆分配成本，但让调用方可以在集合中保存不同实现。若不需要运行时多态，优先使用泛型接口。

## 何时选择宏或辅助 crate

较老的 MSRV、复杂的生命周期约束或动态分发需求，可能需要宏或辅助 crate 来表达异步 trait。选择前应核对项目的 Rust 版本、公开 API 稳定性、`Send` 语义及对象安全需求；不要仅为缩短语法而引入不必要的抽象。

相关主题：[Future 内部原理](ch21-05-future-internals.md)、[异步运行时选择](ch21-07-runtimes.md)。
