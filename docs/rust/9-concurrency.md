---
title: 并发编程
hide_title: true
sidebar_label: 并发编程
sidebar_position: 9
---

# 并发编程

Rust 的并发编程模型让你能够编写安全的并发代码。本章介绍线程、消息传递和共享状态并发。

---

## 线程

### 创建线程

使用 `thread::spawn` 创建新线程：

```rust
use std::thread;
use std::time::Duration;

fn main() {
    thread::spawn(|| {
        for i in 1..10 {
            println!("hi number {} from the spawned thread!", i);
            thread::sleep(Duration::from_millis(1));
        }
    });

    for i in 1..5 {
        println!("hi number {} from the main thread!", i);
        thread::sleep(Duration::from_millis(1));
    }
}
```

### 等待线程结束

使用 `join` 等待线程完成：

```rust
use std::thread;
use std::time::Duration;

fn main() {
    let handle = thread::spawn(|| {
        for i in 1..10 {
            println!("hi number {} from the spawned thread!", i);
            thread::sleep(Duration::from_millis(1));
        }
    });

    for i in 1..5 {
        println!("hi number {} from the main thread!", i);
        thread::sleep(Duration::from_millis(1));
    }

    handle.join().unwrap();
}
```

### move 闭包

使用 `move` 关键字强制闭包获取其使用的环境值的所有权：

```rust
use std::thread;

fn main() {
    let v = vec![1, 2, 3];

    let handle = thread::spawn(move || {
        println!("Here's a vector: {:?}", v);
    });

    handle.join().unwrap();
}
```

---

## 消息传递

### 通道（Channels）

使用通道在线程间传递消息：

```rust
use std::sync::mpsc;
use std::thread;

fn main() {
    let (tx, rx) = mpsc::channel();

    thread::spawn(move || {
        let val = String::from("hi");
        tx.send(val).unwrap();
    });

    let received = rx.recv().unwrap();
    println!("Got: {}", received);
}
```

### 发送多个值

```rust
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

fn main() {
    let (tx, rx) = mpsc::channel();

    thread::spawn(move || {
        let vals = vec![
            String::from("hi"),
            String::from("from"),
            String::from("the"),
            String::from("thread"),
        ];

        for val in vals {
            tx.send(val).unwrap();
            thread::sleep(Duration::from_secs(1));
        }
    });

    for received in rx {
        println!("Got: {}", received);
    }
}
```

### 多个生产者

通过克隆发送者创建多个生产者：

```rust
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

fn main() {
    let (tx, rx) = mpsc::channel();

    let tx1 = tx.clone();
    thread::spawn(move || {
        let vals = vec![
            String::from("hi"),
            String::from("from"),
            String::from("the"),
            String::from("thread"),
        ];

        for val in vals {
            tx1.send(val).unwrap();
            thread::sleep(Duration::from_secs(1));
        }
    });

    thread::spawn(move || {
        let vals = vec![
            String::from("more"),
            String::from("messages"),
            String::from("for"),
            String::from("you"),
        ];

        for val in vals {
            tx.send(val).unwrap();
            thread::sleep(Duration::from_secs(1));
        }
    });

    for received in rx {
        println!("Got: {}", received);
    }
}
```

---

## 共享状态并发

### Mutex（互斥锁）

使用 `Mutex<T>` 在多个线程间共享数据：

```rust
use std::sync::Mutex;

fn main() {
    let m = Mutex::new(5);

    {
        let mut num = m.lock().unwrap();
        *num = 6;
    }

    println!("m = {:?}", m);
}
```

### 在多线程间共享 Mutex

