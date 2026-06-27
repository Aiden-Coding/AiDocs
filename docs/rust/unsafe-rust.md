---
title: Unsafe Rust 与内存安全边界
hide_title: true
sidebar_label: Unsafe Rust 与内存安全
---

## Unsafe Rust 与内存安全边界

Rust 最大的特色在于提供了编译期的静态内存安全保证。然而，在实际的系统级编程中，我们必须面对底层的物理硬件、操作系统 API（FFI）以及极其严苛的高性能数据结构（如双向链表或无锁队列）。为了实现这些需求，Rust 引入了 **Unsafe Rust**。

Unsafe 并非推翻了 Rust 的安全保障，而是引入了“程序员与编译器的契约”：程序员负责确保底层内存操作的安全，而编译器允许使用更底层的超级能力。

> 🟢 **基础**：掌握基本语法即可阅读 ｜ 🟡 **进阶**：需要有一定 Rust 开发经验 ｜ 🔴 **高级**：面向系统级开发者与性能工程师

---

## 🟡 Unsafe Rust 的超级力量

在 `unsafe` 块或 `unsafe fn` 中，开发者被赋予了 5 项常规 Rust 所不具备的“超级力量”：

1. 解引用裸指针（Raw Pointers）。
2. 调用不安全的函数或方法。
3. 实现不安全的特征（Unsafe Traits）。
4. 修改可变的静态变量（`static mut`）。
5. 访问联合体（`union`）中的字段。

> [!IMPORTANT]
> `unsafe` 并没有关闭借用检查器，也没有禁用 Rust 的其他安全检查。它仅仅是允许你执行上述 5 项特定操作。

---

## 🟡 裸指针与未定义行为 (UB)

裸指针是 Unsafe Rust 中最频繁使用的底层工具。与安全引用（`&T` 和 `&mut T`）相比，裸指针具有以下特点：
- 允许忽略借用规则，可以同时拥有指向同一内存的可变与不可变裸指针。
- 不保证指向有效的内存，可以为 null。
- 没有生命周期概念，不会自动释放资源。
- 不能保证内存对齐。

### 1. 创建与解引用裸指针

创建裸指针是完全安全的，只有在**解引用**（即读取或写入指针指向的内存）时才需要 `unsafe`。

```rust
fn raw_pointers_demo() {
    let mut num = 42;

    // 安全地将引用隐式转换为裸指针
    let r1 = &num as *const i32;
    let r2 = &mut num as *mut i32;

    unsafe {
        // 解引用裸指针必须在 unsafe 块中进行
        println!("r1: {}", *r1);
        *r2 = 1337;
        println!("r2 modified num: {}", num);
    }
}
```

### 2. 未定义行为 (Undefined Behavior, UB)

未定义行为是系统级编程的噩梦。一旦发生 UB，编译器可能会优化掉你的边界检查，导致程序产生不可预测的行为、崩溃或严重的安全漏洞。

在 Rust 中，以下行为属于典型的未定义行为：
- 解引用 null 指针、悬垂指针（Dangling Pointer）或指向已被释放内存的指针。
- 违反借用规则：同时存在多个指向同一数据的可变裸指针，或可变裸指针与安全引用并存。
- 读取未初始化的内存。
- 发生数据竞争（Data Race）。
- 进行未对齐的内存访问（例如，在奇数地址处以 `u64` 读取数据且硬件不支持）。

---

## 🟡 安全抄象接口 (Safe Abstractions)

Unsafe Rust 的最佳实践是**限制污染范围**：使用最少量的 `unsafe` 代码去实现高性能或底层操作，并将其封装在 100% 安全的公开 API 之后。

下面以标准库 `split_at_mut` 的精简实现为例，展示如何将 `unsafe` 的指针操作包装成安全的对外接口。该方法旨在将一个可变切片分割为两个互不冲突的子切片：

```rust
// 外部调用者无需关心内部 unsafe，该函数本身是完全安全的
pub fn custom_split_at_mut<T>(slice: &mut [T], mid: usize) -> (&mut [T], &mut [T]) {
    let len = slice.len();
    assert!(mid <= len); // 边界断言，防止越界访问引发 UB

    let ptr = slice.as_mut_ptr();

    unsafe {
        // 核心原理：虽然两个切片源自同一块内存，
        // 但通过 mid 分割，它们的内存范围在物理上是完全互斥的。
        // 这在逻辑上是安全的，但编译器无法证明，因此需要由程序员通过 unsafe 担保。
        (
            std::slice::from_raw_parts_mut(ptr, mid),
            std::slice::from_raw_parts_mut(ptr.add(mid), len - mid),
        )
    }
}
```

---

## 🔴 FFI 与 ABI 交互

FFI（Foreign Function Interface，外部函数接口）允许 Rust 代码调用其他语言（如 C/C++）编译的动态库，或者将 Rust 代码暴露给其他语言调用。

### 1. 调用 C 语言函数

为了与外部库交互，必须指定 ABI（Application Binary Interface，应用二进制接口）。对于 C 语言，通常使用 `"C"`。

```rust
// 声明外部 C 语言标准库中的 abs 函数
extern "C" {
    fn abs(input: i32) -> i32;
}

fn main() {
    unsafe {
        // 调用外部 C 函数被视作 unsafe，因为 Rust 无法校验 C 函数的内存安全性
        let val = abs(-10);
        println!("Absolute value from C: {}", val);
    }
}
```

### 2. 跨语言内存布局保证

在跨 FFI 传递结构体时，必须使用 `#[repr(C)]` 属性，强制 Rust 编译器采用与 C 语言标准完全一致的字段对齐和布局规则，否则会因为字段重排导致数据解析错位。

```rust
#[repr(C)]
pub struct CResponse {
    pub status_code: i32,
    pub data_ptr: *const u8,
    pub data_len: usize,
}
```

---

## 🔴 运行时未定义行为检测：Miri 工具

即使代码通过了编译，且在局部测试中表现正常，`unsafe` 块中仍可能潜藏着极其隐蔽的内存安全隐患。为此，Rust 官方提供了一个极其强大的中间层解释器工具：**Miri**。

### 1. 什么是 Miri

Miri 会在 MIR（Mid-level Intermediate Representation，中级中间表示）层面上直接解释运行你的 Rust 代码。它能精确监控所有的内存访问行为，检测出包括但不限于以下隐患：
- 内存泄露（Out-of-memory 及未释放分配）。
- 违反 Stacked Borrows（Rust 裸指针别名规则模型）。
- 使用未初始化的内存。
- 越界访问与对齐错误。

### 2. 如何安装与运行

在使用 Miri 之前，需通过 rustup 安装：

```bash
rustup +nightly component add miri
```

在包含 `unsafe` 测试的项目根目录下，执行以下命令：

```bash
cargo +nightly miri test
```

Miri 会以极高精度模拟内存堆栈的每一次流转。若发现任何潜在的 UB，它会立刻中止运行并打印出极其详尽的内存跟踪调用栈，帮助你准确定位隐患源头。
