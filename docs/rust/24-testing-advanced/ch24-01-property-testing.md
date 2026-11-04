---
title: "属性测试（Property-Based Testing）"
sidebar_position: 111
---

# 属性测试

## 什么是属性测试

传统测试需要手动列举输入与期望输出。属性测试（*property-based testing*）换了一种思路：我们不写具体的例子，而是**描述程序应当满足的性质（属性）**，由框架自动生成数百乃至数千个测试用例来验证这些性质是否恒成立。

经典性质举例：

- 排序是幂等的：对已排序的数组再排序，结果不变
- 编解码可逆：`decode(encode(x)) == x`
- 序列化往返：`deserialize(serialize(obj)) == obj`

Rust 生态中最成熟的属性测试库是 `proptest`，灵感来自 Haskell 的 QuickCheck。

## 快速上手

在 `Cargo.toml` 中添加依赖：

```toml
[dev-dependencies]
proptest = "1"
```

### 验证排序的幂等性

```rust
use proptest::prelude::*;

proptest! {
    #[test]
    fn test_sort_idempotent(mut v in prop::collection::vec(0i32..1000, 0..100)) {
        v.sort();
        let v2 = v.clone();
        v.sort();
        assert_eq!(v, v2, "排序应该是幂等的");
    }
}
```

`prop::collection::vec(0i32..1000, 0..100)` 表示「生成长度在 0 到 100 之间、元素范围在 0 到 999 之间的 `i32` 向量」。框架默认运行 256 次，每次生成不同的随机向量。

### 验证编解码往返

```rust
use proptest::prelude::*;

// 假设项目中已实现 base64_encode / base64_decode
proptest! {
    #[test]
    fn test_encode_decode_roundtrip(s in "\\PC*") {
        let encoded = base64_encode(&s);
        let decoded = base64_decode(&encoded).unwrap();
        assert_eq!(s.as_bytes(), decoded.as_slice());
    }
}
```

`"\\PC*"` 是 proptest 的正则表达式策略，生成任意可打印 Unicode 字符串。

## 自定义策略（Strategy）

当需要生成业务领域的结构体时，可以组合基础策略构建自定义策略：

```rust
use proptest::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
struct User {
    id: u64,
    name: String,
    age: u8,
}

fn arbitrary_user() -> impl Strategy<Value = User> {
    (1u64..10000, "[a-zA-Z]{3,20}", 18u8..100).prop_map(|(id, name, age)| {
        User { id, name, age }
    })
}

proptest! {
    #[test]
    fn test_user_serialization(user in arbitrary_user()) {
        let json = serde_json::to_string(&user).unwrap();
        let restored: User = serde_json::from_str(&json).unwrap();
        assert_eq!(user, restored);
    }
}
```

`prop_map` 将元组策略映射为目标类型，与 `Iterator::map` 的用法相似。

## Shrinking：自动最小化失败用例

属性测试最强大的特性之一是**自动缩减**（*shrinking*）。当框架发现一个让测试失败的输入时，它会自动尝试「缩小」该输入，直到找到能复现失败的**最小用例**。

例如，原始失败输入是长度为 73 的数组，shrinking 后可能得到长度为 2 的数组，让调试定位问题的效率大幅提升。

proptest 对所有内置策略都自动支持 shrinking，使用 `prop_map` 构建的自定义策略也会继承这一能力。

## 属性测试的适用场景

| 场景 | 适合的属性 |
|------|-----------|
| 编解码器 | 往返一致性 |
| 排序、去重算法 | 幂等性、稳定性 |
| 解析器 | 有效输入不崩溃、无效输入返回错误而非 panic |
| 数学运算 | 交换律、结合律 |
| 数据结构 | 插入后可查到、删除后不可查到 |

## 注意事项

- 属性测试**不能替代**手写用例，对于已知的边界条件（空列表、最大值等），仍应明确测试
- 默认运行 256 次；调用 `ProptestConfig` 可调整次数与随机种子
- 发现失败后，proptest 会在 `.proptest-regressions/` 目录保存失败用例，后续测试会优先回放这些用例，确保修复后不再复现
