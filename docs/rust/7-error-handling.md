---
title: 错误处理
hide_title: true
sidebar_label: 错误处理
sidebar_position: 7
---

# 错误处理

Rust 将错误分为两大类：可恢复错误和不可恢复错误。对于可恢复错误，使用 `Result<T, E>`；对于不可恢复错误，使用 `panic!` 宏。

---

## panic! 与不可恢复错误

### 使用 panic

当程序遇到无法处理的错误时，可以调用 `panic!` 宏：

```rust
fn main() {
    panic!("crash and burn");
}
```

### panic! 的两种模式

在 `Cargo.toml` 中可以配置 panic 的行为：

```toml
[profile.release]
panic = 'abort'  # 直接终止程序，不展开栈
```

默认情况下，panic 会展开（unwind）栈，清理数据。

---

## Option 类型

### 定义

`Option` 类型用于处理可能不存在的值：

```rust
enum Option<T> {
    Some(T),
    None,
}
```

### 基本使用

```rust
fn divide(numerator: f64, denominator: f64) -> Option<f64> {
    if denominator == 0.0 {
        None
    } else {
        Some(numerator / denominator)
    }
}

fn main() {
    let result = divide(2.0, 3.0);
    
    match result {
        Some(x) => println!("Result: {}", x),
        None => println!("Cannot divide by 0"),
    }
}
```

### Option 常用方法

```rust
fn main() {
    let some_number = Some(5);
    let no_number: Option<i32> = None;

    // unwrap - 如果是 None 会 panic
    // let x = no_number.unwrap(); // panic!

    // unwrap_or - 提供默认值
    let x = no_number.unwrap_or(0);
    println!("{}", x); // 0

    // unwrap_or_else - 通过闭包计算默认值
    let x = no_number.unwrap_or_else(|| 10);
    println!("{}", x); // 10

    // expect - 自定义 panic 信息
    // let x = no_number.expect("no_number should have a value");

    // is_some / is_none
    if some_number.is_some() {
        println!("some_number has a value");
    }

    // map - 转换内部值
    let mapped = some_number.map(|x| x * 2);
    println!("{:?}", mapped); // Some(10)

    // and_then - 链式调用
    let result = some_number.and_then(|x| Some(x * 2));
    println!("{:?}", result); // Some(10)

    // or - 提供备选 Option
    let x = no_number.or(Some(5));
    println!("{:?}", x); // Some(5)
}
```

---

## Result 类型

### 定义

`Result` 类型用于处理可能失败的操作：

```rust
enum Result<T, E> {
    Ok(T),
    Err(E),
}
```

### 基本使用

```rust
use std::fs::File;
use std::io::ErrorKind;

fn main() {
    let f = File::open("hello.txt");

    let f = match f {
        Ok(file) => file,
        Err(error) => match error.kind() {
            ErrorKind::NotFound => match File::create("hello.txt") {
                Ok(fc) => fc,
                Err(e) => panic!("Problem creating the file: {:?}", e),
            },
            other_error => {
                panic!("Problem opening the file: {:?}", other_error)
            }
        },
    };
}
```

### 使用 unwrap 和 expect

```rust
use std::fs::File;

fn main() {
    // unwrap - 如果是 Err 会 panic
    let f = File::open("hello.txt").unwrap();

    // expect - 自定义 panic 信息
    let f = File::open("hello.txt").expect("Failed to open hello.txt");
}
```

---

## 传播错误

### 使用 ? 运算符

`?` 运算符用于简化错误传播：

```rust
use std::fs::File;
use std::io::{self, Read};

fn read_username_from_file() -> Result<String, io::Error> {
    let mut f = File::open("hello.txt")?;
    let mut s = String::new();
    f.read_to_string(&mut s)?;
    Ok(s)
}

// 更简洁的写法
fn read_username_from_file_v2() -> Result<String, io::Error> {
    let mut s = String::new();
    File::open("hello.txt")?.read_to_string(&mut s)?;
    Ok(s)
}

// 使用标准库函数
fn read_username_from_file_v3() -> Result<String, io::Error> {
    std::fs::read_to_string("hello.txt")
}
```

### ? 运算符的工作原理

