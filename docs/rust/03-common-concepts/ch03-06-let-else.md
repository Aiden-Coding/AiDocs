---
title: "let-else 与 let chains"
sidebar_position: 22.5
---

Rust 1.65 和 1.88 分别引入了 `let-else` 语句与 `let chains` 语法，两者都是为了减少控制流中的嵌套层次，让"主干逻辑"保持在同一缩进层级。

## `let-else` 语句

### 解决的问题

在实际业务代码中，经常出现"匹配成功则继续，匹配失败则提前退出"的模式。旧写法往往需要 `match` 加额外缩进，或者 `.unwrap_or_else` 变体：

```rust
// 旧写法一：match + 嵌套
let value = match maybe_value {
    Some(v) => v,
    None => return,
};

// 旧写法二：if let + 提前返回
let value;
if let Some(v) = maybe_value {
    value = v;
} else {
    return;
}
```

这两种写法都需要在提前退出之前将绑定变量的声明与赋值分离，或者引入多余的缩进。

### 完整语法

```rust
let PATTERN = EXPRESSION else {
    // else 块必须发散（diverge）
    // 合法：return、break、continue、panic!、loop { ... }
};
```

**关键规则**：`else` 块必须**发散**（*diverge*）——即永不正常返回到当前作用域。若 `else` 块能正常执行完毕，编译器将报错。成功匹配后，`PATTERN` 中的绑定变量在 `let-else` **之后**的作用域内可用。

### 实际示例

**解构 `Option`**：

```rust
fn process_config() -> Result<(), ConfigError> {
    let Some(config) = load_config() else {
        eprintln!("无法加载配置文件");
        return Err(ConfigError::Missing);
    };
    // config 在此作用域内可用
    println!("加载配置：{}", config.name);
    Ok(())
}
```

**解构枚举变体**：

```rust
for command in commands {
    let Command::Move { x, y } = command else {
        // 非 Move 命令直接跳过
        continue;
    };
    // x, y 在此可用
    move_player(x, y);
}
```

**解构元组**：

```rust
for line in lines {
    let (name, age) = parse_record(&line) else {
        eprintln!("格式错误，跳过：{line}");
        continue;
    };
    println!("{name} 今年 {age} 岁");
}
```

**配合字符串解析**：

```rust
fn parse_port(input: &str) -> u16 {
    let Ok(port) = input.trim().parse::<u16>() else {
        panic!("无效端口号：「{input}」");
    };
    port
}
```

### 常见坑

**`else` 块不发散会编译报错**：

```rust
let Some(x) = opt else {
    println!("没有值"); // ❌ 编译错误：else 块必须发散
};
```

正确做法是在 `println!` 后加 `return`、`break` 或 `panic!`：

```rust
let Some(x) = opt else {
    println!("没有值");
    return; // ✅
};
```

**绑定变量的作用域**：匹配失败走 `else` 分支，成功匹配的绑定变量**不在** `else` 块内可用，只在 `let-else` 语句之后可用。这与 `if let` 相反。

## `let chains`

### 解决的问题

当需要同时检验多个 `Option`/`Result` 或附加布尔条件时，嵌套 `if let` 会形成"箭头型"代码（arrow code）：

```rust
// 嵌套地狱
if let Some(user) = get_user(id) {
    if let Some(profile) = user.profile() {
        if profile.age >= 18 {
            if let Some(email) = profile.email() {
                send_promo(email);
            }
        }
    }
}
```

每增加一个条件就多一层缩进，代码难以阅读和维护。

### 完整语法

```rust
if let PAT1 = EXPR1
    && let PAT2 = EXPR2
    && BOOLEAN_CONDITION
{
    // 所有绑定变量在此作用域内
}
```

条件链从左到右**短路求值**：一旦某个条件不满足，后续条件不再求值。

### 示例对比

上面嵌套地狱用 `let chains` 改写：

```rust
if let Some(user) = get_user(id)
    && let Some(profile) = user.profile()
    && profile.age >= 18
    && let Some(email) = profile.email()
{
    send_promo(email);
}
```

所有绑定变量（`user`、`profile`、`email`）都在同一作用域内，消除了嵌套。

### 在 `while` 中使用

`let chains` 同样适用于 `while let`：

```rust
while let Some(event) = next_event()
    && event.kind != EventKind::Quit
{
    handle(event);
}
```

等价于"取到事件且不是退出事件就持续处理"，比手动 `break` 更清晰。

### 在 `match` 守卫中使用

`let chains` 也可出现在 `match` 的守卫（guard）中：

```rust
match packet {
    Packet::Data(buf) if let Ok(msg) = decode(&buf) && msg.len() > 0 => {
        process(msg);
    }
    _ => {}
}
```

## 两者对比总结

| 特性 | 稳定版本 | 核心用途 |
|---|---|---|
| `let-else` | Rust 1.65 | 匹配失败时提前退出，绑定变量留在外层作用域 |
| `let chains` | Rust 1.88 | 多条件链式组合，避免嵌套 `if let` |

两者并不互斥，可以搭配使用：用 `let-else` 处理强制前提条件（如参数校验），用 `let chains` 处理复杂的多路组合判断。这样既保证了主干逻辑的平坦结构，又避免了防御性嵌套。
