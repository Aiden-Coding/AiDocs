---
title: 标准库集合与 I/O
hide_title: true
sidebar_label: 标准库集合与 I/O
sidebar_position: 8
---

# 标准库集合与 I/O

Rust 标准库提供了丰富的集合类型和强大的 I/O 功能。本章介绍常用的数据结构和文件操作。

---

## 标准库类型

### Vec（动态数组）

`Vec<T>` 是可增长的数组，存储在堆上：

```rust
fn main() {
    // 创建 Vec
    let mut v1: Vec<i32> = Vec::new();
    let v2 = vec![1, 2, 3];

    // 添加元素
    v1.push(1);
    v1.push(2);
    v1.push(3);

    // 访问元素
    let third: &i32 = &v2[2];
    println!("The third element is {}", third);

    match v2.get(2) {
        Some(third) => println!("The third element is {}", third),
        None => println!("There is no third element."),
    }

    // 遍历
    for i in &v2 {
        println!("{}", i);
    }

    // 可变遍历
    let mut v3 = vec![1, 2, 3];
    for i in &mut v3 {
        *i += 50;
    }
}
```

### String（字符串）

Rust 有两种字符串类型：

- `String` - 可增长的、可变的、有所有权的 UTF-8 编码字符串
- `&str` - 不可变的字符串切片

```rust
fn main() {
    // 创建 String
    let mut s = String::new();
    let s = "initial contents".to_string();
    let s = String::from("initial contents");

    // 追加字符串
    let mut s = String::from("foo");
    s.push_str("bar");
    s.push('!');

    // 拼接字符串
    let s1 = String::from("Hello, ");
    let s2 = String::from("world!");
    let s3 = s1 + &s2; // s1 被移动，不能再使用

    // 使用 format! 宏
    let s1 = String::from("tic");
    let s2 = String::from("tac");
    let s3 = String::from("toe");
    let s = format!("{}-{}-{}", s1, s2, s3);

    // 遍历字符串
    for c in "नमस्ते".chars() {
        println!("{}", c);
    }

    for b in "नमस्ते".bytes() {
        println!("{}", b);
    }
}
```

### HashMap（哈希表）

```rust
use std::collections::HashMap;

fn main() {
    // 创建 HashMap
    let mut scores = HashMap::new();
    scores.insert(String::from("Blue"), 10);
    scores.insert(String::from("Yellow"), 50);

    // 访问值
    let team_name = String::from("Blue");
    let score = scores.get(&team_name);

    // 遍历
    for (key, value) in &scores {
        println!("{}: {}", key, value);
    }

    // 只在键没有对应值时插入
    scores.entry(String::from("Yellow")).or_insert(50);
    scores.entry(String::from("Blue")).or_insert(50);

    // 根据旧值更新值
    let text = "hello world wonderful world";
    let mut map = HashMap::new();

    for word in text.split_whitespace() {
        let count = map.entry(word).or_insert(0);
        *count += 1;
    }

    println!("{:?}", map);
}
```

### Box（堆分配）

`Box<T>` 是最简单的智能指针，在堆上存储数据：

```rust
fn main() {
    let b = Box::new(5);
    println!("b = {}", b);
    
    // 递归类型需要使用 Box
    enum List {
        Cons(i32, Box<List>),
        Nil,
    }

    use List::{Cons, Nil};

    let list = Cons(1, Box::new(Cons(2, Box::new(Cons(3, Box::new(Nil))))));
}
```

---

## 文件 I/O

### 读取文件

```rust
use std::fs;
use std::io;

fn main() -> io::Result<()> {
    // 一次性读取整个文件
    let contents = fs::read_to_string("hello.txt")?;
    println!("File contents:\n{}", contents);

    // 读取为字节
    let bytes = fs::read("hello.txt")?;
    println!("File size: {} bytes", bytes.len());

    Ok(())
}
```

### 写入文件

```rust
use std::fs;
use std::io;

fn main() -> io::Result<()> {
    // 写入字符串
    fs::write("output.txt", "Hello, Rust!")?;

    // 写入字节
    fs::write("output.bin", b"Binary data")?;

    Ok(())
}
```

### 使用 File 类型

```rust
use std::fs::File;
use std::io::{self, Read, Write};

fn main() -> io::Result<()> {
    // 打开文件读取
    let mut file = File::open("hello.txt")?;
    let mut contents = String::new();
    file.read_to_string(&mut contents)?;
    println!("{}", contents);

    // 创建并写入文件
    let mut file = File::create("output.txt")?;
    file.write_all(b"Hello, world!")?;

    Ok(())
}
```