`?` 运算符会：
1. 如果值是 `Ok`，从 `Ok` 中取出值并继续执行
2. 如果值是 `Err`，立即返回该错误

`?` 运算符会调用 `From` trait 来转换错误类型。

---

## 组合器（Combinators）

### map

转换 `Option` 或 `Result` 内部的值：

```rust
fn main() {
    let some_string = Some("Hello, World!");
    let some_len = some_string.map(|s| s.len());
    println!("{:?}", some_len); // Some(13)

    // 对 Result 使用 map
    let ok_value: Result<i32, &str> = Ok(2);
    let ok_mapped = ok_value.map(|v| v * 2);
    println!("{:?}", ok_mapped); // Ok(4)
}
```

### and_then

链式调用可能失败的操作：

```rust
fn main() {
    let some_value = Some("123");
    let result = some_value.and_then(|s| s.parse::<i32>().ok());
    println!("{:?}", result); // Some(123)

    // 对 Result 使用 and_then
    fn sq(x: u32) -> Result<u32, &'static str> {
        Ok(x * x)
    }
    
    fn nope(_: u32) -> Result<u32, &'static str> {
        Err("error")
    }

    assert_eq!(Ok(2).and_then(sq).and_then(sq), Ok(16));
    assert_eq!(Ok(2).and_then(sq).and_then(nope), Err("error"));
}
```

### or 和 or_else

提供备选值：

```rust
fn main() {
    let x = Some(2);
    let y: Option<i32> = None;
    
    assert_eq!(x.or(y), Some(2));
    assert_eq!(y.or(x), Some(2));

    // or_else 使用闭包
    assert_eq!(y.or_else(|| Some(100)), Some(100));
}
```

### filter

根据条件过滤：

```rust
fn main() {
    let some_value = Some(10);
    
    let even = some_value.filter(|&x| x % 2 == 0);
    println!("{:?}", even); // Some(10)
    
    let odd = some_value.filter(|&x| x % 2 != 0);
    println!("{:?}", odd); // None
}
```

---

## 处理多种错误类型

### 使用 Box\<dyn Error\>

最简单的方式是使用类型擦除：

```rust
use std::error::Error;
use std::fs::File;
use std::io::Read;

fn read_file() -> Result<String, Box<dyn Error>> {
    let mut file = File::open("hello.txt")?;
    let mut contents = String::new();
    file.read_to_string(&mut contents)?;
    Ok(contents)
}

fn main() -> Result<(), Box<dyn Error>> {
    let contents = read_file()?;
    println!("{}", contents);
    Ok(())
}
```

### 自定义错误类型

创建自定义错误枚举：

```rust
use std::fmt;
use std::io;
use std::num::ParseIntError;

#[derive(Debug)]
enum AppError {
    Io(io::Error),
    Parse(ParseIntError),
    Custom(String),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            AppError::Io(e) => write!(f, "IO error: {}", e),
            AppError::Parse(e) => write!(f, "Parse error: {}", e),
            AppError::Custom(s) => write!(f, "Custom error: {}", s),
        }
    }
}

impl std::error::Error for AppError {}

impl From<io::Error> for AppError {
    fn from(error: io::Error) -> Self {
        AppError::Io(error)
    }
}

impl From<ParseIntError> for AppError {
    fn from(error: ParseIntError) -> Self {
        AppError::Parse(error)
    }
}

fn read_and_parse() -> Result<i32, AppError> {
    let contents = std::fs::read_to_string("number.txt")?;
    let number = contents.trim().parse::<i32>()?;
    Ok(number)
}
```

### 使用 thiserror 库

`thiserror` 提供了便捷的错误定义方式：

```rust
use thiserror::Error;

#[derive(Error, Debug)]
enum DataError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("Parse error: {0}")]
    Parse(#[from] std::num::ParseIntError),
    
    #[error("Invalid data: {0}")]
    Invalid(String),
}
```

### 使用 anyhow 库

`anyhow` 用于应用程序中简化错误处理：

```rust
use anyhow::{Context, Result};

fn read_config() -> Result<String> {
    let content = std::fs::read_to_string("config.toml")
        .context("Failed to read config file")?;
    Ok(content)
}
```

