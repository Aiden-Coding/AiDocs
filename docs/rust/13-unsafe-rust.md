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

## 🔴 内存别名规则 (Aliasing Rules) 与 UnsafeCell

在 Safe Rust 中，借用检查器强制执行**独占性借用规则**：一个值可以有多个不可变引用（`&T`），或者有且仅有一个可变引用（`&mut T`），但两者绝不能同时并存。这一借用契约在编译器底层被称为 **无别名规则 (Aliasing Rules)**。

### 1. 编译器对 `&mut T` 的优化假设与 UB

编译器在优化汇编指令时，会基于“无别名规则”进行极其强力的假设。如果它看到一个 `&mut T`，它就会假设**在当前作用域内，绝对没有任何其他指针能够修改该内存**。这使得编译器可以将内存数据直接缓存到 CPU 寄存器中，而不需要频繁回写到内存。

如果在 `unsafe` 中打破了这一规则，制造了两个同时存活、指向同一地址的可变引用（或一个可变引用加一个不可变引用），就会触发灾难性的**编译器未定义行为 (UB)**：

```rust
// ❌ 经典 UB 示例：别名规则冲突
unsafe fn evil_alias(x: &mut i32) {
    let ptr = x as *mut i32;
    let ref1 = &mut *ptr; // 创造了第一个可变引用
    let ref2 = &mut *ptr; // 创造了第二个可变引用（指向同一地址！）
    
    *ref1 = 10;
    *ref2 = 20; 
    // 此时 ref1 和 ref2 都是可变的且同时存活，编译器在重排指令时
    // 可能会将对 ref1 的写入重排到 ref2 之后，或进行错误的寄存器缓存，导致数据错乱。
}
```

### 2. 借用规则的“后门”：`UnsafeCell<T>`

如果确实需要将一个不可变引用（`&T`）内部的数据进行可变修改，必须使用 `std::cell::UnsafeCell<T>`。

`UnsafeCell<T>` 是 Rust 核心类型系统中**唯一**能够关闭“无别名”编译器优化的类型。所有运行时内部可变性容器（如 `Cell`, `RefCell`, `Mutex`）其底层无一例外都是包裹了 `UnsafeCell<T>`。

---

## 🔴 裸指针的高级内存操作

在实现高级数据结构（如自定义 `Vec` 或环形缓冲区）时，单纯使用裸指针的 `*ptr = value` 赋值不仅受制于对齐限制，还会触发隐式的 `Drop`，可能导致未初始化内存被释放（Double Free）。因此，必须使用 `std::ptr` 模块中提供的高级裸指针原子读写与拷贝函数：

### 1. 读写操作 (`std::ptr::read` 与 `write`)

- **`std::ptr::write(dst, src)`**：将 `src` 的值写入 `dst` 地址，**不调用 `dst` 处的析构函数（Drop）**。这在向未初始化的内存写入数据时至关重要。
- **`std::ptr::read(src)`**：从 `src` 地址读取值，转移其所有权，**但不使 `src` 地址失效且不调用其析构函数**。这在将堆中某项移动出来时很有用。

```rust
use std::ptr;

fn swap_demo<T>(a: &mut T, b: &mut T) {
    unsafe {
        let ptr_a = a as *mut T;
        let ptr_b = b as *mut T;
        
        // 读取 a 处的变量（不触发 Drop）
        let temp = ptr::read(ptr_a);
        // 将 b 写入 a 处（由于 a 已经被读出，这里不触发 Drop，直接覆盖）
        ptr::write(ptr_a, ptr::read(ptr_b));
        // 将 temp 写入 b 处
        ptr::write(ptr_b, temp);
    }
}
```

### 2. 内存块拷贝 (`std::ptr::copy` 与 `copy_nonoverlapping`)

类似于 C 语言中的 `memmove` 和 `memcpy`：
- **`copy_nonoverlapping(src, dst, count)`**：类似于 `memcpy`。要求源内存块和目标内存块**绝对不能有任何重叠**。它执行极其高效的位拷贝。
- **`copy(src, dst, count)`**：类似于 `memmove`。允许源内存与目标内存有重叠（如在同一个数组内向前或向后移动元素）。

