---
title: Unsafe Rust 与内存安全边界
hide_title: true
sidebar_label: Unsafe Rust与内存安全
---

## Unsafe Rust 与内存安全边界

Rust 最大的特色在于提供了编译期的静态内存安全保证。然而，在实际的系统级编程中，我们必须面对底层的物理硬件、操作系统 API（FFI）以及极其严苛的高性能数据结构（如双向链表或无锁队列）。为了实现这些需求，Rust 引入了 **Unsafe Rust**。

Unsafe 并非推翻了 Rust 的安全保障，而是引入了“程序员与编译器的契约”：程序员负责确保底层内存操作的安全，而编译器允许使用更底层的超级能力。

> 🟢 **基础**：掌握基本语法即可阅读 ｜ 🟡 **进阶**：需要有一定 Rust 开发经验 ｜ 🔴 **高级**：面向系统级开发者与性能工程师

---

## 🟡 Unsafe Rust 的五大超级力量

在 `unsafe` 块或 `unsafe fn` 中，开发者被赋予了 5 项常规 Rust 所不具备的“超级力量”：

1. 解引用裸指针（Raw Pointers）。
2. 调用不安全的函数或方法。
3. 实现不安全的特征（Unsafe Traits）。
4. 修改可变的静态变量（`static mut`）。
5. 访问联合体（`union`）中的字段。

> [!IMPORTANT]
> `unsafe` 并没有关闭借用检查器，也没有禁用 Rust 的其他安全检查。它仅仅是允许你执行上述 5 项特定操作。

---

## 🟡 力量一：解引用裸指针 (Raw Pointers)

裸指针（`*const T` 和 `*mut T`）允许我们绕过 Rust 的借用检查：
- 允许忽略借用规则，可以同时拥有指向同一内存的可变与不可变裸指针。
- 不保证指向有效的内存，可以为 null。
- 没有生命周期概念，不会自动释放资源。
- 不能保证内存对齐。

创建裸指针是安全操作，但**解引用**它们以读写数据则是 `unsafe` 的：

```rust
fn main() {
    let mut num = 42;

    // 安全地创建裸指针
    let r1 = &num as *const i32;
    let r2 = &mut num as *mut i32;

    unsafe {
        // 解引用裸指针以读取或修改内存
        println!("r1 指向的值: {}", *r1);
        *r2 = 1337;
        println!("修改后的值: {}", num);
    }
}
```

---

## 🟡 力量二：调用不安全的函数或方法

不安全函数（`unsafe fn`）在函数定义前加上了 `unsafe` 关键字。这表明该函数包含必须由调用者手动保证的前置条件，且该函数**只能在 `unsafe` 块中被调用**：

```rust
// 声明一个不安全函数
unsafe fn dangerous_operation() {
    println!("这是一个不安全的操作，调用者必须确保前置条件的满足！");
}

fn main() {
    unsafe {
        // 调用不安全函数
        dangerous_operation();
    }
    // dangerous_operation(); // ❌ 编译报错：requires unsafe function or block
}
```

---

## 🟡 力量三：实现不安全的特征 (Unsafe Traits)

如果一个特征包含可能发生内存不安全行为的操作，或者其实现者必须保证特定的系统契约，则该特征必须被声明为 `unsafe trait`。实现该特征的类型也必须声明为 `unsafe impl`：

```rust
// 声明一个不安全特征
unsafe trait CryptographicEngine {
    fn encrypt(&self, data: &[u8]) -> Vec<u8>;
}

struct HardwareToken;

// 实现不安全特征
unsafe impl CryptographicEngine for HardwareToken {
    fn encrypt(&self, data: &[u8]) -> Vec<u8> {
        // 底层加密硬件操作
        data.to_vec()
    }
}
```

---

## 🟡 力量四：访问与修改可变静态变量 (static mut)

在 Rust 中，全局只读变量（`static`）是安全的。但是，如果声明全局可变变量（`static mut`），在多线程环境下对其进行读写极易引发数据竞争。因此，**访问或修改全局可变静态变量必须在 `unsafe` 块中进行**：

```rust
static mut GLOBAL_COUNTER: u32 = 0;

fn increment_counter() {
    unsafe {
        // 访问和修改全局可变变量是不安全的
        GLOBAL_COUNTER += 1;
        println!("当前计数器: {}", GLOBAL_COUNTER);
    }
}
```

---

## 🟡 力量五：访问联合体 (Union) 中的字段

联合体（`union`）主要用于与 C 语言联合体进行 FFI 交互。因为联合体的所有字段共享同一块物理内存，且编译器无法在编译期确定当前哪一个字段是有效和安全的，因此**读取联合体中的任何字段都是 `unsafe` 的**：

```rust
// 定义一个联合体，表示可能为 i32 或 f32
union MyValue {
    integer: i32,
    float: f32,
}

fn main() {
    let mut val = MyValue { integer: 10 };

    unsafe {
        // 修改并读取字段是不安全的
        val.float = 3.14;
        println!("读取为浮点数: {}", val.float);
        // 如果读取为整型，可能会得到非预期的垃圾数据
        println!("读取为整型 (未定义解析): {}", val.integer);
    }
}
```

---

## 🟡 安全抽象接口 (Safe Abstractions)

Unsafe Rust 的最佳实践是**限制污染范围**：使用最少量的 `unsafe` 代码去实现高性能或底层操作，并将其封装在 100% 安全的公开 API 之后。

下面以标准库 `split_at_mut` 的精简实现为例，展示如何将 `unsafe` 的指针操作包装成安全的对外接口：

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

FFI（Foreign Function Interface）允许 Rust 直接调用外部语言（如 C/C++）编译的动态库。

### 跨语言内存布局保证

在跨 FFI 传递结构体时，必须使用 `#[repr(C)]` 属性，强制 Rust 编译器采用与 C 语言标准一致的字段对齐和布局规则，防止因字段重排导致数据解析错位：

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

即使代码通过了编译且测试表现正常，`unsafe` 块中仍可能潜藏着极其隐蔽的未定义行为 (UB)。为此，可以使用 Rust 官方的解释器工具 **Miri**。

Miri 会在 MIR（Mid-level Intermediate Representation）层面上解释运行代码，精细监控内存访问。

安装与测试运行：

```bash
rustup +nightly component add miri
cargo +nightly miri test
```

Miri 会实时检测并报告诸如内存泄漏、别名冲突、使用未初始化内存及越界访问等安全隐患。
