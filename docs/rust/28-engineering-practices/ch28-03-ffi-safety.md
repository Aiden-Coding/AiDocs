---
title: "FFI 安全边界"
sidebar_position: 3
---

# FFI 安全边界

外部函数接口（FFI）让 Rust 与 C 等语言互操作。Rust 编译器无法验证外部实现遵守 Rust 的内存、别名和线程安全规则，因此 FFI 调用是需要显式审计的不安全边界。基础语法见[不安全 Rust](../19-advanced-features/ch19-01-unsafe-rust.md)。

## ABI 与数据布局

ABI 决定函数调用约定和数据传递方式。对外暴露给 C 的 Rust 函数通常使用 `extern "C"`；需要 C 可识别布局的结构体应显式使用 `#[repr(C)]`。Rust 默认结构体布局不保证与 C 相同。

Rust 2024 Edition 要求外部函数声明位于 `unsafe extern` 块中，以突出签名需要由程序员保证正确：

```rust
use std::os::raw::c_int;

unsafe extern "C" {
    fn legacy_add(left: c_int, right: c_int) -> c_int;
}
```

跨语言 API 应使用双方 ABI 定义一致的类型。不要直接传递 Rust `String`、`Vec<T>`、trait object 或含 Rust 专属布局的类型，除非互操作协议明确规定了兼容表示和所有权约定。

## 将 unsafe 限定在安全封装内

公共安全 API 应在调用外部函数前验证可验证的前置条件，并确保返回值与资源释放遵循约定。下面是结构示意；真实声明须与对应 C 头文件、链接库和错误协议一致：

```rust
use std::os::raw::{c_int, c_uchar};

unsafe extern "C" {
    fn legacy_checksum(data: *const c_uchar, len: c_int) -> c_int;
}

fn checksum(data: &[u8]) -> Result<i32, &'static str> {
    let len = c_int::try_from(data.len()).map_err(|_| "input is too large")?;

    // SAFETY: data 指针在调用期间有效，长度可由 c_int 表示；
    // 外部函数约定只读取 len 个字节且不会保留指针。
    let result = unsafe { legacy_checksum(data.as_ptr(), len) };
    Ok(result)
}
```

安全封装必须基于实际外部契约，而不是仅凭函数签名推断。需要逐项确认：

- 指针是否允许为空、是否必须对齐，以及有效字节数。
- 被调用方是否会保留指针；若会，内存的存活期和释放方是谁。
- 是否可能回调 Rust、跨线程访问，或并发调用。
- 错误如何表示，资源如何配对释放。
- 是否可能发生 unwind；不得让 Rust panic 或外部异常越过不支持它的 ABI 边界。

如果无法验证前置条件，API 应保持 `unsafe` 并把调用者责任写进安全文档。

## 字符串与句柄

C 字符串通常是以 NUL 结尾的字节序列。使用 `CString` 构造传给 C 的拥有型字符串，使用 `CStr` 借用外部 C 字符串；不可假定 UTF-8，也不可让 NUL 截断静默改变语义。跨边界传递 opaque handle 时，明确谁创建、谁释放，以及重复释放和并发访问的规则。

## 检查与测试

- 对照头文件验证类型、ABI、可变性和调用约定。
- 让 unsafe 块尽可能小，每处说明不变量与安全依据。
- 为安全封装测试空输入、边界长度、错误路径和资源释放。
- 使用 AddressSanitizer、Miri 或平台工具时，确认其支持范围；它们能发现部分问题，不构成安全证明。
- 避免在 FFI 边界传递未定义的 Rust 布局或让异常跨越 ABI。

FFI 的安全性取决于跨语言两侧共同遵守的契约。把边界集中在少量模块中，可让审计和替换实现更容易。
