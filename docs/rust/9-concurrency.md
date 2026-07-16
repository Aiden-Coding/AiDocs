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

---

## 条件变量 (Condvar)

`Condvar`（条件变量）允许线程在某个条件满足之前**高效地阻塞等待**，而不是忙等（spinning）。它总是与 `Mutex` 配合使用。

```rust
use std::sync::{Arc, Mutex, Condvar};
use std::thread;

fn main() {
    let pair = Arc::new((Mutex::new(false), Condvar::new()));
    let pair_clone = Arc::clone(&pair);

    // 工作线程：完成任务后通知主线程
    thread::spawn(move || {
        let (lock, cvar) = &*pair_clone;
        let mut started = lock.lock().unwrap();
        println!("工作线程：开始处理...");
        thread::sleep(std::time::Duration::from_millis(100));
        *started = true; // 修改条件
        cvar.notify_one(); // 唤醒等待的线程
        println!("工作线程：已通知主线程");
    });

    // 主线程：等待条件满足
    let (lock, cvar) = &*pair;
    let mut started = lock.lock().unwrap();
    while !*started {
        // wait 会原子地释放锁并进入睡眠，被唤醒后重新获取锁
        started = cvar.wait(started).unwrap();
    }
    println!("主线程：收到通知，条件已满足！");
}
```

### 使用 `wait_timeout` 防止永久阻塞

```rust
use std::sync::{Arc, Mutex, Condvar};
use std::time::Duration;

fn main() {
    let pair = Arc::new((Mutex::new(false), Condvar::new()));
    let (lock, cvar) = &*pair;

    let guard = lock.lock().unwrap();
    let (guard, timeout_result) = cvar.wait_timeout(guard, Duration::from_secs(2)).unwrap();

    if timeout_result.timed_out() {
        println!("等待超时，条件未满足");
    } else {
        println!("条件已满足: {}", *guard);
    }
}
```

---

## Barrier（屏障同步）

`Barrier` 让多个线程在某个时间点**同步等待**，直到所有线程都到达屏障后才继续执行。常用于并行计算的阶段性同步。

```rust
use std::sync::{Arc, Barrier};
use std::thread;

fn main() {
    let n = 4;
    let barrier = Arc::new(Barrier::new(n));
    let mut handles = vec![];

    for i in 0..n {
        let b = Arc::clone(&barrier);
        handles.push(thread::spawn(move || {
            println!("线程 {} 完成第一阶段", i);
            b.wait(); // 所有线程都到达这里后才继续
            println!("线程 {} 开始第二阶段", i);
        }));
    }

    for h in handles { h.join().unwrap(); }
}
```

---

## Scoped Threads（作用域线程）

标准库（Rust 1.63+）提供了 `thread::scope`，允许创建**借用当前栈帧变量**的线程（无需 `Arc` 或 `'static` 约束）：

```rust
use std::thread;

fn main() {
    let data = vec![1, 2, 3, 4, 5];
    let mut results = vec![0; 5];

    thread::scope(|s| {
        // 可以直接借用 data（非 'static），因为 scope 保证所有线程在 scope 结束前完成
        s.spawn(|| {
            println!("读取 data: {:?}", &data);
        });

        // 可变借用 results
        s.spawn(|| {
            for (i, r) in results.iter_mut().enumerate() {
                *r = i as i32 * 2;
            }
        });
    }); // scope 结束时，所有子线程自动 join

    println!("results: {:?}", results);
}
```

> [!TIP]
> `thread::scope` 相比 `thread::spawn` + `Arc` 的方案更简洁、性能更好，在不需要把线程活过当前函数的场景下，优先使用 scoped threads。

---

## Rayon：数据并行