### 缓冲读写

使用 `BufReader` 和 `BufWriter` 提高性能：

```rust
use std::fs::File;
use std::io::{self, BufRead, BufReader, BufWriter, Write};

fn main() -> io::Result<()> {
    // 缓冲读取
    let file = File::open("input.txt")?;
    let reader = BufReader::new(file);

    for line in reader.lines() {
        println!("{}", line?);
    }

    // 缓冲写入
    let file = File::create("output.txt")?;
    let mut writer = BufWriter::new(file);

    writeln!(writer, "Line 1")?;
    writeln!(writer, "Line 2")?;
    writeln!(writer, "Line 3")?;

    Ok(())
}
```

---

## 路径操作

### Path 和 PathBuf

```rust
use std::path::{Path, PathBuf};

fn main() {
    // 创建 Path
    let path = Path::new("./foo/bar.txt");

    // 获取文件名
    if let Some(file_name) = path.file_name() {
        println!("File name: {:?}", file_name);
    }

    // 获取扩展名
    if let Some(ext) = path.extension() {
        println!("Extension: {:?}", ext);
    }

    // 获取父目录
    if let Some(parent) = path.parent() {
        println!("Parent: {:?}", parent);
    }

    // 使用 PathBuf 构建路径
    let mut path_buf = PathBuf::from("/tmp");
    path_buf.push("foo");
    path_buf.push("bar.txt");
    println!("Path: {:?}", path_buf);

    // 设置扩展名
    path_buf.set_extension("md");
    println!("New path: {:?}", path_buf);
}
```

---

## 文件系统操作

### 创建和删除目录

```rust
use std::fs;
use std::io;

fn main() -> io::Result<()> {
    // 创建目录
    fs::create_dir("new_dir")?;

    // 递归创建目录
    fs::create_dir_all("path/to/new/dir")?;

    // 删除空目录
    fs::remove_dir("new_dir")?;

    // 递归删除目录
    fs::remove_dir_all("path/to/dir")?;

    Ok(())
}
```

### 复制和移动文件

```rust
use std::fs;
use std::io;

fn main() -> io::Result<()> {
    // 复制文件
    fs::copy("source.txt", "destination.txt")?;

    // 重命名/移动文件
    fs::rename("old_name.txt", "new_name.txt")?;

    // 删除文件
    fs::remove_file("file.txt")?;

    Ok(())
}
```

### 读取目录

```rust
use std::fs;
use std::io;

fn main() -> io::Result<()> {
    // 读取目录内容
    let entries = fs::read_dir(".")?;

    for entry in entries {
        let entry = entry?;
        let path = entry.path();

        if path.is_dir() {
            println!("Directory: {:?}", path);
        } else {
            println!("File: {:?}", path);
        }
    }

    Ok(())
}
```

### 获取文件元数据

```rust
use std::fs;
use std::io;

fn main() -> io::Result<()> {
    let metadata = fs::metadata("file.txt")?;

    println!("File size: {} bytes", metadata.len());
    println!("Is directory: {}", metadata.is_dir());
    println!("Is file: {}", metadata.is_file());
    println!("Read only: {}", metadata.permissions().readonly());

    if let Ok(modified) = metadata.modified() {
        println!("Last modified: {:?}", modified);
    }

    Ok(())
}
```

---

## 标准输入输出

### 读取标准输入

```rust
use std::io::{self, BufRead};

fn main() -> io::Result<()> {
    println!("Enter your name:");

    let mut input = String::new();
    io::stdin().read_line(&mut input)?;

    println!("Hello, {}!", input.trim());

    // 读取所有行
    let stdin = io::stdin();
    for line in stdin.lock().lines() {
        println!("You typed: {}", line?);
    }

    Ok(())
}
```

### 写入标准输出和标准错误

```rust
use std::io::{self, Write};

fn main() -> io::Result<()> {
    // 标准输出
    println!("This goes to stdout");
    io::stdout().write_all(b"Direct stdout write\n")?;

    // 标准错误
    eprintln!("This goes to stderr");
    io::stderr().write_all(b"Direct stderr write\n")?;

    Ok(())
}
```

---

## 进程与命令

### 执行外部命令