```rust
unsafe fn shift_left<T>(ptr: *mut T, len: usize) {
    // 将整个数组的所有元素向左移动 1 位（源和目标内存高度重叠，必须使用 copy 而非 copy_nonoverlapping）
    std::ptr::copy(ptr.add(1), ptr, len - 1);
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

---

## 🔴 内联汇编 (Inline Assembly)

Rust 通过 `asm!` 宏（Rust 1.59 稳定）支持内联汇编，用于极致性能优化或访问处理器特殊指令。

```rust
use std::arch::asm;

fn main() {
    // 示例 1：读取 x86-64 的 TSC（时间戳计数器）
    #[cfg(target_arch = "x86_64")]
    let tsc: u64 = unsafe {
        let lo: u32;
        let hi: u32;
        asm!(
            "rdtsc",
            out("eax") lo,
            out("edx") hi,
            options(nomem, nostack)
        );
        ((hi as u64) << 32) | (lo as u64)
    };
    
    #[cfg(target_arch = "x86_64")]
    println!("TSC: {}", tsc);

    // 示例 2：原子交换操作（x86-64 xchg 指令）
    #[cfg(target_arch = "x86_64")]
    unsafe {
        let mut x: u64 = 10;
        let y: u64 = 20;
        asm!(
            "xchg {0}, {1}",
            inout(reg) x,
            in(reg) y,
            options(pure, nomem, nostack)
        );
        println!("交换后 x = {}", x); // 20
    }
}
```

### `asm!` 关键语法要素

| 操作数类型 | 说明 |
| :--- | :--- |
| `in(reg) expr` | 输入操作数，值来自表达式 |
| `out(reg) var` | 输出操作数，结果写入变量 |
| `inout(reg) var` | 输入输出操作数 |
| `lateout(reg) var` | 延迟输出（不与输入操作数共享寄存器） |
| `const expr` | 编译期常量操作数 |
| `options(nomem)` | 告知编译器此汇编不读写内存，允许更激进优化 |
| `options(nostack)` | 告知编译器此汇编不修改栈指针 |
| `options(pure)` | 无副作用，相同输入产生相同输出 |

> [!WARNING]
> 内联汇编直接操作 CPU 寄存器，不当使用会导致难以调试的崩溃。除非有充分的性能分析证明必要性，否则优先使用 `std::sync::atomic` 或 SIMD intrinsics 替代。

---

## 🔴 no_std 与嵌入式 Rust

`no_std` 是 Rust 在嵌入式/裸机（bare-metal）环境中运行的模式——不链接标准库（`std`），只使用核心库（`core`）和可选的 `alloc`。

### 启用 no_std

在 `lib.rs` 或 `main.rs` 顶部添加属性：

```rust
#![no_std]  // 不链接标准库
#![no_main] // 不使用 Rust 默认的 main 入口（裸机需要自定义）

use core::panic::PanicInfo;

// 必须提供自定义的 panic 处理函数
#[panic_handler]
fn panic(_info: &PanicInfo) -> ! {
    loop {} // 裸机通常进入无限循环
}

// 裸机入口：链接器符号 _start
#[no_mangle]
pub extern "C" fn _start() -> ! {
    // 初始化硬件...
    loop {}
}
```

### no_std 下可用与不可用的模块

| 可用（来自 `core`） | 需要 `alloc` | 不可用（需要 OS） |
| :--- | :--- | :--- |
| 基础类型、切片、引用 | `Vec`, `String`, `Box` | 文件 I/O、网络、线程 |
| `Option`, `Result`, `Iterator` | `Rc`, `Arc` | `std::sync::Mutex` |
| 原子类型、浮点运算 | 自定义 `alloc` 分配器 | 环境变量、进程管理 |
| `fmt::Write` | `BTreeMap`, `HashMap`（需要 alloc） | 动态链接库加载 |

### 使用 alloc crate 启用堆分配

如果目标平台有内存分配器，可以使用 `alloc` crate：

```rust
#![no_std]
extern crate alloc;

use alloc::vec::Vec;
use alloc::string::String;

// 必须提供全局分配器
use linked_list_allocator::LockedHeap;

#[global_allocator]
static ALLOCATOR: LockedHeap = LockedHeap::empty();
```

---

## 🔴 实现自定义全局分配器 (GlobalAlloc)

通过实现 `GlobalAlloc` trait，可以完全接管 Rust 程序的内存分配。这是理解内存管理底层的重要实践：

```rust
use std::alloc::{GlobalAlloc, Layout, System};
use std::sync::atomic::{AtomicUsize, Ordering};

// 带统计功能的包装分配器
struct TrackingAllocator {
    allocated: AtomicUsize,
    deallocated: AtomicUsize,
}

