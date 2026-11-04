---
title: "模糊测试"
sidebar_position: 4
---

# 模糊测试

模糊测试（fuzzing）反复向目标代码提供生成的输入，尝试触发崩溃、断言失败或其他可观测异常。覆盖率引导的模糊测试会优先探索能走到新代码路径的输入，适合解析器、解码器和不可信数据边界。

它与[属性测试](ch24-01-property-testing.md)互补：属性测试由开发者描述不变量并生成结构化值；模糊测试通常从字节序列出发，不要求预先写出每一种边界用例。

## 使用 cargo-fuzz 创建目标

`cargo-fuzz` 基于 libFuzzer，通常需要 nightly Rust 工具链。先在目标 Cargo 包中初始化 fuzz 项目，再为一个可重复调用、输入边界明确的函数建立 target：

```text
cargo install cargo-fuzz
cargo +nightly fuzz init
```

例如，若库提供 `decode(&[u8])`：

```rust,ignore
#![no_main]

use libfuzzer_sys::fuzz_target;

fuzz_target!(|data: &[u8]| {
    let _ = my_crate::decode(data);
});
```

目标代码应把错误作为正常结果返回；对于有效输入，还可检查 round-trip、不变量或资源限制。模糊测试不应依赖外部网络、时间或非确定性全局状态。

## 运行、复现与最小化

```text
cargo +nightly fuzz run decode
cargo +nightly fuzz run decode -- -max_total_time=60
cargo +nightly fuzz tmin decode path\to\crash
```

输入语料保存在 `fuzz/corpus/<target>`；触发故障的输入会作为 artifact 保存。将可复现的崩溃用例加入回归测试或语料库，记录使用的 target、工具链和复现命令。执行前确认语料与 artifact 中不包含敏感数据。

## 设计有效 target

- 从小而纯的解析/转换函数开始，让每个输入都快速返回。
- 检查超长输入、截断数据、非法编码、边界数值和嵌套结构。
- 设定资源上限，避免单个输入触发无界分配或过深递归。
- 对结构化格式可使用自定义 mutator 或结构感知生成器，提高有效输入比例。
- 为不同不变量创建独立 target，便于定位结果。

Fuzzer 的输入空间巨大，有限运行时间不能证明不存在缺陷；它补充而不取代单元、属性、集成和安全审查。

## 纳入 CI

可在定期任务或变更触及解析代码时运行有时限的 fuzz smoke test，并持久化有价值的语料。常规 PR 检查仍应快速、确定；长时间 fuzzing 可在专用任务执行。发现问题后应最小化输入、修复根因并添加稳定的回归测试。