```rust
use std::process::Command;

fn main() {
    // 简单执行
    let output = Command::new("ls")
        .arg("-la")
        .output()
        .expect("Failed to execute command");

    println!("Status: {}", output.status);
    println!("Stdout: {}", String::from_utf8_lossy(&output.stdout));
    println!("Stderr: {}", String::from_utf8_lossy(&output.stderr));

    // 继承标准 I/O
    let status = Command::new("echo")
        .arg("Hello from child process")
        .status()
        .expect("Failed to execute command");

    println!("Process exited with: {}", status);
}
```

### 管道和重定向

```rust
use std::process::{Command, Stdio};
use std::io::Write;

fn main() {
    // 管道示例
    let mut child = Command::new("cat")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .expect("Failed to spawn child process");

    if let Some(mut stdin) = child.stdin.take() {
        stdin.write_all(b"Hello from Rust!\n").unwrap();
    }

    let output = child.wait_with_output().unwrap();
    println!("Output: {}", String::from_utf8_lossy(&output.stdout));
}
```

---

## 环境变量

### 读取环境变量

```rust
use std::env;

fn main() {
    // 获取特定环境变量
    match env::var("HOME") {
        Ok(val) => println!("HOME: {}", val),
        Err(e) => println!("Couldn't read HOME: {}", e),
    }

    // 使用 var_os 获取 OsString
    if let Some(path) = env::var_os("PATH") {
        println!("PATH: {:?}", path);
    }

    // 遍历所有环境变量
    for (key, value) in env::vars() {
        println!("{}: {}", key, value);
    }
}
```

### 设置环境变量

```rust
use std::env;

fn main() {
    env::set_var("MY_VAR", "my_value");

    match env::var("MY_VAR") {
        Ok(val) => println!("MY_VAR: {}", val),
        Err(e) => println!("Error: {}", e),
    }

    env::remove_var("MY_VAR");
}
```

---

## 程序参数

### 读取命令行参数

```rust
use std::env;

fn main() {
    let args: Vec<String> = env::args().collect();

    println!("Program: {}", args[0]);
    
    if args.len() > 1 {
        println!("Arguments:");
        for (i, arg) in args.iter().enumerate().skip(1) {
            println!("  {}: {}", i, arg);
        }
    }
}
```

### 使用 clap 解析参数

虽然这是外部库，但值得一提：

```rust
// Cargo.toml: clap = { version = "4", features = ["derive"] }

use clap::Parser;

#[derive(Parser)]
#[command(name = "myapp")]
#[command(about = "A simple CLI app", long_about = None)]
struct Cli {
    #[arg(short, long)]
    name: String,

    #[arg(short, long, default_value_t = 1)]
    count: u8,
}

fn main() {
    let cli = Cli::parse();

    for _ in 0..cli.count {
        println!("Hello, {}!", cli.name);
    }
}
```

---

## 实践示例

### 示例 1：单词计数器

```rust
use std::collections::HashMap;
use std::env;
use std::fs;

fn main() {
    let args: Vec<String> = env::args().collect();
    
    if args.len() < 2 {
        eprintln!("Usage: {} <filename>", args[0]);
        return;
    }

    let contents = fs::read_to_string(&args[1])
        .expect("Failed to read file");

    let mut word_count = HashMap::new();

    for word in contents.split_whitespace() {
        let word = word.to_lowercase();
        *word_count.entry(word).or_insert(0) += 1;
    }

    for (word, count) in word_count.iter() {
        println!("{}: {}", word, count);
    }
}
```

### 示例 2：文件搜索工具

```rust
use std::env;
use std::fs;
use std::io::{self, BufRead, BufReader};

fn main() -> io::Result<()> {
    let args: Vec<String> = env::args().collect();
    
    if args.len() < 3 {
        eprintln!("Usage: {} <pattern> <filename>", args[0]);
        return Ok(());
    }

    let pattern = &args[1];
    let filename = &args[2];

    let file = fs::File::open(filename)?;
    let reader = BufReader::new(file);

    for (line_num, line) in reader.lines().enumerate() {
        let line = line?;
        if line.contains(pattern) {
            println!("{}: {}", line_num + 1, line);
        }
    }

    Ok(())
}
```

---

> [!TIP]
> **下一步**：掌握了标准库集合和 I/O 后，继续学习 [并发编程](concurrency.md)，了解 Rust 的多线程和并发模型。
