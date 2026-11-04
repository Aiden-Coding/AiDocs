---
title: "性能分析工具"
sidebar_position: 121
---

## 测量优先原则

性能优化的第一步是**测量**，而非猜测。Rust 生态提供了完整的性能分析工具链，从微基准测试到系统级火焰图，覆盖各类分析需求。

## 基准测试：`criterion`

`criterion` 是 Rust 社区标准的微基准测试框架，提供统计显著性检验，能区分真实改进与测量噪音。详细用法参见并发测试相关章节中的基准测试部分。

```toml
[dev-dependencies]
criterion = { version = "0.5", features = ["html_reports"] }

[[bench]]
name = "my_benchmark"
harness = false
```

```rust
// benches/my_benchmark.rs
use criterion::{criterion_group, criterion_main, Criterion};

fn fibonacci(n: u64) -> u64 {
    match n {
        0 => 0,
        1 => 1,
        n => fibonacci(n - 1) + fibonacci(n - 2),
    }
}

fn bench_fibonacci(c: &mut Criterion) {
    c.bench_function("fibonacci 20", |b| b.iter(|| fibonacci(20)));
}

criterion_group!(benches, bench_fibonacci);
criterion_main!(benches);
```

```bash
cargo bench
# 结果示例：
# fibonacci 20  time: [12.432 µs 12.456 µs 12.481 µs]
```

## 火焰图（Flamegraph）

火焰图是定位 CPU 热点最直观的工具。横轴表示采样时间占比，纵轴表示调用栈深度。

```bash
cargo install flamegraph

# Linux（依赖 perf，需 root 或设置 perf_event_paranoid）
cargo flamegraph --bin my_binary

# macOS（依赖 DTrace）
cargo flamegraph --bin my_binary

# 生成 flamegraph.svg，用浏览器打开即可交互查看
```

> **提示**：编译时保留调试符号可让火焰图显示函数名。在 `Cargo.toml` 中为 release 配置添加：
>
> ```toml
> [profile.release]
> debug = 1  # 保留行号信息，不影响优化
> ```

## `cargo-pgo`：Profile-Guided Optimization

PGO（配置文件引导优化，*Profile-Guided Optimization*）让编译器根据真实运行数据优化分支预测、内联决策等，通常可带来 10–20% 的性能提升。

```bash
cargo install cargo-pgo

# 步骤 1：构建插桩（instrumented）版本
cargo pgo build

# 步骤 2：用真实工作负载运行，收集 profile 数据
./target/release/my_binary --workload

# 步骤 3：用收集到的数据重新优化构建
cargo pgo optimize build
```

PGO 特别适合具有复杂分支逻辑的程序（编译器、语言解释器、Web 服务器等）。

## Cargo 编译优化配置

`Cargo.toml` 的 `[profile]` 表控制编译器行为，是最简单且收益显著的优化手段。

```toml
[profile.release]
# 优化级别：0=无优化，1=基础，2=默认，3=激进，"s"=体积，"z"=最小体积
opt-level = 3

# 链接时优化（LTO）：跨 crate 内联与优化
# "thin"：增量式 LTO，编译速度快，优化效果好（推荐）
# true / "fat"：完整 LTO，编译慢但优化最彻底
lto = "thin"

# 代码生成单元：减少并行编译单元，允许更多跨函数优化
# 1 = 最大优化，编译最慢（发布版本推荐）
codegen-units = 1

# 去除调试符号，减小二进制体积
strip = true

# panic 时直接 abort 而非展开栈（减小体积 + 略微提升性能）
panic = "abort"
```

### 自定义 Profile

可以创建针对特定场景的 profile，例如带调试信息的优化构建：

```toml
# 用于性能分析的特殊 profile
[profile.profiling]
inherits = "release"
debug = true    # 保留符号，方便火焰图显示函数名
strip = false   # 不剥离符号表
```

```bash
cargo build --profile profiling
cargo flamegraph --profile profiling --bin my_binary
```

## `cargo-asm`：查看汇编输出

验证编译器是否按预期优化（如循环向量化）：

```bash
cargo install cargo-show-asm

# 查看特定函数的汇编代码
cargo asm --release my_crate::my_module::my_function
```

## `dhat`：堆内存分析

定位过度内存分配：

```toml
[dev-dependencies]
dhat = "0.3"
```

```rust
#[global_allocator]
static ALLOC: dhat::Alloc = dhat::Alloc;

fn main() {
    let _profiler = dhat::Profiler::new_heap();
    // ... 程序逻辑
    // 程序退出时自动输出分析报告
}
```

## 工具选型速查

| 问题 | 推荐工具 |
|---|---|
| 函数 A 比函数 B 快多少？ | `criterion` |
| 哪个函数占用了最多 CPU？ | `flamegraph` / `perf` |
| 如何进一步压榨编译器性能？ | `cargo-pgo`、调整 `profile.release` |
| 程序分配了多少堆内存？ | `dhat`、`heaptrack` |
| 编译器有没有向量化我的循环？ | `cargo-asm` |
| WASM 二进制为什么这么大？ | `twiggy`、`wasm-opt` |
