---
title: "Cargo Features 与 Build Scripts"
sidebar_position: 1
---

# Cargo Features 与 Build Scripts

Cargo features 用于声明 crate 的可选能力；build script（`build.rs`）则在编译 crate 前运行，生成代码或向 Cargo 报告构建信息。两者都会影响构建图和可复现性，应保持简单、可组合。

## 声明可选依赖与 features

```toml
[dependencies]
serde = { version = "1", optional = true }
serde_json = { version = "1", optional = true }

[features]
default = ["serde-support"]
serde-support = ["dep:serde", "dep:serde_json"]
```

在代码中通过 cfg 控制可选实现：

```rust
#[cfg(feature = "serde-support")]
pub fn serialize<T: serde::Serialize>(value: &T) -> Result<String, serde_json::Error> {
    serde_json::to_string(value)
}
```

Features 通常采用**可加性**设计：多个依赖方启用同一 crate 的不同 feature 时，Cargo 会统一功能集合。避免将互斥模式建模成可任意组合的布尔开关；优先设计可同时启用的能力，或在构建时明确检测冲突并报错。

检查 feature 来源与传递关系：

```text
cargo tree -e features
cargo check --no-default-features
cargo check --no-default-features --features serde-support
```

`--all-features` 适合验证所有 feature 确实可共存的 crate；若功能互斥，不应把它当作唯一测试配置。Workspace 还应确认使用的 resolver 版本符合预期。

## 何时需要 build.rs

常规 Rust 代码优先于 build script。只有需要在构建时探测目标环境、编译原生代码、生成源文件或向编译器传递配置时才使用它。

Cargo 会在包根目录寻找 `build.rs`。脚本通过标准输出向 Cargo 发送指令：

```rust
use std::{env, path::PathBuf};

fn main() {
    println!("cargo:rerun-if-changed=assets/schema.txt");
    println!("cargo:rerun-if-env-changed=MY_BUILD_OPTION");

    let out_dir = PathBuf::from(env::var_os("OUT_DIR").expect("Cargo sets OUT_DIR"));
    let generated = out_dir.join("build_info.rs");
    std::fs::write(generated, "pub const BUILD_TAG: &str = \"local\";\n")
        .expect("write generated source");
}
```

生成内容写入 Cargo 提供的 `OUT_DIR`，并可由 crate 使用 `include!` 引入。脚本应声明实际输入，避免每次无关变化都重跑；不要假定构建发生在宿主平台，交叉编译时应区分 host 与 target 环境变量。

## 维护原则

- 明确记录 feature 的语义和默认值，测试默认、最小和支持的组合。
- 避免依赖 feature 之间的偶然统一结果。
- build script 输入应明确，输出仅写入 Cargo 指定目录。
- 不在构建脚本中下载未经校验的文件或依赖本机未声明状态。
- 保持构建确定性；需要嵌入版本或 Git 信息时，定义无 Git checkout、浅克隆等情况下的行为。
