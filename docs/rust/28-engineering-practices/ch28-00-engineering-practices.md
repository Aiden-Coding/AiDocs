---
title: "Rust 工程实践"
sidebar_position: 0
---

# Rust 工程实践

语言特性只是项目的一部分。可复现构建、明确的 MSRV、持续集成、依赖治理和安全边界，决定代码能否在团队和生产环境中长期维护。

## 本章路线

1. [Cargo features 与 build scripts](ch28-01-cargo-features-and-build-scripts.md)：组织可选功能、构建依赖和条件编译。
2. [CI、MSRV 与依赖安全](ch28-02-ci-msrv-and-dependency-security.md)：自动验证、最低 Rust 版本及依赖审查。
3. [FFI 安全边界](ch28-03-ffi-safety.md)：将外部 ABI 的不安全约束收敛到小型安全封装。

这些内容衔接 [Cargo 与 Crates.io](../14-cargo-crates/ch14-00-more-about-cargo.md)、[不安全 Rust](../19-advanced-features/ch19-01-unsafe-rust.md) 和[实用开发工具](../appendix/appendix-04-useful-development-tools.md)。
