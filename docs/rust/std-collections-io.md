---
title: Rust 标准库常用集合与 I/O 系统
hide_title: true
sidebar_label: 标准库集合与 I/O
sidebar_position: 8
---

## Rust 标准库常用集合与 I/O 系统

Rust 的标准库提供了丰富的集合数据结构、多层级的系统级 I/O 工具链、文件系统管理模块以及与操作系统交互的能力。本篇将详细解构常用集合的高阶实践、系统级路径处理、文件与流式 I/O、管道子进程以及跨语言 FFI 基础。

> 🟢 **基础**：掌握基本语法即可阅读。

---

## 📂 标准库常用集合 (Collections)

Rust 的常用集合包括 `Vec`、`String`、`HashMap` 以及 `HashSet`。

### 1. 动态数组 (Vectors)

`Vec` 是大小可变的数组，在堆上分配连续内存。

```rust
fn main() {
    // 1. 初始化
    let mut vec1 = vec![1, 2, 3];
    vec1.push(4); // 压入元素

    // 2. 预分配空间以提高写入性能
    let mut vec2 = Vec::with_capacity(10);
    vec2.extend(0..5);

    // 3. 迭代与解包
    for x in &vec1 {
        println!("Value: {}", x);
    }
}
```

### 2. 字符串 (Strings)

Rust 中有两种主要的字符串类型：

- **`&str`**：指向 UTF-8 编码字符切片的借用引用。
- **`String`**：在堆上分配的可增长 UTF-8 字节数组。

```rust
fn main() {
    // 从只读字面量创建 String
    let mut s = "hello".to_string();
    s.push_str(", world!");

    // 转为 &str 借用
    let slice: &str = &s;
    
    // 字节数与字符数区别
    println!("字节长度: {}, 字符长度: {}", s.len(), s.chars().count());
}
```

### 3. 哈希表 (HashMap) 与哈希集合 (HashSet)

以键值对 (Key-Value) 或单键形式存储数据，默认使用符合加密安全性的 Siphah 哈希算法。

```rust
use std::collections::HashMap;

fn main() {
    let mut scores = HashMap::new();
    scores.insert("Alice".to_string(), 100);

    // Entry API：不存在则插入默认值，存在则获取引用
    scores.entry("Bob".to_string()).or_insert(80);
}
```

#### 自定义 Key 的特征要求

在 Rust 中，要将自定义类型用作 `HashMap` 的键（Key），该类型必须实现以下两个核心特征：

- **`Eq`**：保证等值比较的等价关系。
- **`Hash`**：用于计算该键的哈希值。

通常，我们只需要在结构体上方通过派生自动引入它们即可：

```rust
use std::collections::HashMap;

// 自动派生 Hash 与 Eq
#[derive(PartialEq, Eq, Hash, Debug)]
struct AccountKey {
    id: u32,
    region: String,
}

fn main() {
    let mut accounts = HashMap::new();
    let key = AccountKey { id: 1001, region: "CN".to_string() };
    accounts.insert(key, "Alice");
}
```

---

## 🌐 路径与文件 I/O

### 1. 路径管理 (`Path` & `PathBuf`)

- **`Path`**：类似于 `str`，是一个不可变的操作系统路径切片。
- **`PathBuf`**：类似于 `String`，是一个在堆上分配的可增长操作系统路径缓冲区。

```rust
use std::path::{Path, PathBuf};

fn main() {
    // 创建 Path
    let path = Path::new(".env");

    // 拼接路径，返回 PathBuf
    let mut path_buf = PathBuf::from("usr");
    path_buf.push("local");
    path_buf.push("bin");
}
```

### 2. 文件读写

`std::fs::File` 用于表示被系统打开的文件描述符，支持读取和写入。

#### 创建与写入文件

```rust
use std::fs::File;
use std::io::prelude::*;

fn main() -> std::io::Result<()> {
    // 创建并打开文件以供写入
    let mut file = File::create("output.txt")?;
    file.write_all(b"Hello, Rust I/O!")?;
    Ok(())
}
```