[Rayon](https://github.com/rayon-rs/rayon) 是 Rust 生态中最流行的数据并行库，只需将 `.iter()` 改为 `.par_iter()` 即可将串行迭代器变为并行：

```toml
[dependencies]
rayon = "1"
```

```rust
use rayon::prelude::*;

fn main() {
    let numbers: Vec<i64> = (1..=1_000_000).collect();

    // 并行求和：Rayon 自动拆分任务到多个 CPU 核心
    let sum: i64 = numbers.par_iter().sum();
    println!("并行求和: {}", sum);

    // 并行 map + filter + collect
    let evens_squared: Vec<i64> = numbers.par_iter()
        .filter(|&&x| x % 2 == 0)
        .map(|&x| x * x)
        .collect();

    println!("偶数平方数量: {}", evens_squared.len());

    // 并行排序
    let mut data: Vec<i32> = (0..100).rev().collect();
    data.par_sort();
    println!("并行排序后首个元素: {}", data[0]);
}
```

Rayon 内部使用**工作窃取（Work Stealing）**调度器，自动平衡各 CPU 核心的负载。

---

## `std::sync::Once` — 一次性初始化

`Once` 是标准库提供的原语，保证某段代码**在整个程序生命周期内只执行一次**，即使多个线程同时尝试执行。在 Rust 1.70+ 的项目中通常优先使用 `OnceLock`，但 `Once` 仍广泛存在于老代码和 FFI 场景中：

```rust
use std::sync::Once;

static INIT: Once = Once::new();
static mut GLOBAL_STATE: Option<String> = None;

fn initialize() {
    INIT.call_once(|| {
        // 这段代码只会执行一次，即使多个线程并发调用
        unsafe {
            GLOBAL_STATE = Some("已初始化".to_string());
        }
        println!("初始化执行（只打印一次）");
    });
}

fn main() {
    use std::thread;

    let handles: Vec<_> = (0..5).map(|_| {
        thread::spawn(initialize)
    }).collect();

    for h in handles { h.join().unwrap(); }

    // 检查是否已完成初始化
    println!("初始化完成: {}", INIT.is_completed()); // true
}
```

`Once` 的错误处理：如果 `call_once` 闭包 panic，`Once` 会进入"中毒（poisoned）"状态，后续调用 `call_once` 会 panic：

```rust
use std::sync::Once;

static ONCE: Once = Once::new();

fn safe_init() {
    // call_once_force 允许在中毒后重新尝试初始化
    ONCE.call_once_force(|state| {
        if state.is_poisoned() {
            println!("检测到中毒状态，重新初始化");
        }
        // 执行初始化...
    });
}
```

---

## `parking_lot` — 高性能同步原语

[`parking_lot`](https://github.com/Amanieu/parking_lot) 是标准库 `Mutex`/`RwLock`/`Condvar` 的高性能替代，主要优势：

- **更小的内存占用**：`parking_lot::Mutex<T>` 比 `std::sync::Mutex<T>` 小一个 `usize`
- **不中毒（No Poisoning）**：lock() 返回直接是 `MutexGuard`，无需 `.unwrap()`
- **更快**：在低竞争场景下比标准库快 2-5 倍
- **额外功能**：`try_lock_for`（带超时）、`lock_arc`（跨线程持有 Guard）

```toml
[dependencies]
parking_lot = "0.12"
```

### 1. `parking_lot::Mutex`

```rust
use parking_lot::Mutex;
use std::sync::Arc;
use std::thread;

fn main() {
    let counter = Arc::new(Mutex::new(0u32));
    let mut handles = vec![];

    for _ in 0..10 {
        let counter = Arc::clone(&counter);
        handles.push(thread::spawn(move || {
            // lock() 直接返回 MutexGuard，无需 .unwrap()
            let mut num = counter.lock();
            *num += 1;
        }));
    }

    for h in handles { h.join().unwrap(); }
    println!("计数: {}", *counter.lock()); // 10
}
```

### 2. `parking_lot::RwLock`

```rust
use parking_lot::RwLock;
use std::sync::Arc;
use std::thread;

fn main() {
    let data = Arc::new(RwLock::new(vec![1, 2, 3]));

    // 多个读者可以并发持有读锁
    let data_r = Arc::clone(&data);
    let reader = thread::spawn(move || {
        let r = data_r.read(); // 无需 .unwrap()
        println!("读取: {:?}", *r);
    });

    // try_read / try_write：非阻塞尝试
    if let Some(r) = data.try_read() {
        println!("非阻塞读取成功: {:?}", *r);
    }

    reader.join().unwrap();

    // 带超时的加锁
    use std::time::Duration;
    match data.try_write_for(Duration::from_millis(100)) {
        Some(mut w) => { w.push(4); println!("写入成功"); }
        None => println!("获取写锁超时"),
    }
}
```

### 3. `parking_lot::Condvar`

```rust
use parking_lot::{Mutex, Condvar};
use std::sync::Arc;
use std::thread;

fn main() {
    let pair = Arc::new((Mutex::new(false), Condvar::new()));
    let pair2 = Arc::clone(&pair);

    thread::spawn(move || {
        let (lock, cvar) = &*pair2;
        thread::sleep(std::time::Duration::from_millis(50));
        *lock.lock() = true;  // parking_lot: 无需 .unwrap()
        cvar.notify_one();
    });

    let (lock, cvar) = &*pair;
    let mut started = lock.lock();
    // parking_lot 的 wait 直接接受 MutexGuard，无需解包
    cvar.wait_while(&mut started, |s| !*s);
    println!("条件满足！");
}
```

### 4. `std::sync` vs `parking_lot` 选型

| 特性 | `std::sync` | `parking_lot` |
| :--- | :--- | :--- |
| 依赖 | 无（标准库） | 需加依赖 |
| 中毒机制 | ✅ lock() 返回 Result | ❌ 无（更简洁） |
| 内存占用 | 较大 | 更小 |
| 性能 | 良好 | 更快（低竞争时） |
| 超时加锁 | ❌ | ✅ `try_lock_for` |
| `no_std` 支持 | 需 OS 支持 | 部分支持 |

> 推荐原则：新项目且不在乎一个外部依赖时，优先用 `parking_lot`；库代码为减少依赖可用 `std::sync`。

---

## Send 和 Sync：线程安全的类型系统保证

`Send` 和 `Sync` 是 Rust 并发安全的编译期基石——它们是**标记 trait（Marker Traits）**，没有任何方法，纯粹用于向编译器传递类型的线程安全语义。

### 定义

```rust
// Send：类型的所有权可以安全地跨线程转移
// （类型的值可以从一个线程"发送"到另一个线程）
pub unsafe auto trait Send {}

// Sync：类型的共享引用可以安全地跨线程使用
// （&T 可以安全地在多个线程中同时持有）
pub unsafe auto trait Sync {}
```

### 自动推导规则

编译器对结构体/枚举自动推导：
- 若所有字段都是 `Send` → 整体自动 `Send`
- 若所有字段都是 `Sync` → 整体自动 `Sync`

```rust
use std::sync::{Arc, Mutex};

// ✅ Send + Sync（所有字段都安全）
struct SafeData {
    count: Arc<Mutex<u32>>,
    name: String,
}

// ❌ 不是 Send（Rc 不能跨线程）
use std::rc::Rc;
struct UnsafeData {
    value: Rc<u32>, // Rc 不是 Send，因为引用计数非原子
}
```

### 常见类型的 Send/Sync 状态

| 类型 | Send | Sync | 原因 |
| :--- | :---: | :---: | :--- |
| 基础类型 `i32`, `bool` | ✅ | ✅ | 无状态共享问题 |
| `String`, `Vec<T>` | ✅ | ✅ | 有所有权，无共享状态 |
| `Arc<T>` | ✅（T: Send+Sync） | ✅ | 原子引用计数 |
| `Mutex<T>` | ✅（T: Send） | ✅ | 通过锁保证独占访问 |
| `Rc<T>` | ❌ | ❌ | 非原子引用计数 |
| `Cell<T>` | ✅（T: Send） | ❌ | 内部可变性无锁保护 |
| `RefCell<T>` | ✅（T: Send） | ❌ | 运行时借用检查不跨线程 |
| 裸指针 `*const T` | ❌ | ❌ | 编译器保守假设 |
| `MutexGuard<T>` | ❌ | ✅（T: Sync） | 必须在加锁线程释放 |

### 手动实现 Send/Sync

在封装裸指针的 unsafe 代码中，有时需要手动声明类型是线程安全的。这要求程序员自己保证安全性：

```rust
use std::marker::PhantomData;

// 一个线程安全的环形缓冲区指针包装
struct RingBufPtr<T> {
    ptr: *mut T,
    len: usize,
    _marker: PhantomData<T>,
}

// 我们保证：多线程访问通过外部 Mutex 保护，因此手动声明安全
// SAFETY: 外部调用者必须通过锁保证独占访问
unsafe impl<T: Send> Send for RingBufPtr<T> {}
unsafe impl<T: Send> Sync for RingBufPtr<T> {}
```

> [!WARNING]
> 手动实现 `Send`/`Sync` 是 `unsafe` 操作，需要程序员自己证明并发安全性。错误的标记会导致数据竞争，而数据竞争是未定义行为（UB）。

### 通过 !Send / !Sync 阻止跨线程使用

使用 `PhantomData<*mut T>` 或 `PhantomData<Rc<()>>` 让类型变为 `!Send`:

```rust
use std::marker::PhantomData;

// 仅用于单线程的句柄（如 OpenGL 上下文）
struct GlContext {
    id: u32,
    // *mut () 不是 Send，自动使 GlContext 也不是 Send
    _not_send: PhantomData<*mut ()>,
}

impl GlContext {
    fn new() -> Self { GlContext { id: 1, _not_send: PhantomData } }
    fn draw(&self) { println!("在当前线程绘制 GL"); }
}

fn main() {
    let ctx = GlContext::new();
    ctx.draw();

    // ❌ 以下代码编译报错：GlContext 不是 Send
    // std::thread::spawn(move || ctx.draw());
}
```
