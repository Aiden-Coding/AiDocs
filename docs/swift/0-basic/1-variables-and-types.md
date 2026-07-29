---
sidebar_position: 1
---

# 变量与数据类型

Swift 是一门强类型的、强调内存安全的现代化编程语言。在使用和声明数据时，Swift 会在编译期执行严格的类型检查，同时借助强大的**类型推断（Type Inference）**机制，又不会让代码显得繁琐。

## 1. 常量与变量 (Constants & Variables)

在 Swift 中，你使用 `let` 声明常量，使用 `var` 声明变量。

```swift
let maximumNumberOfLoginAttempts: Int = 10
var currentLoginAttempt: Int = 0
```

### 深入原理：不可变性的优势

Swift 极度推崇“不可变性（Immutability）”。使用 `let` 声明的值一旦被赋予初始值后，便会在内存中被封印，无法再次修改。
- **线程安全**：由于值是不可变的，在并发或多线程环境下，你可以安全地共享常量而不用担心竞态条件（Race Conditions）。
- **编译优化**：编译器完全知晓常量不会变化，因此能做深度的指令预读取和寄存器分配优化。

:::tip 最佳工程实践
当你编写 Swift 代码时，**永远优先使用 `let`**。只有当你明确预见到该标识符的值需要在未来改变时，才将其降级为 `var`。这能极大降低由于状态改变导致的隐藏 Bug。
:::

## 2. 类型推断与类型注解

虽然 Swift 是静态强类型语言，但你不必强制为每一个变量编写类型注解。编译器会根据字面量初始化追踪其具体的底层类型。

```swift
// 类型自动推断为 Double
let pi = 3.14159

// 空集合等无法推断类型的场景，需要显示提供类型注解
var userConfiguration: [String: Any] = [:]
```

:::warning 编译耗时提示
极致的类型推断有时会成为构建阶段的性能瓶颈。在非常复杂的单行表达式（如嵌套多个高阶函数 `map/filter/reduce`，或是复杂的 Dictionary 嵌套）中，显式声明类型注解（Type Annotation）能够帮编译器省下评估类型的时间，从而极大地**缩短编译时间**。
:::

## 3. 可选类型 (Optionals)：Swift 安全的基石

Swift 不存在传统意义上的 `null`，取而代之的是可选类型（Optionals）。它用来清晰地表达一个值**存在（Some）**或**缺失（None）**。

### 原理解析：Optional 本质上是 Enum

当你写下 `String?` 时，其实你使用的是 Swift 标准库中的泛型枚举：

```swift
// Swift 标准库内部的粗略实现
enum Optional<Wrapped> {
    case none
    case some(Wrapped)
}
```

这意味着，一个可选类型包裹了真实的值，在使用它之前，你必须**解包 (Unwrap)**。

### 工程实战：可选绑定与提前退出

在实际开发中，处理 API 响应或字典解析时经常需要解包。我们推荐结合业务场景使用 `if let` 或 `guard let`。

```swift
struct UserProfile {
    let name: String
    let age: Int
}

func parseUserResponse(json: [String: Any]) -> UserProfile? {
    // 使用 guard let 进行"提前退出"，避免多层嵌套的"末日金字塔" (Pyramid of Doom)
    guard let name = json["name"] as? String,
          let age = json["age"] as? Int,
          age >= 18 else {
        
        print("Invalid user data or under 18.")
        return nil
    }
    
    // 到这里，name 和 age 已经被安全地解包并类型转换为确定值
    return UserProfile(name: name, age: age)
}
```

:::danger 严禁随意强制解包 (Force Unwrapping)
尽管你可以使用 `!` (如 `serverResponseCode!`) 来强制获取 Optional 里的值，但如果该值为 `nil`，应用将在运行时直接 **Crash**。在生产环境代码中，除非通过极其严格的前提条件保证其绝不为 `nil`，否则应将其视作代码坏味（Code Smell），并在 Code Review 中加以限制。
:::