---

## 迭代 Result

### collect 方法

将 `Vec<Result<T, E>>` 转换为 `Result<Vec<T>, E>`：

```rust
fn main() {
    let strings = vec!["42", "93", "18"];
    let numbers: Result<Vec<_>, _> = strings
        .iter()
        .map(|s| s.parse::<i32>())
        .collect();
    
    println!("{:?}", numbers); // Ok([42, 93, 18])

    let strings = vec!["42", "foo", "18"];
    let numbers: Result<Vec<_>, _> = strings
        .iter()
        .map(|s| s.parse::<i32>())
        .collect();
    
    println!("{:?}", numbers); // Err(...)
}
```

### partition 方法

将 Result 分为成功和失败两组：

```rust
fn main() {
    let strings = vec!["42", "foo", "93", "bar", "18"];
    let results: Vec<Result<i32, _>> = strings
        .iter()
        .map(|s| s.parse::<i32>())
        .collect();
    
    let (numbers, errors): (Vec<_>, Vec<_>) = results
        .into_iter()
        .partition(Result::is_ok);
    
    let numbers: Vec<_> = numbers.into_iter().map(Result::unwrap).collect();
    let errors: Vec<_> = errors.into_iter().map(Result::unwrap_err).collect();
    
    println!("Numbers: {:?}", numbers); // [42, 93, 18]
    println!("Errors: {:?}", errors);
}
```

---

## 最佳实践

### 1. 优先使用 Result 而不是 panic

```rust
// ❌ 不好的做法
fn divide(a: i32, b: i32) -> i32 {
    if b == 0 {
        panic!("Division by zero!");
    }
    a / b
}

// ✅ 好的做法
fn divide(a: i32, b: i32) -> Result<i32, String> {
    if b == 0 {
        Err(String::from("Division by zero"))
    } else {
        Ok(a / b)
    }
}
```

### 2. 使用 ? 运算符简化代码

```rust
// ❌ 冗长的写法
fn read_file() -> Result<String, std::io::Error> {
    let file = match std::fs::File::open("file.txt") {
        Ok(f) => f,
        Err(e) => return Err(e),
    };
    // ...
    Ok(String::new())
}

// ✅ 简洁的写法
fn read_file() -> Result<String, std::io::Error> {
    let mut file = std::fs::File::open("file.txt")?;
    // ...
    Ok(String::new())
}
```

### 3. 提供有意义的错误信息

```rust
use std::fs::File;

fn main() {
    // ❌ 不好的做法
    let f = File::open("config.toml").unwrap();
    
    // ✅ 好的做法
    let f = File::open("config.toml")
        .expect("Failed to open config.toml - make sure the file exists");
}
```

### 4. main 函数返回 Result

```rust
use std::error::Error;

fn main() -> Result<(), Box<dyn Error>> {
    let f = std::fs::File::open("hello.txt")?;
    // ...
    Ok(())
}
```

---

## 实践示例

### 示例 1：解析配置文件

```rust
use std::fs;
use std::num::ParseIntError;

#[derive(Debug)]
struct Config {
    port: u16,
    host: String,
}

#[derive(Debug)]
enum ConfigError {
    Io(std::io::Error),
    Parse(ParseIntError),
    InvalidFormat,
}

impl From<std::io::Error> for ConfigError {
    fn from(error: std::io::Error) -> Self {
        ConfigError::Io(error)
    }
}

impl From<ParseIntError> for ConfigError {
    fn from(error: ParseIntError) -> Self {
        ConfigError::Parse(error)
    }
}

fn parse_config(path: &str) -> Result<Config, ConfigError> {
    let contents = fs::read_to_string(path)?;
    
    let lines: Vec<&str> = contents.lines().collect();
    if lines.len() < 2 {
        return Err(ConfigError::InvalidFormat);
    }
    
    let port = lines[0].trim().parse::<u16>()?;
    let host = lines[1].trim().to_string();
    
    Ok(Config { port, host })
}

fn main() {
    match parse_config("config.txt") {
        Ok(config) => println!("Config: {:?}", config),
        Err(e) => eprintln!("Error: {:?}", e),
    }
}
```

### 示例 2：处理用户输入

