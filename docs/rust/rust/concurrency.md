# Rust 并发编程

Rust 提供了无畏并发（Fearless Concurrency）的能力。

## 线程
使用 `std::thread::spawn` 创建新线程。

## 消息传递
Rust 标准库提供了通道（channel）用于线程间通信：`std::sync::mpsc`。

## 共享状态
使用互斥器（Mutex）和原子引用计数（Arc）在多线程间安全地共享状态：`std::sync::{Arc, Mutex}`。
