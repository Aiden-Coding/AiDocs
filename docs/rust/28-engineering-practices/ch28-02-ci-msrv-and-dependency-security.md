---
title: "CI、MSRV 与依赖安全"
sidebar_position: 2
---

# CI、MSRV 与依赖安全

持续集成（CI）将格式、编译、测试和依赖检查变成每次变更都执行的约定。关键是验证项目真实支持的工具链和功能组合，而不是机械地打开所有开关。

## 声明并验证 MSRV

MSRV（Minimum Supported Rust Version）是项目承诺支持的最低 Rust 版本。库可在 `Cargo.toml` 中声明：

```toml
[package]
rust-version = "1.75"
```

示例版本仅作格式说明；项目应填写实际测试通过的最低版本。升级依赖或使用新语言特性后，在 MSRV 工具链上运行构建与测试，并在 `rust-version` 政策变化时明确说明。

对于工作空间，协调各成员的版本要求。仅测试最新 stable 不能证明 MSRV 仍然受支持；锁文件也不保证依赖的最低 Rust 版本自动符合项目声明。

## CI 验证层次

常见基础检查如下：

```text
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace --all-targets --locked
cargo check --workspace --all-targets --locked
```

按项目增加 MSRV 工具链、目标平台、feature 组合和集成测试。`--all-features` 只适用于 features 可共同启用的项目；互斥 feature 应分别构建。对发布库还可验证文档、示例和打包内容。

应用通常提交 `Cargo.lock` 以复现解析结果；库也可在 CI 中测试锁定依赖，并按计划测试更新后的依赖解析。不要把缓存命中当成验证结果，缓存键应包含工具链和锁文件状态。

## 依赖风险检查

定期检查依赖树、已知安全公告、许可证和来源：

```text
cargo tree
cargo audit
cargo deny check
```

`cargo audit` 基于 RustSec 公告数据库检查已知漏洞；`cargo deny` 可按策略检查公告、许可证、来源和重复依赖。它们不能证明代码没有漏洞，也不能替代代码审查、更新流程和运行时防护。

实施时应：

- 锁定 CI 中使用的工具版本，并定期升级审计工具和公告数据库。
- 评估告警的受影响版本、调用路径、修复版本和可用缓解措施。
- 对无法立即升级的依赖记录风险、负责人和复查条件。
- 审查新依赖的维护状态、权限范围、许可证及传递依赖。
- 避免通过忽略规则静默隐藏告警；例外应有范围和理由。

## 发布前检查

发布前验证 MSRV、默认 feature 和受支持组合，运行测试与 Clippy，检查 `cargo package --list` 中的发布文件，并确认依赖、安全公告和版本变更记录。团队可将这些步骤自动化，但发布审批和风险判断仍需人工负责。