#### 按行读取文件的经典实战

为了防止一次性载入大文件导致内存崩溃，推荐使用 `BufReader` 流式按行读取：

```rust
use std::fs::File;
use std::io::{self, BufRead};
use std::path::Path;

// 返回一个 Reader 的迭代器以供惰性消费
fn read_lines<P>(filename: P) -> io::Result<io::Lines<io::BufReader<File>>>
where P: AsRef<Path>, {
    let file = File::open(filename)?;
    Ok(io::BufReader::new(file).lines())
}

fn main() {
    if let Ok(lines) = read_lines("./output.txt") {
        for line in lines {
            if let Ok(ip) = line {
                println!("{}", ip);
            }
        }
    }
}
```

### 3. 文件系统操作 (`fs`)

`std::fs` 包含一系列用于操纵文件系统项（拷贝文件、新建目录、重命名等）的实用函数。

```rust
use std::fs;

fn main() -> std::io::Result<()> {
    // 创建目录
    fs::create_dir_all("a/b/c")?;
    // 拷贝文件
    fs::copy("output.txt", "a/copy.txt")?;
    Ok(())
}
```

---

## 💻 命令行参数与子进程

### 1. 命令行参数

使用 `std::env::args` 可以获取运行时传入的命令行参数。它的第一个参数通常是可执行文件的路径名：

```rust
use std::env;

fn main() {
    let args: Vec<String> = env::args().collect();

    // 模式匹配解析参数
    match args.len() {
        1 => println!("无参数传入"),
        2 => {
            match args[1].parse::<i32>() {
                Ok(n) => println!("数字参数: {}", n),
                Err(_) => println!("参数不是数字"),
            }
        },
        _ => println!("参数过多"),
    }
}
```

### 2. 子进程管理 (`Command`)

`std::process::Command` 可以在 Rust 中生成一个新的操作系统子进程。

```rust
use std::process::Command;

fn main() {
    // 在 Linux/macOS 下执行 ls -lah
    let output = Command::new("ls")
        .arg("-lah")
        .output()
        .expect("执行 ls 失败");

    // 将标准输出转为 String
    let stdout = String::from_utf8_lossy(&output.stdout);
    println!("ls 结果:\n{}", stdout);
}
```

#### 管道 (Pipes) 与等待 (Wait)

我们可以将一个子进程的输出，通过管道重定向为另一个进程的输入，或使用 `wait` 等待子进程执行完毕：

```rust
use std::process::{Command, Stdio};
use std::io::Write;

fn main() {
    // 生成 echo 子进程，配置其 stdout 为管道式传输
    let mut child = Command::new("cat")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .expect("启动 cat 失败");

    // 写入数据到 cat 的 stdin
    {
        let stdin = child.stdin.as_mut().expect("获取 stdin 失败");
        stdin.write_all(b"Hello Pipe!").unwrap();
    }

    // 等待子进程完成并获取输出
    let output = child.wait_with_output().expect("等待子进程失败");
    println!("输出: {}", String::from_utf8_lossy(&output.stdout));
}
```

---

## 🔌 外部语言接口 (FFI)

Rust 提供了极高的 C 语言二进制接口（ABI）兼容性。通过 `extern` 块，我们可以直接在 Rust 中声明并调用其他语言编译的动态/静态库函数：

```rust
use std::fmt;

// 声明外部的 C 库依赖
extern "C" {
    // 声明 C 语言中的数学绝对值函数 abs
    fn abs(input: i32) -> i32;
}

fn main() {
    unsafe {
        // 调用 C 函数必须被包裹在 unsafe 中
        println!("C 语言 abs(-10) 结果为: {}", abs(-10));
    }
}
```

> [!NOTE]
> **下一步建议**：掌握了标准库的集合和底层系统交互机制后，请继续阅读 [测试与性能分析](testing-benchmarking.md)，了解如何对涉及文件 I/O 和系统调用的程序进行单元测试与基准性能测试。
