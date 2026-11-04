---
title: "Const 泛型"
sidebar_position: 4
---

# Const 泛型

普通泛型参数化类型或生命周期；Const 泛型则允许类型、trait 和函数使用编译期常量作为参数。最常见的用途是让固定长度数组参与泛型抽象。

## 用常量表达数组长度

数组类型包含元素类型和长度。Const 泛型让长度可以在定义时参数化，而不是为每种长度分别编写类型：

```rust
struct Buffer<T, const N: usize> {
    data: [T; N],
}

impl<T, const N: usize> Buffer<T, N> {
    fn new(data: [T; N]) -> Self {
        Self { data }
    }

    fn len(&self) -> usize {
        N
    }

    fn as_array(&self) -> &[T; N] {
        &self.data
    }
}

let bytes = Buffer::new([0_u8; 16]);
assert_eq!(bytes.len(), 16);
```

`Buffer<u8, 16>` 与 `Buffer<u8, 32>` 是不同的类型。长度在编译期已知，不需要为长度本身进行运行时存储。

函数也可以使用 Const 泛型：

```rust
fn filled<const N: usize>(value: u8) -> [u8; N] {
    [value; N]
}

let packet = filled::<8>(0xff);
assert_eq!(packet.len(), 8);
```

## 编码维度与协议约束

可以用多个常量参数表达矩阵或固定尺寸数据的维度：

```rust
struct Matrix<T, const ROWS: usize, const COLS: usize> {
    rows: [[T; COLS]; ROWS],
}

impl<T, const ROWS: usize, const COLS: usize> Matrix<T, ROWS, COLS> {
    fn rows(&self) -> usize {
        ROWS
    }

    fn columns(&self) -> usize {
        COLS
    }
}
```

不同维度的 `Matrix` 是不同类型，接口可以据此约束输入和输出。不过矩阵乘法等操作通常需要在结果类型中表达 `ROWS * COLS` 一类常量表达式；这类一般化的泛型常量表达式仍受稳定语言功能限制，不能假设任意算术表达式都可直接用于类型。

## Const 泛型参数限制

稳定 Rust 支持常用的整数类型以及 `char`、`bool` 作为 Const 泛型参数类型。参数必须在编译期求值：

```rust
struct Flag<const ENABLED: bool>;

type Enabled = Flag<true>;
```

Const 参数值属于类型的一部分，因此不同的值会形成不同类型。不要将运行时配置误当作 Const 泛型：运行时才读到的文件大小、用户输入或网络数据，不能用于实例化 Const 泛型类型。

## Const 泛型与 `const fn`

两者相关但不同：

- **Const 泛型**：让类型或函数以编译期常量为参数，例如 `Buffer<T, N>`。
- **`const fn`**：允许函数在可行的上下文中于编译期求值；它也可以在运行时调用。
- **`const` 项**：定义编译期常量值，本身不是泛型参数。

```rust
const fn doubled(value: usize) -> usize {
    value * 2
}

struct Bytes<const N: usize>;
type SmallBuffer = Bytes<{ doubled(8) }>;
```

花括号用于在需要时明确界定 Const 泛型参数表达式。

## 适用场景与取舍

适合的场景包括固定长度缓冲区、协议字段、静态维度的线性代数类型，以及需要在类型层表达大小差异的 API。使用前应权衡：

- **优点**：在编译期区分不同尺寸，减少长度参数的运行时传递，并让 API 约束更明确。
- **成本**：每组常量参数都是不同的单态化类型，可能增加编译时间和二进制体积；类型推断或错误信息也可能变复杂。
- **边界**：Const 泛型不等同于依赖类型系统；任意常量运算、复杂证明和动态长度并不自动可表达。

当长度来自运行时，使用 `Vec<T>`、切片或显式长度检查通常更合适。Const 泛型的价值在于真实且稳定的编译期约束，而不是把所有运行时数据都编码进类型。
