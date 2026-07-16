---
title: 测试与基准测试
hide_title: true
sidebar_label: 测试与基准测试
sidebar_position: 10
---

# 测试与基准测试

Rust 内置了强大的测试框架，本章介绍如何编写和运行测试。

---

## 编写测试

### 基本测试

使用 `#[test]` 属性标记测试函数：

```rust
#[cfg(test)]
mod tests {
    #[test]
    fn it_works() {
        assert_eq!(2 + 2, 4);
    }
}
```

### 运行测试

```bash
cargo test           # 运行所有测试
cargo test test_name # 运行特定测试
cargo test --test integration_test # 运行特定集成测试文件
```

---

## 断言宏

### assert

```rust
#[test]
fn test_assert() {
    assert!(true);
    assert!(1 + 1 == 2);
}
```

### assert_eq! 和 assert_ne

```rust
#[test]
fn test_equality() {
    assert_eq!(2 + 2, 4);
    assert_ne!(2 + 2, 5);
}
```

### 自定义错误消息

```rust
#[test]
fn test_with_message() {
    let result = 2 + 2;
    assert_eq!(result, 4, "2 + 2 should equal 4, but got {}", result);
}
```

---

## 测试 panic

### should_panic

测试预期会 panic 的代码：

```rust
#[test]
#[should_panic]
fn test_panic() {
    panic!("This should panic");
}

#[test]
#[should_panic(expected = "divide by zero")]
fn test_panic_with_message() {
    let _ = 10 / 0;
}
```

---

## 使用 Result

测试可以返回 `Result<T, E>`：

```rust
#[test]
fn test_with_result() -> Result<(), String> {
    if 2 + 2 == 4 {
        Ok(())
    } else {
        Err(String::from("two plus two does not equal four"))
    }
}
```

---

## 控制测试运行

### 并行或串行运行

```bash
cargo test -- --test-threads=1  # 串行运行
cargo test -- --test-threads=4  # 4个线程并行
```

### 显示打印输出

```bash
cargo test -- --show-output
cargo test -- --nocapture
```

### 运行特定测试

```bash
cargo test test_name          # 运行名称包含 test_name 的测试
cargo test --test integration # 运行集成测试
cargo test --lib              # 只运行库测试
cargo test --bin binary_name  # 运行特定二进制的测试
```

---

## 忽略测试

### 标记为 ignore

```rust
#[test]
#[ignore]
fn expensive_test() {
    // 耗时的测试
}
```

### 运行被忽略的测试

```bash
cargo test -- --ignored
cargo test -- --include-ignored  # 运行所有测试包括被忽略的
```

---

## 单元测试

单元测试通常放在被测试代码的同一文件中：

```rust
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_add() {
        assert_eq!(add(2, 2), 4);
    }

    #[test]
    fn test_add_negative() {
        assert_eq!(add(-1, 1), 0);
    }
}
```

### 测试私有函数

单元测试可以测试私有函数：

```rust
fn internal_adder(a: i32, b: i32) -> i32 {
    a + b
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn internal() {
        assert_eq!(internal_adder(2, 2), 4);
    }
}
```

---

## 集成测试

集成测试位于 `tests` 目录：

```text
my_project/
├── Cargo.toml
├── src/
│   └── lib.rs
└── tests/
    ├── integration_test.rs
    └── common/
        └── mod.rs
```

### 集成测试示例

```rust
// tests/integration_test.rs
use my_project;

#[test]
fn test_add() {
    assert_eq!(my_project::add(2, 2), 4);
}
```

### 共享代码

```rust
// tests/common/mod.rs
pub fn setup() {
    // 测试设置代码
}

// tests/integration_test.rs
mod common;

#[test]
fn test_with_setup() {
    common::setup();
    // 测试代码
}
```

---

## 文档测试

文档注释中的代码会被测试：

```rust
/// 将两个数字相加
///
/// # Examples
///
/// ```
/// use my_crate::add;
/// 
/// let result = add(2, 2);
/// assert_eq!(result, 4);
/// ```
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}
```

### 隐藏文档测试中的行

```rust
/// # Examples
///
/// ```
/// # fn main() {
/// let x = 5;
/// # }
/// ```
```

### 标记为 no_run

```rust
/// ```no_run
/// let server = Server::new();
/// server.run(); // 不会实际运行
/// ```
```

### 标记为 ignore

```rust
/// ```ignore
/// This example is ignored
/// ```
```

### 编译失败测试

```rust
/// ```compile_fail
/// let x: i32 = "hello"; // 这应该无法编译
/// ```
```

---

## 基准测试

### 使用 bencher (不稳定特性)

需要 nightly Rust：

```rust
#![feature(test)]
extern crate test;

