# Rust 错误处理与防御性编程

Rust 的核心哲学逻辑之一是：**错误不是意外，而是程序逻辑的一部分**。Rust 彻底废弃了传统的异常（Exception）捕获机制，转而采用类型系统显式化处理结果。

---

## 可恢复错误：Result 与传播

`Result<T, E>` 是一种代数数据类型（Sum Type），它强迫开发者在编译期考虑失败路径。

### 1. 解构的艺术

- **模式匹配**：这是处理 `Result` 最彻底的方式，能保证 100% 的分支覆盖。
- **问号操作符 `?`**：语法糖，用于将错误向上冒泡传播。它背后通过 `From` 特征自动进行错误类型的类型转换。

```rust
fn read_config() -> Result<String, MyError> {
    // 如果 File::open 失败，错误会被自动转换为 MyError 并返回
    let mut f = File::open("config.toml")?;
    let mut s = String::new();
    f.read_to_string(&mut s)?;
    Ok(s)
}
```

### 2. 组合算子 (Combinators)

为了避免深度嵌套的 `match` 语句，可以利用 `Option` 和 `Result` 提供的链式算子：
- `map` / `map_err`：仅在成功/失败时转换内部值，保持容器状态不变。
- `and_then`：类似于 `FlatMap`，用于链接多个可能产生错误的转换。

---

## 不可恢复错误：Panic 与栈展开

当程序遇到无法恢复的逻辑破坏（如数组越权、显式的断言失败）时，会触发 `panic!`。

### 1. 展开 (Unwinding) vs 中止 (Abort)

- **Unwinding (默认)**：Rust 会沿着调用栈逆向清理（Drop）每个函数帧中的局部变量，保障内存安全。
- **Abort**：直接由操作系统终止进程。通常在嵌入式环境或对二进制体积极其敏感的场景（通过 `Cargo.toml` 配置）中使用。

### 2. 零 Panic 承诺

在编写高性能库或生产级服务时，应尽量消除代码中的 `unwrap()` 和 `expect()`。
- 使用 `expect()` 仅限于**静态可证明**绝不会失败的逻辑（例如：在硬编码的字符串上解析正则）。
- 其他情况一律通过类型转换或错误包装返回。

---

## 工业级错误治理：anyhow 与 thiserror

在实际项目中，我们通常遵循以下选型准则：

| 场景 | 推荐方案 | 核心理由 |
| :--- | :--- | :--- |
| **库开发 (Library)** | `thiserror` | 能够生成精细的自定义错误枚举，方便下游调用者进行 match 处理。 |
| **应用开发 (Application)** | `anyhow` | 采用语义化的错误擦除（Dynamic Error Holding），支持 `Context` 链式回溯。 |

```rust
use anyhow::{Context, Result};

fn run_app() -> Result<()> {
    let _ = std::fs::read_to_string("app.json")
        .with_context(|| "Failed to load application manifest")?;
    Ok(())
}
```

> **安全断言**：在 FFI 边界或跨越线程分发（Panic Boundaries）时，建议使用 `std::panic::catch_unwind` 将 Panic 转换为 `Result`，防止整个进程崩溃。