使用 `Arc<T>` 使多个线程拥有 `Mutex<T>`：

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let counter = Arc::new(Mutex::new(0));
    let mut handles = vec![];

    for _ in 0..10 {
        let counter = Arc::clone(&counter);
        let handle = thread::spawn(move || {
            let mut num = counter.lock().unwrap();
            *num += 1;
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("Result: {}", *counter.lock().unwrap());
}
```

---

## 原子类型

### 原子操作

使用原子类型进行无锁并发：

```rust
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use std::thread;

fn main() {
    let counter = Arc::new(AtomicUsize::new(0));
    let mut handles = vec![];

    for _ in 0..10 {
        let counter = Arc::clone(&counter);
        let handle = thread::spawn(move || {
            for _ in 0..1000 {
                counter.fetch_add(1, Ordering::SeqCst);
            }
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("Result: {}", counter.load(Ordering::SeqCst));
}
```

### 常用原子类型

- `AtomicBool` - 原子布尔值
- `AtomicI8`, `AtomicI16`, `AtomicI32`, `AtomicI64` - 原子有符号整数
- `AtomicU8`, `AtomicU16`, `AtomicU32`, `AtomicU64` - 原子无符号整数
- `AtomicUsize`, `AtomicIsize` - 原子指针大小整数

### 原子内存顺序 (Memory Ordering)

在多核 CPU 以及存在编译器指令重排的现代系统上，单凭“原子操作”是无法保证跨线程内存修改顺序的。为了控制不同线程间操作的**可见性顺序**，Rust 在 `std::sync::atomic::Ordering` 中定义了 5 种内存顺序模型：

#### 1. `Relaxed` (宽松顺序)

- **行为**：仅保证该原子操作本身的原子性，**不提供任何跨线程的同步与顺序化担保**。编译器和 CPU 可以任意重排该原子操作前后的其他内存读写。
- **场景**：简单的计数器（如全局统计、非临界区统计），不需要依赖此原子变量同步其他数据。

#### 2. `Release` (释放语义)

- **行为**：用于**写操作（Store）**。保证在此 Store 操作之前的所有内存读写操作，都不能被重排到该 Store 之后。
- **作用**：将当前线程的内存改动“释放”出来，使任何随后读取此原子变量的线程都可以感知到在此之前的改动。

#### 3. `Acquire` (获取语义)

- **行为**：用于**读操作（Load）**。保证在此 Load 操作之后的所有内存读写操作，都不能被重排到该 Load 之前。
- **作用**：确保在获取到原子变量的最新状态后，后续读取到的共享内存数据是最新且被当前线程正确感知同步的。

> [!TIP]
> **Acquire-Release 配对同步模型**：如果线程 A 使用 `Release` 写入一个原子值，线程 B 随后使用 `Acquire` 读取这个值，那么线程 A 在写入原子值之前的所有内存修改，都保证对线程 B 在读取之后的操作完全可见。这是高性能无锁数据结构中最基础的同步桥梁。

#### 4. `AcqRel` (获取释放语义)

- **行为**：同时具有 `Acquire` 和 `Release` 语义。在进行“读-改-写”（Read-Modify-Write，如 `fetch_add`）操作时，读取时应用 `Acquire`，写入时应用 `Release`。

#### 5. `SeqCst` (顺序一致性)

- **行为**：最强的保障（也是 Rust 的默认安全级别）。在 `AcqRel` 基础上，保证**全系统内所有线程看到的所有 `SeqCst` 操作都存在一个全局一致的单一顺序**。这完全禁止了绝大多数 CPU 级别的高级读写缓存优化，会带来较明显的性能开销。

#### 实践配对范式（无锁数据发布示例）

```rust
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;

struct Resource {
    data: String,
}

struct Singleton {
    initialized: AtomicBool,
    resource: Mutex<Option<Resource>>,
}

// 线程 A 初始化并发布
fn init(singleton: &Singleton) {
    let mut lock = singleton.resource.lock().unwrap();
    *lock = Some(Resource { data: "core_payload".to_string() });
    
    // 使用 Release 写入：在此之前的 resource 赋值操作绝对不会被重排到该写入之后！
    singleton.initialized.store(true, Ordering::Release);
}

// 线程 B 获取并使用
fn get_data(singleton: &Singleton) -> Option<String> {
    // 使用 Acquire 读取：在此之后的读取操作绝对不会被重排到此 Load 之前！
    if singleton.initialized.load(Ordering::Acquire) {
        let lock = singleton.resource.lock().unwrap();
        // 此时我们百分之百确信，resource 里的资源已被正确初始化并同步到了我们当前的 CPU 核心缓存中！
        lock.as_ref().map(|r| r.data.clone())
    } else {
        None
    }
}
```

---

## RwLock（读写锁）

`RwLock` 允许多个读者或一个写者：

```rust
use std::sync::{Arc, RwLock};
use std::thread;

fn main() {
    let data = Arc::new(RwLock::new(vec![1, 2, 3]));
    let mut handles = vec![];

    // 多个读者
    for _ in 0..5 {
        let data = Arc::clone(&data);
        let handle = thread::spawn(move || {
            let r = data.read().unwrap();
            println!("Read: {:?}", *r);
        });
        handles.push(handle);
    }

    // 一个写者
    let data_clone = Arc::clone(&data);
    let handle = thread::spawn(move || {
        let mut w = data_clone.write().unwrap();
        w.push(4);
        println!("Write: {:?}", *w);
    });
    handles.push(handle);

    for handle in handles {
        handle.join().unwrap();
    }

    println!("Final: {:?}", *data.read().unwrap());
}
```

---

## 线程池

### 简单的线程池实现

```rust
use std::sync::{mpsc, Arc, Mutex};
use std::thread;

type Job = Box<dyn FnOnce() + Send + 'static>;

pub struct ThreadPool {
    workers: Vec<Worker>,
    sender: mpsc::Sender<Job>,
}

impl ThreadPool {
    pub fn new(size: usize) -> ThreadPool {
        assert!(size > 0);

        let (sender, receiver) = mpsc::channel();
        let receiver = Arc::new(Mutex::new(receiver));

        let mut workers = Vec::with_capacity(size);

        for id in 0..size {
            workers.push(Worker::new(id, Arc::clone(&receiver)));
        }

        ThreadPool { workers, sender }
    }

    pub fn execute<F>(&self, f: F)
    where
        F: FnOnce() + Send + 'static,
    {
        let job = Box::new(f);
        self.sender.send(job).unwrap();
    }
}

struct Worker {
    id: usize,
    thread: thread::JoinHandle<()>,
}

impl Worker {
    fn new(id: usize, receiver: Arc<Mutex<mpsc::Receiver<Job>>>) -> Worker {
        let thread = thread::spawn(move || loop {
            let job = receiver.lock().unwrap().recv().unwrap();
            println!("Worker {} got a job; executing.", id);
            job();
        });

        Worker { id, thread }
    }
}
```

---

## Scoped Threads

作用域线程允许借用局部数据：

```rust
use std::thread;

fn main() {
    let mut v = vec![1, 2, 3];

    thread::scope(|s| {
        s.spawn(|| {
            println!("Length: {}", v.len());
        });

        s.spawn(|| {
            v.push(4);
        });
    });

    println!("Result: {:?}", v);
}
```

---

## 并发模式

### 生产者-消费者

```rust
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

fn main() {
    let (tx, rx) = mpsc::sync_channel(5); // 有界通道

    // 生产者
    thread::spawn(move || {
        for i in 0..10 {
            println!("Producing {}", i);
            tx.send(i).unwrap();
            thread::sleep(Duration::from_millis(100));
        }
    });

    // 消费者
    thread::sleep(Duration::from_secs(1));
    for received in rx {
        println!("Consuming {}", received);
        thread::sleep(Duration::from_millis(200));
    }
}
```

### 工作窃取

使用 `crossbeam` 实现工作窃取：

```rust
// Cargo.toml: crossbeam = "0.8"

use crossbeam::channel;
use std::thread;

fn main() {
    let (s1, r1) = channel::unbounded();
    let (s2, r2) = channel::unbounded();

    // 工作线程 1
    thread::spawn(move || {
        for i in 0..5 {
            s1.send(i).unwrap();
        }
    });

    // 工作线程 2
    thread::spawn(move || {
        for i in 5..10 {
            s2.send(i).unwrap();
        }
    });

    // 窃取工作
    thread::scope(|s| {
        s.spawn(|| {
            while let Ok(msg) = r1.recv() {
                println!("Worker 1 processed: {}", msg);
            }
        });

        s.spawn(|| {
            while let Ok(msg) = r2.recv() {
                println!("Worker 2 processed: {}", msg);
            }
        });
    });
}
```

---

## Rayon 并行迭代器

使用 `rayon` 进行数据并行：

```rust
// Cargo.toml: rayon = "1.5"

use rayon::prelude::*;

fn main() {
    let mut vec = vec![5, 2, 8, 1, 9, 3];

    // 并行排序
    vec.par_sort();
    println!("Sorted: {:?}", vec);

    // 并行计算
    let sum: i32 = (0..1000).into_par_iter().sum();
    println!("Sum: {}", sum);

    // 并行过滤和映射
    let result: Vec<_> = (0..100)
        .into_par_iter()
        .filter(|x| x % 2 == 0)
        .map(|x| x * x)
        .collect();

    println!("First 10: {:?}", &result[..10]);
}
```

---

## Send 和 Sync

### Send trait

`Send` 标记 trait 表明类型的所有权可以在线程间转移。

### Sync trait

`Sync` 标记 trait 表明类型可以安全地在多个线程间共享引用。

### 示例

```rust
use std::rc::Rc;
use std::sync::Arc;

fn main() {
    // Rc 不是 Send，不能跨线程传递
    // let rc = Rc::new(5);
    // thread::spawn(move || {
    //     println!("{}", rc);
    // });

    // Arc 是 Send，可以跨线程传递
    let arc = Arc::new(5);
    let arc_clone = Arc::clone(&arc);
    
    std::thread::spawn(move || {
        println!("{}", arc_clone);
    }).join().unwrap();
}
```

---

## 实践示例

### 示例 1：并行计算素数

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn is_prime(n: u64) -> bool {
    if n < 2 {
        return false;
    }
    for i in 2..=(n as f64).sqrt() as u64 {
        if n % i == 0 {
            return false;
        }
    }
    true
}

fn main() {
    let numbers: Vec<u64> = (2..100000).collect();
    let chunk_size = numbers.len() / 4;
    
    let primes = Arc::new(Mutex::new(Vec::new()));
    let mut handles = vec![];

    for chunk in numbers.chunks(chunk_size) {
        let primes = Arc::clone(&primes);
        let chunk = chunk.to_vec();
        
        let handle = thread::spawn(move || {
            let local_primes: Vec<u64> = chunk
                .into_iter()
                .filter(|&n| is_prime(n))
                .collect();
            
            primes.lock().unwrap().extend(local_primes);
        });
        
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    let result = primes.lock().unwrap();
    println!("Found {} primes", result.len());
    println!("First 10: {:?}", &result[..10.min(result.len())]);
}
```

### 示例 2：并发下载器

```rust
use std::sync::{Arc, Mutex};
use std::thread;

struct Downloader {
    urls: Vec<String>,
    results: Arc<Mutex<Vec<(String, Result<String, String>)>>>,
}

impl Downloader {
    fn new(urls: Vec<String>) -> Self {
        Downloader {
            urls,
            results: Arc::new(Mutex::new(Vec::new())),
        }
    }

    fn download(&self) {
        let mut handles = vec![];

        for url in &self.urls {
            let url = url.clone();
            let results = Arc::clone(&self.results);

            let handle = thread::spawn(move || {
                // 模拟下载
                thread::sleep(std::time::Duration::from_millis(100));
                let content = format!("Content from {}", url);
                
                results.lock().unwrap().push((url, Ok(content)));
            });

            handles.push(handle);
        }

        for handle in handles {
            handle.join().unwrap();
        }
    }

    fn print_results(&self) {
        let results = self.results.lock().unwrap();
        for (url, result) in results.iter() {
            match result {
                Ok(content) => println!("{}: {}", url, content),
                Err(e) => println!("{}: Error - {}", url, e),
            }
        }
    }
}

fn main() {
    let urls = vec![
        "https://example.com/1".to_string(),
        "https://example.com/2".to_string(),
        "https://example.com/3".to_string(),
    ];

    let downloader = Downloader::new(urls);
    downloader.download();
    downloader.print_results();
}
```

---

## 最佳实践

1. **优先使用消息传递**而不是共享内存
2. **使用作用域线程**避免不必要的 `Arc`
3. **选择合适的同步原语**：
   - 简单计数器用 `AtomicUsize`
   - 读多写少用 `RwLock`
   - 一般情况用 `Mutex`
4. **避免死锁**：按固定顺序获取锁
5. **使用线程池**管理线程生命周期

---

> [!TIP]
> **下一步**：掌握了并发编程后，继续学习 [异步编程](8-async-under-the-hood.md)，了解 Rust 的异步运行时和 Future。