```rust
use std::io::{self, Write};

fn get_number() -> Result<i32, Box<dyn std::error::Error>> {
    print!("Enter a number: ");
    io::stdout().flush()?;
    
    let mut input = String::new();
    io::stdin().read_line(&mut input)?;
    
    let number: i32 = input.trim().parse()?;
    Ok(number)
}

fn main() {
    match get_number() {
        Ok(n) => println!("You entered: {}", n),
        Err(e) => eprintln!("Error: {}", e),
    }
}
```

---

> [!TIP]
> **下一步**：掌握了错误处理后，继续学习 [标准库集合与 I/O](8.1-std-collections-io.md)，了解 Rust 标准库提供的常用数据结构和文件操作。

---

## Never 类型 (`!`) 与错误处理

Rust 的**发散类型 `!`（Never Type）**表示一个函数或表达式永远不会正常返回。它在错误处理中有重要用途。

### panic! 的类型是 `!`

`panic!` 宏的类型是 `!`，因此可以出现在任何需要某种类型值的地方（`!` 可强制转换为任意类型）：

```rust
fn get_value(map: &std::collections::HashMap<&str, i32>, key: &str) -> i32 {
    match map.get(key) {
        Some(&v) => v,
        None => panic!("Key '{}' not found", key), // ! 类型，编译通过
    }
}
```

### `!` 配合 `loop` 实现无限运行的服务

```rust
// 返回 ! 表示该函数永不返回（例如服务主循环）
fn server_loop() -> ! {
    loop {
        // 处理请求...
        println!("处理请求中...");
    }
}
```

### `continue` 与 `break` 的类型也是 `!`

这使得如下模式成为可能：

```rust
fn parse_positive(s: &str) -> u32 {
    let n: u32 = loop {
        match s.parse() {
            Ok(n) if n > 0 => break n,   // break 携带值，类型为 u32
            _ => continue,               // continue 类型为 !，不影响 break 的类型推导
        }
    };
    n
}
```

---

## 提前返回模式与错误边界

在大型应用中，通常将"应用层错误"与"域层错误"分开处理：

```rust
use thiserror::Error;
use anyhow::{Context, Result, bail, ensure};

// 域层错误：精确描述业务规则失败
#[derive(Error, Debug)]
enum DomainError {
    #[error("用户年龄 {age} 不满足最低要求 {min}")]
    AgeTooLow { age: u8, min: u8 },
    #[error("用户名 '{0}' 包含非法字符")]
    InvalidUsername(String),
}

fn validate_user(name: &str, age: u8) -> Result<(), DomainError> {
    // ensure! 宏：条件不满足时返回指定错误（等同于 if !cond { return Err(...) }）
    if name.chars().any(|c| !c.is_alphanumeric()) {
        return Err(DomainError::InvalidUsername(name.to_string()));
    }
    if age < 18 {
        return Err(DomainError::AgeTooLow { age, min: 18 });
    }
    Ok(())
}

// 应用层：使用 anyhow 统一包装，附加上下文
fn register_user(name: &str, age: u8) -> Result<String> {
    validate_user(name, age)
        .context(format!("注册用户 '{}' 失败", name))?;
    
    Ok(format!("用户 {} 注册成功", name))
}

fn main() {
    match register_user("alice123", 17) {
        Ok(msg) => println!("{}", msg),
        Err(e) => {
            eprintln!("错误: {}", e);
            // anyhow 支持打印完整的错误链
            eprintln!("错误链:\n{:?}", e);
        }
    }
}
```

### 迭代 Result：partition_map 与 partition

当处理一批操作结果时，常见模式是将成功与失败分离：

```rust
fn main() {
    let strings = vec!["1", "2", "abc", "4", "xyz"];

    // 方法1：collect 进 Result<Vec<_>, _>，遇到第一个错误即早停
    let all_or_nothing: Result<Vec<i32>, _> = strings.iter()
        .map(|s| s.parse::<i32>())
        .collect();
    println!("全部成功或第一个错误: {:?}", all_or_nothing);

    // 方法2：partition 分离成功与失败
    let (oks, errs): (Vec<_>, Vec<_>) = strings.iter()
        .map(|s| s.parse::<i32>())
        .partition(Result::is_ok);

    let values: Vec<i32> = oks.into_iter().map(Result::unwrap).collect();
    let errors: Vec<_> = errs.into_iter().map(Result::unwrap_err).collect();

    println!("成功: {:?}", values);
    println!("失败: {:?}", errors);
}
```

