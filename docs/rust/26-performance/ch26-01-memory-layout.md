---
title: "内存布局优化"
sidebar_position: 120
---

## 为什么内存布局很重要

CPU 以**缓存行**（*cache line*，通常 64 字节）为单位读取内存。若结构体字段分散、存在大量填充（*padding*），或热数据与冷数据混放，均会导致缓存利用率低下，严重拖累性能。

## `repr` 属性

Rust 默认按编译器认为最优的方式排列结构体字段（可重排字段顺序）。`#[repr(...)]` 属性允许精确控制内存布局。

### `repr(C)`：与 C ABI 兼容

```rust
// repr(C)：按声明顺序排列字段，与 C 语言 ABI 兼容
#[repr(C)]
struct CCompatible {
    x: u32,  // 偏移 0，占 4 字节
    // 4 字节 padding（使 y 对齐到 8 字节边界）
    y: f64,  // 偏移 8，占 8 字节
}
// 总大小：16 字节（含 padding）
```

适用场景：FFI（与 C 库互操作），需要稳定内存布局的场合。

### `repr(packed)`：移除字段间填充

```rust
// repr(packed)：移除字段间 padding，紧密排列
#[repr(packed)]
struct Packed {
    a: u8,   // 偏移 0
    b: u32,  // 偏移 1（无填充，非对齐访问）
}
// 总大小：5 字节
```

> **注意**：`repr(packed)` 结构体的字段引用可能是非对齐的，直接取引用会触发未定义行为（UB）。访问字段时必须使用 `read_unaligned`，或通过 `unsafe` 拷贝值。

### `repr(align(N))`：强制更大的对齐

```rust
// 对齐到 64 字节（恰好是一个缓存行）
// 防止与其他数据共享缓存行（伪共享问题）
#[repr(align(64))]
struct CacheAligned {
    data: [u8; 64],
}
```

多线程场景下，若两个线程各自修改位于同一缓存行的不同变量，会引发**伪共享**（*false sharing*）导致性能下降。将热点变量对齐到缓存行边界可彻底避免此问题。

### `repr(transparent)`：单字段透明包装

```rust
// 与内部字段完全相同的内存布局，可安全用于 FFI 包装
#[repr(transparent)]
struct NonZeroCheck(u32);
```

## 字段排序优化

Rust 默认布局（非 `repr(C)`）会自动重排字段，但显式控制顺序有助于理解和 FFI 场景。

**原则**：从大到小排列字段，减少 padding。

```rust
// 差：有 7 字节 padding，大小 16 字节
struct Bad {
    a: u8,   // 1 字节 + 7 字节 padding
    b: u64,  // 8 字节
}

// 好：0 字节 padding，大小 9 字节
struct Good {
    b: u64,  // 8 字节
    a: u8,   // 1 字节
}
```

用 `std::mem::size_of` 验证：

```rust
println!("Bad  size: {}", std::mem::size_of::<Bad>());    // 16
println!("Good size: {}", std::mem::size_of::<Good>());   // 9
println!("align of u64: {}", std::mem::align_of::<u64>()); // 8
```

## 枚举的内存布局

Rust 枚举（*enum*）使用判别值（*discriminant*）标记当前变体。编译器会自动进行**空指针优化**（*niche optimization*）：

```rust
// Option<Box<T>> 与 Box<T> 大小相同！
// 编译器用空指针表示 None，无需额外存储 discriminant
assert_eq!(
    std::mem::size_of::<Option<Box<i32>>>(),
    std::mem::size_of::<Box<i32>>()
);
```

## 热/冷数据分离

将**频繁访问**的字段（热数据）与**不常访问**的字段（冷数据）分开存储，可提升缓存命中率。

```rust
// 反例：热字段和冷字段混在同一结构体
struct UserBad {
    id: u64,                // 热：每次操作都访问
    name: String,           // 热：经常展示
    email: String,          // 温：偶尔更新
    created_at: i64,        // 冷：几乎不访问
    last_login_ip: [u8; 16],// 冷：仅审计时用
    metadata: Vec<String>,  // 冷：批量操作才用
}

// 推荐：热/冷分离
struct UserHot {
    id: u64,
    name: String,
}

struct UserCold {
    email: String,
    created_at: i64,
    last_login_ip: [u8; 16],
    metadata: Vec<String>,
}

struct User {
    hot: UserHot,
    cold: Box<UserCold>,  // 冷数据放堆上，避免占用缓存行
}
```

## 面向数据设计（DoD）

面向数据设计（*Data-Oriented Design*，DoD）将"结构体数组"（Array of Structs，AoS）改为"数组的结构体"（Struct of Arrays，SoA），大幅提升批量处理时的 SIMD 向量化效果：

```rust
// AoS：普通布局，随机访问友好
struct Particle { x: f32, y: f32, z: f32, mass: f32 }
let particles: Vec<Particle> = vec![/* ... */];

// SoA：批量处理友好，SIMD 自动向量化
struct Particles {
    x: Vec<f32>,
    y: Vec<f32>,
    z: Vec<f32>,
    mass: Vec<f32>,
}

impl Particles {
    fn update_positions(&mut self, dt: f32) {
        // 编译器可自动向量化此循环（操作连续 f32 数组）
        for x in &mut self.x {
            *x += dt;
        }
    }
}
```

## 检测工具速查

| 工具 / API | 作用 |
|---|---|
| `std::mem::size_of::<T>()` | 类型大小（字节） |
| `std::mem::align_of::<T>()` | 类型对齐要求 |
| `std::mem::offset_of!(T, field)` | 字段偏移量（Rust 1.77+） |
| `cargo install cargo-show-asm` | 查看生成的汇编代码 |
| `cargo install typesize` | 递归显示类型尺寸 |
