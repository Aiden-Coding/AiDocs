---
title: 高级生命周期与设计模式
sidebar_label: 高级生命周期与模式
sidebar_position: 12
---

# 高级生命周期与设计模式

要从 Rust 的中级开发者跃升为高级/专家级开发者，必须攻克两个堡垒：**类型系统的子类型与型变**，以及**如何运用 Rust 独特的语言特性来优雅地解决软件工程设计难题**。本章将带你深入这两个领域。

---

## 1. 子类型化与型变 (Subtyping & Variance)

在绝大多数面向对象语言中，子类型（Subtyping）通常与继承（Inheritance）挂钩。Rust 没有继承，但它拥有**生命周期子类型化**：

> [!NOTE]
> 如果生命周期 `'a` 比 `'b` 活得长（即 `'a: 'b`，读作 `'a` 至少和 `'b` 一样长），那么 `'a` 就是 `'b` 的**子类型**。也就是说，在需要生命周期 `'b` 的地方，安全地传入 `'a` 是完全允许的。

**型变（Variance）**描述了泛型参数的子类型关系是如何传导给包装类型的：

| 型变类别 | 定义 | 例子 | 典型场景 |
| :--- | :--- | :--- | :--- |
| **协变 (Covariant)** | 如果 `T` 是 `U` 的子类型，则 `F<T>` 也是 `F<U>` 的子类型。 | `&'a T`, `Box<T>` | 只读、拥有的数据。 |
| **不变 (Invariant)** | 即使 `T` 是 `U` 的子类型，`F<T>` 和 `F<U>` 也没有任何子类型关系。 | `&mut T`, `UnsafeCell<T>` | 可读可写的数据（防止通过写入缩短引用的生命周期）。 |
| **逆变 (Contravariant)** | 如果 `T` 是 `U` 的子类型，则 `F<U>` 是 `F<T>` 的子类型（反向传导）。 | `Fn(T)` | 函数参数输入。 |

### 为什么 `&mut T` 必须是不变（Invariant）的？

试想如果 `&mut T` 是协变的，会发生什么灾难：

```rust
// 假设 &mut T 是协变的，以下代码将编译通过：
fn evil_variance() {
    let mut string: &'static str = "I live forever";
    {
        let short_lived = String::from("Short");
        let mut r_mut: &mut &str = &mut string; // 如果协变，&mut &'static str 可以退化为 &mut &'a str
        
        // 这一步向 static 的位置写入了局部变量的借用！
        *r_mut = &short_lived; 
    }
    // 此时 string 指向了已经被释放的 short_lived，发生使用后释放 (Use-After-Free) 的 UB！
    println!("{}", string); 
}
```

为了防止这种越权写入，Rust 编译器强制 `&mut T` 对 `T` 保持**不变性**。

### PhantomData 调整型变

当你使用裸指针编写 Unsafe 代码或自定义容器时，需要告诉编译器你对泛型参数的所有权/借用关系，这时需要使用 `PhantomData`：

```rust
use std::marker::PhantomData;

// 我们实现了一个自定义只读指针包装器，希望它对生命周期 'a 是协变的
struct ReadOnlyPtr<'a, T> {
    ptr: *const T,
    _marker: PhantomData<&'a T>, // 告诉编译器我们逻辑上持有 &'a T，从而自动获得协变性
}
```

---

## 2. 高阶生命周期绑定 (HRTB - Higher-Rank Trait Bounds)

通常情况下，泛型生命周期参数是在调用或实例化时由调用方决定的。但是在某些特殊场景下（如处理闭包或回调函数），我们需要表达：**这个引用可以接受任意生命周期，而生命周期应该在闭包被执行时才确定。**

这需要用到 `for<'a>` 语法。

### HRTB 经典案例

```rust
// 错误写法示范：
// fn process<F>(callback: F) where F: Fn(&str) { ... }
// 实际上等同于：
// fn process<'a, F>(callback: F) where F: Fn(&'a str) { ... }
// 这意味着 callback 只接受一个生命周期为 'a 的特定引用，而在 process 内部产生的局部变量生命周期比 'a 短，导致报错。

// 正确写法：使用 HRTB
fn process_with_hrtb<F>(callback: F) 
where 
    F: for<'a> Fn(&'a str) 
{
    let local_string = String::from("local");
    callback(&local_string); // 没问题，callback 可以接受任意生命周期，包括 local_string 的局部生命周期
}
```

---

## 3. Rust 独有的设计模式

### 3.1 Typestate (类型状态) 模式

利用 Rust 强大的类型系统，将运行时状态转化为编译期类型，从而在编译期杜绝 API 的非法调用（例如，不能在未连接的连接上发送数据）。

```rust
// 定义状态类型
struct Uninitialized;
struct Connected { socket: std::net::TcpStream }
struct Terminated;

// 定义带状态的结构体
struct Connection<State> {
    state: State,
}

impl Connection<Uninitialized> {
    pub fn new() -> Self {
        Connection { state: Uninitialized }
    }

    // 状态转换：消费自己，返回新状态
    pub fn connect(self, addr: &str) -> Connection<Connected> {
        let stream = std::net::TcpStream::connect(addr).unwrap();
        Connection {
            state: Connected { socket: stream }
        }
    }
}

impl Connection<Connected> {
    pub fn send(&mut self, data: &[u8]) {
        use std::io::Write;
        self.state.socket.write_all(data).unwrap();
    }

    pub fn close(self) -> Connection<Terminated> {
        Connection { state: Terminated }
    }
}

// 使用
fn main() {
    let conn = Connection::new();
    // conn.send(b"hello"); // 编译报错！Uninitialized 状态下没有 send 方法！
    
    let mut connected = conn.connect("127.0.0.1:8080");
    connected.send(b"hello"); // 编译通过
    
    let closed = connected.close();
    // closed.send(b"world"); // 编译报错！Terminated 状态没有 send 方法！
}
```

### 3.2 RAII Guard (资源获取即初始化守护) 模式

利用 `Drop` 特征和 Rust 的生命周期，确保资源在使用完毕后被**绝对、自动**地释放或还原。

```rust
use std::ops::Deref;

struct LogGuard<'a> {
    section_name: &'a str,
}

impl<'a> LogGuard<'a> {
    fn new(name: &'a str) -> Self {
        println!("[ENTER] {}", name);
        LogGuard { section_name: name }
    }
}

impl<'a> Drop for LogGuard<'a> {
    fn drop(&mut self) {
        println!("[EXIT] {}", self.section_name);
    }
}

fn perform_transaction() {
    let _guard = LogGuard::new("perform_transaction");
    
    // 执行业务逻辑
    println!("Doing heavy database operations...");
    
    // _guard 在函数结束退出作用域时自动 drop，保证一定会打印 [EXIT]
}
```

### 3.3 Builder (构建者) 模式

Rust 的 Builder 模式常结合 `Option` 与所有权转移，支持流式安全构造。

```rust
#[derive(Debug)]
pub struct Server {
    host: String,
    port: u16,
    timeout: Option<u64>,
}

pub struct ServerBuilder {
    host: String,
    port: u16,
    timeout: Option<u64>,
}

impl ServerBuilder {
    pub fn new(host: String, port: u16) -> Self {
        ServerBuilder { host, port, timeout: None }
    }

    pub fn timeout(mut self, timeout: u64) -> Self {
        self.timeout = Some(timeout);
        self
    }

    pub fn build(self) -> Server {
        Server {
            host: self.host,
            port: self.port,
            timeout: self.timeout,
        }
    }
}
```
