---
sidebar_position: 6
---

# 属性包装器与 Swift 宏

Swift 提供了强有力的元编程与代码复用语法糖。`@propertyWrapper`（属性包装器）用于封装属性的读写与逻辑拦截，而 Swift 5.9 引入的 **Swift Macros（宏）** 更是将编译期元编程能力带入了核心生态。

---

## 1. 属性包装器 (`@propertyWrapper`)

属性包装器本质上是一个结构体或类，通过增加 `@propertyWrapper` 特性声明，能够拦截属性的存储与访问。

### 1.1 核心定义规范

属性包装器必须包含一个名为 `wrappedValue` 的属性：

```swift
@propertyWrapper
struct Clamped<Value: Comparable> {
    private var value: Value
    let range: ClosedRange<Value>
    
    init(wrappedValue: Value, range: ClosedRange<Value>) {
        self.range = range
        self.value = min(max(wrappedValue, range.lowerBound), range.upperBound)
    }
    
    var wrappedValue: Value {
        get { value }
        set { value = min(max(newValue, range.lowerBound), range.upperBound) }
    }
}

// 工程应用实战：约束百分比属性在 0...100 之间
struct AudioPlayer {
    @Clamped(range: 0...100) var volume: Int = 50
}

var player = AudioPlayer()
player.volume = 120 // 实际上 volume 被 Clamped 拦截赋值为 100
```

### 1.2 投影属性 (`projectedValue`)

可以通过 `projectedValue` 定义暴露给外部的辅助绑定值（通过 `$` 前缀访问）：

```swift
@propertyWrapper
struct UserDefault<T> {
    let key: String
    let defaultValue: T
    
    var wrappedValue: T {
        get { UserDefaults.standard.object(forKey: key) as? T ?? defaultValue }
        set { UserDefaults.standard.set(newValue, forKey: key) }
    }
    
    // 投影值：暴露一个绑定状态或 Publisher
    var projectedValue: String {
        return "UserDefaultsKey: \(key)"
    }
}

struct Settings {
    @UserDefault(key: "isDarkMode", defaultValue: false) var isDarkMode: Bool
}

let settings = Settings()
print(settings.$isDarkMode) // 输出 "UserDefaultsKey: isDarkMode"
```

---

## 2. Swift 5.9+ 宏编程 (Swift Macros)

传统的 C 预处理器宏只是简单的文本替换。而 Swift 宏是在编译期运行的编译器插件，基于 **SwiftSyntax** 树（AST）进行类型安全的代码转换与生成。

### 2.1 独立宏 (`#freestanding`)

在代码中使用 `#` 调用的宏，例如生成代码表达式或字符串：

```swift
// 官方 Swift 示例：#URL 编译期校验 URL 合法性
let validURL = #URL("https://apple.com") // 编译期报错，而非运行时崩溃！
```

### 2.2 附加宏 (`@attached`)

附加到类型、方法或属性上的宏（如 `@Observable`、`@OptionSet`）。

```swift
// iOS 17 状态追踪宏
@Observable
class UserState {
    var name: String = "Alice"
    var age: Int = 20
}
```

编译器展开后，`@Observable` 宏会自动生成属性变化通知与底层观察者依赖图代码：

```swift
// 宏在编译期展开后的等价效果（概念示意）
class UserState {
    private let _$observationRegistrar = ObservationRegistrar()
    
    var name: String = "Alice" {
        get { _$observationRegistrar.access(self, keyPath: \.name); return _name }
        set { _$observationRegistrar.willSet(self, keyPath: \.name); _name = newValue }
    }
}
```

:::tip 性能与工程实践
- **代码简洁度**：属性包装器极大地减少了 UserDefaults、数据校验与数据库 ORM 的冗余模板代码。
- **编译安全**：Swift 宏在编译期展开，兼顾了高效代码生成与编译时静态类型检查。
:::
