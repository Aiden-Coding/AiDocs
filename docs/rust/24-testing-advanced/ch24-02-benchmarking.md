---
title: "基准测试（Benchmarking）"
sidebar_position: 112
---

# 基准测试

## 为什么需要专门的基准测试库

Rust 标准库提供了不稳定的 `#[bench]` 属性，但它只能在 nightly 工具链上使用，且统计方法较为简陋。`criterion` 是目前 Rust 生态中事实上的基准测试标准：

- 在 stable 工具链上运行
- 使用严格的统计方法（线性回归、置信区间）
- 自动检测性能回归
- 生成可视化 HTML 报告

## 配置 criterion

```toml
[dev-dependencies]
criterion = { version = "0.5", features = ["html_reports"] }

[[bench]]
name = "my_benchmark"
harness = false
```

`harness = false` 告诉 Cargo 不使用默认的测试框架，改由 criterion 自己控制入口。

基准测试文件必须放在项目根目录的 `benches/` 文件夹下：

```text
my_project/
├── src/
│   └── lib.rs
└── benches/
    └── my_benchmark.rs   ← 对应 [[bench]] name = "my_benchmark"
```

## 基础示例：斐波那契数列

```rust
// benches/my_benchmark.rs
use criterion::{criterion_group, criterion_main, BenchmarkId, Criterion};

fn fibonacci(n: u64) -> u64 {
    match n {
        0 => 0,
        1 => 1,
        n => fibonacci(n - 1) + fibonacci(n - 2),
    }
}

fn bench_fibonacci(c: &mut Criterion) {
    let mut group = c.benchmark_group("fibonacci");
    for i in [10u64, 20, 30] {
        group.benchmark_with_input(BenchmarkId::new("recursive", i), &i, |b, &n| {
            b.iter(|| fibonacci(criterion::black_box(n)));
        });
    }
    group.finish();
}

criterion_group!(benches, bench_fibonacci);
criterion_main!(benches);
```

运行基准测试：

```bash
cargo bench
```

结果将保存在 `target/criterion/`，HTML 报告位于 `target/criterion/report/index.html`，可在浏览器中查看带有置信区间的性能图表。

## `black_box`：防止编译器优化失真

编译器（特别是在 release 模式下）会激进地内联和消除「纯计算但结果未使用」的代码。`criterion::black_box` 是一个语义屏障，向编译器声明「这个值我真的会用到」，从而防止被优化掉：

```rust
// 错误写法：编译器可能直接用常量替换 fibonacci(10)
b.iter(|| fibonacci(10));

// 正确写法：black_box 阻止编译器对输入值做常量折叠
b.iter(|| fibonacci(criterion::black_box(10)));
```

## 对比基准：量化优化效果

假设你重写了算法，想确认新版确实更快：

```bash
# 第一步：在修改前保存基线
cargo bench -- --save-baseline before

# 第二步：修改代码后运行对比
cargo bench -- --baseline before
```

criterion 会输出每个基准的变化百分比，并标注是否达到统计显著性。这能有效防止「凭感觉觉得快了」的主观偏差。

## 常见坑与注意事项

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 基准结果忽高忽低 | 系统负载干扰 | 关闭后台程序，多次运行取平均 |
| 测量时间包含数据初始化 | 初始化在 `iter` 闭包内 | 用 `iter_with_setup` 分离准备阶段 |
| 编译器优化消除了被测代码 | 未使用 `black_box` | 对输入和输出都使用 `black_box` |
| 基准只在 debug 模式有效 | `cargo bench` 默认 release | 检查 `Cargo.toml` 的 `[profile.bench]` |

## 迭代变体选择

criterion 提供多种迭代模式：

```rust
// 最常用：直接迭代
b.iter(|| my_function(input));

// 每次迭代重新准备数据（不计入计时）
b.iter_with_setup(|| setup_data(), |data| my_function(data));

// 批量迭代，适合极短操作
b.iter_batched(|| setup_data(), |data| my_function(data), BatchSize::SmallInput);
```