pub fn fibonacci(n: u64) -> u64 {
    match n {
        0 => 0,
        1 => 1,
        n => fibonacci(n - 1) + fibonacci(n - 2),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use test::Bencher;

    #[bench]
    fn bench_fibonacci(b: &mut Bencher) {
        b.iter(|| fibonacci(20));
    }
}
```

### 使用 Criterion (推荐)

在 `Cargo.toml` 中添加：

```toml
[dev-dependencies]
criterion = "0.5"

[[bench]]
name = "my_benchmark"
harness = false
```

创建 `benches/my_benchmark.rs`：

```rust
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn fibonacci(n: u64) -> u64 {
    match n {
        0 => 0,
        1 => 1,
        n => fibonacci(n - 1) + fibonacci(n - 2),
    }
}

fn criterion_benchmark(c: &mut Criterion) {
    c.bench_function("fib 20", |b| b.iter(|| fibonacci(black_box(20))));
}

criterion_group!(benches, criterion_benchmark);
criterion_main!(benches);
```

运行基准测试：

```bash
cargo bench
```

---

## 测试组织

### 按功能分组

```rust
#[cfg(test)]
mod tests {
    use super::*;

    mod addition {
        use super::*;

        #[test]
        fn test_positive() {
            assert_eq!(add(1, 2), 3);
        }

        #[test]
        fn test_negative() {
            assert_eq!(add(-1, -2), -3);
        }
    }

    mod subtraction {
        use super::*;

        #[test]
        fn test_positive() {
            assert_eq!(subtract(5, 3), 2);
        }
    }
}
```

---

## 属性宏

### 常用测试属性

- `#[test]` - 标记测试函数
- `#[ignore]` - 忽略测试
- `#[should_panic]` - 预期 panic
- `#[cfg(test)]` - 条件编译
- `#[bench]` - 基准测试 (需要 nightly)

### 条件编译

```rust
#[cfg(test)]
mod tests {
    #[test]
    #[cfg(target_os = "linux")]
    fn linux_only_test() {
        // 只在 Linux 上运行
    }

    #[test]
    #[cfg(not(target_os = "windows"))]
    fn not_windows_test() {
        // 不在 Windows 上运行
    }
}
```

---

## Mock 和 Stub

### 使用 mockall

```toml
[dev-dependencies]
mockall = "0.12"
```

```rust
use mockall::{automock, predicate::*};

#[automock]
trait Database {
    fn get_user(&self, id: u64) -> Option<String>;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_with_mock() {
        let mut mock = MockDatabase::new();
        mock.expect_get_user()
            .with(eq(1))
            .times(1)
            .returning(|_| Some("Alice".to_string()));

        assert_eq!(mock.get_user(1), Some("Alice".to_string()));
    }
}
```

---

## 测试覆盖率

### 使用 tarpaulin

```bash
cargo install cargo-tarpaulin
cargo tarpaulin --out Html
```

### 使用 llvm-cov

```bash
cargo install cargo-llvm-cov
cargo llvm-cov
cargo llvm-cov --html
```

---

## 最佳实践

1. **为每个公共函数编写测试**
2. **测试边界条件**：空输入、零值、最大值等
3. **使用描述性的测试名称**
4. **保持测试独立**：测试之间不应有依赖
5. **测试错误情况**：不仅测试成功路径
6. **使用测试夹具**：共享设置和清理代码
7. **定期运行测试**：集成到 CI/CD 流程

---

## 实践示例

### 示例 1：测试计算器

```rust
pub struct Calculator;

impl Calculator {
    pub fn add(a: i32, b: i32) -> i32 {
        a + b
    }

    pub fn subtract(a: i32, b: i32) -> i32 {
        a - b
    }

    pub fn multiply(a: i32, b: i32) -> i32 {
        a * b
    }

    pub fn divide(a: i32, b: i32) -> Result<i32, String> {
        if b == 0 {
            Err("Division by zero".to_string())
        } else {
            Ok(a / b)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_add() {
        assert_eq!(Calculator::add(2, 2), 4);
        assert_eq!(Calculator::add(-1, 1), 0);
    }

    #[test]
    fn test_subtract() {
        assert_eq!(Calculator::subtract(5, 3), 2);
        assert_eq!(Calculator::subtract(3, 5), -2);
    }

    #[test]
    fn test_multiply() {
        assert_eq!(Calculator::multiply(3, 4), 12);
        assert_eq!(Calculator::multiply(-2, 3), -6);
    }

    #[test]
    fn test_divide() {
        assert_eq!(Calculator::divide(10, 2), Ok(5));
        assert_eq!(Calculator::divide(7, 2), Ok(3));
    }

    #[test]
    fn test_divide_by_zero() {
        assert!(Calculator::divide(10, 0).is_err());
    }
}
```

### 示例 2：测试状态机

```rust
#[derive(Debug, PartialEq)]
enum State {
    Idle,
    Running,
    Stopped,
}

struct StateMachine {
    state: State,
}

impl StateMachine {
    fn new() -> Self {
        StateMachine { state: State::Idle }
    }

    fn start(&mut self) -> Result<(), String> {
        match self.state {
            State::Idle => {
                self.state = State::Running;
                Ok(())
            }
            _ => Err("Cannot start from current state".to_string()),
        }
    }

    fn stop(&mut self) -> Result<(), String> {
        match self.state {
            State::Running => {
                self.state = State::Stopped;
                Ok(())
            }
            _ => Err("Cannot stop from current state".to_string()),
        }
    }

    fn reset(&mut self) {
        self.state = State::Idle;
    }

    fn state(&self) -> &State {
        &self.state
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_initial_state() {
        let sm = StateMachine::new();
        assert_eq!(sm.state(), &State::Idle);
    }

    #[test]
    fn test_start() {
        let mut sm = StateMachine::new();
        assert!(sm.start().is_ok());
        assert_eq!(sm.state(), &State::Running);
    }

    #[test]
    fn test_stop() {
        let mut sm = StateMachine::new();
        sm.start().unwrap();
        assert!(sm.stop().is_ok());
        assert_eq!(sm.state(), &State::Stopped);
    }

    #[test]
    fn test_invalid_transitions() {
        let mut sm = StateMachine::new();
        assert!(sm.stop().is_err());
        
        sm.start().unwrap();
        assert!(sm.start().is_err());
    }

    #[test]
    fn test_reset() {
        let mut sm = StateMachine::new();
        sm.start().unwrap();
        sm.reset();
        assert_eq!(sm.state(), &State::Idle);
    }
}
```

---

> [!TIP]
> **下一步**：掌握了测试后，继续学习 [宏与元编程](11-macros-metaprogramming.md)，了解如何使用宏来减少重复代码。

---

## 属性测试 (Property-Based Testing)

属性测试通过**随机生成大量输入数据**来验证代码的不变性（invariants），而不是只测试少数手工构造的用例。

### 使用 proptest

```toml
[dev-dependencies]
proptest = "1"
```

```rust
#[cfg(test)]
mod prop_tests {
    use proptest::prelude::*;

    fn reverse<T: Clone>(v: &[T]) -> Vec<T> {
        let mut result = v.to_vec();
        result.reverse();
        result
    }

    proptest! {
        // 对任意 Vec<i32>，反转两次应等于原始值
        #[test]
        fn reverse_twice_is_identity(v in prop::collection::vec(any::<i32>(), 0..100)) {
            let twice_reversed = reverse(&reverse(&v));
            prop_assert_eq!(v, twice_reversed);
        }

        // 反转不改变长度
        #[test]
        fn reverse_preserves_length(v in prop::collection::vec(any::<i32>(), 0..100)) {
            prop_assert_eq!(v.len(), reverse(&v).len());
        }

        // 对任意有效字符串，parse 后再 to_string 应还原
        #[test]
        fn integer_roundtrip(n in any::<i32>()) {
            let s = n.to_string();
            let parsed: i32 = s.parse().unwrap();
            prop_assert_eq!(n, parsed);
        }
    }
}
```

运行：`cargo test`。proptest 自动生成数百个随机用例，并在发现失败时输出最小化的反例。

---

## 模糊测试 (Fuzzing)

模糊测试（Fuzzing）通过**自动变异输入**发现程序崩溃、panic 或安全漏洞。

### cargo-fuzz 快速上手

```bash
cargo install cargo-fuzz
cargo fuzz init                    # 初始化 fuzz 目录
cargo fuzz add my_fuzz_target      # 创建新的 fuzz 目标
```

`fuzz/fuzz_targets/my_fuzz_target.rs`：

```rust
#![no_main]
use libfuzzer_sys::fuzz_target;

fuzz_target!(|data: &[u8]| {
    // 用任意字节序列测试你的解析函数
    if let Ok(s) = std::str::from_utf8(data) {
        // 测试你的函数不会 panic
        let _ = s.parse::<u64>();
    }
});
```

运行 fuzzer（需要 nightly Rust）：

```bash
cargo +nightly fuzz run my_fuzz_target
```

---

## 测试覆盖率

### 使用 cargo-tarpaulin（Linux）

```bash
cargo install cargo-tarpaulin
cargo tarpaulin --out Html
```

### 使用 llvm-cov（跨平台，推荐）

```bash
cargo install cargo-llvm-cov
cargo llvm-cov                     # 终端输出覆盖率报告
cargo llvm-cov --html              # 生成 HTML 报告
cargo llvm-cov --lcov --output-path lcov.info  # 生成 lcov 格式（兼容 CI）
```

示例输出：
```
Filename                   Regions  Missed  Cover   Lines  Missed  Cover
src/lib.rs                      12       1  91.67%      35       1  97.14%
src/parser.rs                   28       3  89.29%      81       5  93.83%
TOTAL                           40       4  90.00%     116       6  94.83%
```

> [!TIP]
> 覆盖率目标建议：核心业务逻辑 ≥ 80%；安全关键路径 ≥ 95%。不要盲目追求 100%，边界分支和错误路径的覆盖质量比数字更重要。
