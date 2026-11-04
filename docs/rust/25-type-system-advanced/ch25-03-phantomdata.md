---
title: "PhantomData 与型变"
sidebar_position: 117
---

# PhantomData 与型变

## 什么是 PhantomData

`std::marker::PhantomData<T>` 是一个**零大小类型**（*zero-sized type*，ZST），运行时不占用任何内存。它的唯一作用是向编译器传达类型层面的语义信息：「这个结构体逻辑上与类型 `T` 相关，尽管它并不实际存储 `T`」。

## 用途一：标记所有权语义

裸指针（`*mut T`、`*const T`）不携带所有权信息，编译器不知道是否需要在 `Drop` 时销毁指向的数据。`PhantomData<T>` 告知编译器：「这个结构体拥有 `T` 的实例」。

```rust
use std::marker::PhantomData;

// 手动实现动态数组（简化版）
struct MyVec<T> {
    ptr: *mut T,
    len: usize,
    cap: usize,
    _marker: PhantomData<T>,  // 告知编译器：MyVec<T> 逻辑上拥有若干个 T
}

// 有了 PhantomData<T>，编译器才会：
// 1. 在 MyVec<T> drop 时自动调用 T 的析构函数（如果我们手动实现 Drop）
// 2. 正确推断 Send/Sync：若 T: Send，则 MyVec<T>: Send
```

若没有 `PhantomData<T>`，`MyVec<T>` 对编译器来说就像 `MyVec` 完全不含 `T`，`Send`/`Sync` 推断和析构顺序都会出错。

## 用途二：添加生命周期约束

有时结构体通过裸指针引用外部数据，需要告知编译器存在借用关系：

```rust
use std::marker::PhantomData;

// 指向某个生命周期为 'a 的 T 的引用的安全封装
struct Ref<'a, T> {
    ptr: *const T,
    _marker: PhantomData<&'a T>,  // 表达：内部数据的生命周期至少为 'a
}

impl<'a, T> Ref<'a, T> {
    // 安全性前提：调用者保证 ptr 在 'a 内有效
    unsafe fn new(reference: &'a T) -> Self {
        Self {
            ptr: reference as *const T,
            _marker: PhantomData,
        }
    }

    fn get(&self) -> &'a T {
        unsafe { &*self.ptr }
    }
}
```

`PhantomData<&'a T>` 让 `Ref<'a, T>` 在生命周期检查中等同于持有一个 `&'a T`，编译器会阻止 `Ref` 活得比 `'a` 更长。

## 用途三：类型状态模式

类型状态模式（*typestate pattern*）将**运行时状态**编码进**类型参数**，让非法的状态转换在编译期就被阻止：

```rust
use std::marker::PhantomData;
use std::net::TcpStream;

struct Disconnected;
struct Connected;

struct Connection<State> {
    socket: Option<TcpStream>,
    _state: PhantomData<State>,
}

impl Connection<Disconnected> {
    fn new() -> Self {
        Self { socket: None, _state: PhantomData }
    }

    fn connect(self, addr: &str) -> Result<Connection<Connected>, std::io::Error> {
        let stream = TcpStream::connect(addr)?;
        Ok(Connection {
            socket: Some(stream),
            _state: PhantomData,
        })
    }
}

impl Connection<Connected> {
    fn send(&mut self, data: &[u8]) {
        use std::io::Write;
        if let Some(ref mut s) = self.socket {
            let _ = s.write_all(data);
        }
    }

    fn disconnect(self) -> Connection<Disconnected> {
        Connection { socket: None, _state: PhantomData }
    }
}

fn main() {
    let conn = Connection::<Disconnected>::new();
    // conn.send(b"hello");  // 编译错误：Disconnected 状态没有 send 方法

    if let Ok(mut conn) = conn.connect("127.0.0.1:8080") {
        conn.send(b"hello");
        let _disconnected = conn.disconnect();
    }
}
```

`PhantomData<State>` 在运行时不占任何空间，但在类型层面完整表达了状态机的合法转换路径。

## 型变（Variance）简介

型变描述了**生命周期的子类型关系如何传播**到泛型类型中。

```mermaid
graph LR
    A["'long（更长的生命周期）"]
    B["'short（更短的生命周期）"]
    A -->|是...的子类型| B
```

| 型变类型 | 含义 | 典型场景 |
|---------|------|---------|
| 协变（covariant） | `'long` 的 `T` 可当 `'short` 的 `T` 用 | `&'a T`、`Box<T>` |
| 逆变（contravariant） | `'short` 的 `T` 可当 `'long` 的 `T` 用 | `fn(T)` 的参数位置 |
| 不变（invariant） | 生命周期必须精确匹配 | `&'a mut T`、`Cell<T>` |

`PhantomData` 对型变的影响：

| `PhantomData` 写法 | 对 `T` 的型变 |
|-------------------|-------------|
| `PhantomData<T>` | 协变 |
| `PhantomData<fn(T)>` | 逆变 |
| `PhantomData<fn(T) -> T>` | 不变 |
| `PhantomData<*mut T>` | 不变 |

在实现 `unsafe` 数据结构时，选择正确的 `PhantomData` 写法至关重要，否则可能导致生命周期检查过于宽松，引发悬垂引用。