---

## panic hook 与 `catch_unwind`

### 1. 自定义 panic hook

`std::panic::set_hook` 允许在程序 panic 前执行自定义逻辑（如记录日志、发送告警）：

```rust
use std::panic;

fn main() {
    // 注册自定义 panic hook
    panic::set_hook(Box::new(|panic_info| {
        // 获取 panic 消息
        let message = if let Some(s) = panic_info.payload().downcast_ref::<&str>() {
            *s
        } else if let Some(s) = panic_info.payload().downcast_ref::<String>() {
            s.as_str()
        } else {
            "未知 panic"
        };

        // 获取发生位置
        if let Some(location) = panic_info.location() {
            eprintln!("[PANIC] {} at {}:{}", message, location.file(), location.line());
        } else {
            eprintln!("[PANIC] {}", message);
        }

        // 在这里可以：写入日志文件、发送告警通知、保存崩溃报告
    }));

    panic!("something went wrong"); // 触发自定义 hook
}
```

恢复默认 hook：

```rust
let _ = std::panic::take_hook(); // 取出当前 hook 并恢复默认
```

### 2. `catch_unwind`：捕获 panic

`std::panic::catch_unwind` 捕获闭包内发生的 panic，防止整个程序崩溃。主要用于：
- **线程池**：防止一个任务 panic 导致 Worker 线程退出
- **FFI 边界**：防止 Rust panic 跨越 FFI 边界（未定义行为）
- **测试框架**：隔离测试用例的 panic

```rust
use std::panic;

fn risky_operation(x: i32) -> i32 {
    if x == 0 { panic!("除数不能为零！") }
    100 / x
}

fn main() {
    // 正常情况
    let result = panic::catch_unwind(|| risky_operation(5));
    println!("5: {:?}", result); // Ok(20)

    // panic 被捕获，不会终止程序
    let result = panic::catch_unwind(|| risky_operation(0));
    match result {
        Ok(val)  => println!("结果: {}", val),
        Err(err) => {
            // 提取 panic 消息
            let msg = err.downcast_ref::<&str>()
                .copied()
                .or_else(|| err.downcast_ref::<String>().map(|s| s.as_str()))
                .unwrap_or("unknown panic");
            println!("捕获到 panic: {}", msg);
        }
    }

    println!("程序继续运行"); // ✅
}
```

### 3. 线程池中的 panic 隔离

```rust
use std::panic;
use std::sync::mpsc;

fn execute_task(task: impl FnOnce() -> i32 + panic::UnwindSafe) -> Result<i32, String> {
    panic::catch_unwind(task)
        .map_err(|e| {
            e.downcast_ref::<&str>()
                .map(|s| s.to_string())
                .unwrap_or_else(|| "任务 panic".to_string())
        })
}

fn main() {
    let tasks: Vec<Box<dyn Fn() -> i32 + Send + panic::UnwindSafe>> = vec![
        Box::new(|| 1 + 1),
        Box::new(|| panic!("任务 B 崩溃了")),
        Box::new(|| 3 * 10),
    ];

    for (i, task) in tasks.into_iter().enumerate() {
        match execute_task(task) {
            Ok(result) => println!("任务 {}: 成功 = {}", i, result),
            Err(msg)   => println!("任务 {}: 失败 = {}", i, msg),
        }
    }
    // 任务 0: 成功 = 2
    // 任务 1: 失败 = 任务 B 崩溃了
    // 任务 2: 成功 = 30
}
```

> [!WARNING]
> `catch_unwind` **不是** 通用的错误处理机制。它不能捕获：
> - `panic = "abort"` 模式下的 panic（直接终止进程）
> - 栈溢出（stack overflow）
> - 信号（SIGABRT 等）
>
> 正常的业务逻辑错误应使用 `Result<T, E>`，`catch_unwind` 只用于防御性的 panic 边界隔离。