unsafe impl GlobalAlloc for TrackingAllocator {
    unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
        let ptr = System.alloc(layout);
        if !ptr.is_null() {
            self.allocated.fetch_add(layout.size(), Ordering::Relaxed);
        }
        ptr
    }

    unsafe fn dealloc(&self, ptr: *mut u8, layout: Layout) {
        System.dealloc(ptr, layout);
        self.deallocated.fetch_add(layout.size(), Ordering::Relaxed);
    }
}

#[global_allocator]
static ALLOCATOR: TrackingAllocator = TrackingAllocator {
    allocated: AtomicUsize::new(0),
    deallocated: AtomicUsize::new(0),
};

fn main() {
    let _v: Vec<i32> = (0..1000).collect(); // 触发分配
    
    let alloc = ALLOCATOR.allocated.load(Ordering::Relaxed);
    let dealloc = ALLOCATOR.deallocated.load(Ordering::Relaxed);
    println!("已分配: {} 字节", alloc);
    println!("已释放: {} 字节", dealloc);
    println!("当前使用: {} 字节", alloc - dealloc);
}
```

---

## 🔴 `std::mem::transmute` — 类型双关（Type Punning）

`transmute<T, U>(val: T) -> U` 将一个类型的位模式强制重新解释为另一个类型，是 Rust 中**最危险**的操作之一。它要求 `T` 和 `U` 的大小完全相同，否则编译拒绝。

### 1. 基本用法

```rust
use std::mem;

fn main() {
    // 将 f64 的位模式解释为 u64（检查 IEEE 754 表示）
    let f: f64 = 1.0_f64;
    let bits: u64 = unsafe { mem::transmute(f) };
    println!("1.0_f64 的位模式: 0x{:016X}", bits);
    // 0x3FF0000000000000（IEEE 754 双精度 1.0）

    // 反向：u64 -> f64
    let recovered: f64 = unsafe { mem::transmute(bits) };
    println!("恢复: {}", recovered); // 1

    // 将 &str 的胖指针重新解释为 (*const u8, usize) 元组
    let s = "hello";
    let (ptr, len): (*const u8, usize) = unsafe { mem::transmute(s) };
    println!("字符串指针: {:p}, 长度: {}", ptr, len);
}
```

### 2. 安全替代方案

大多数 `transmute` 使用场景都有更安全的替代：

```rust
use std::mem;

fn main() {
    // ❌ 危险：transmute 强转 i32 -> u32
    let x: i32 = -1;
    let _y: u32 = unsafe { mem::transmute(x) };

    // ✅ 安全替代：as 强转（对数值类型）
    let y: u32 = x as u32;
    println!("{}", y); // 4294967295

    // ❌ 危险：transmute 强转 *const T -> *mut T
    let val = 5i32;
    let _ptr: *mut i32 = unsafe { mem::transmute(&val as *const i32) };

    // ✅ 安全替代：直接 cast
    let ptr: *mut i32 = &val as *const i32 as *mut i32;

    // ❌ 危险：transmute 延长生命周期
    let local = String::from("temporary");
    let _extended: &'static str = unsafe { mem::transmute(local.as_str()) };
    // 此后 local 被 drop，_extended 成为悬空引用！

    // ✅ 安全替代：Box::leak（真正将数据泄漏为 'static）
    let s = Box::leak(Box::new(String::from("truly static")));
    println!("真正的 'static: {}", s);
}
```

### 3. 合理的使用场景（零成本数组初始化）

```rust
use std::mem;

fn zeroed_array<const N: usize>() -> [u8; N] {
    // 安全：[u8; N] 的所有位模式都是有效的（u8 没有无效位）
    unsafe { mem::zeroed() }
}

fn main() {
    let arr: [u8; 8] = zeroed_array();
    println!("{:?}", arr); // [0, 0, 0, 0, 0, 0, 0, 0]
}
```

> [!WARNING]
> `transmute` 的危险等级在 Rust 的 unsafe 操作中是最高级别：
> - 不验证目标类型的有效性约束（如 `NonZeroU32` 不能为 0，`bool` 只能是 0/1）
> - 不处理对齐问题（可能产生未对齐指针）
> - 可以任意延长生命周期（破坏借用安全）
>
> 绝大多数场景应优先使用 `as` 强转、`From`/`Into`、`ptr::read`/`ptr::write` 或 `bytemuck` crate。
