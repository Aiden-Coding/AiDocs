---
sidebar_position: 2
---

# 控制流与模式匹配 (Control Flow & Pattern Matching)

Swift 提供了极其强大的控制流语句。除了标准的 `for-in` 和 `while`，Swift 的 `switch` 语句配合其强大的**模式匹配 (Pattern Matching)** 机制，使其成为处理复杂分支逻辑的杀手锏。

## 1. 现代化的 For-In 循环

你可以使用 `for-in` 循环来遍历集合或区间。在实际工程中，我们通常结合 `where` 子句或者序列的方法来进行更高效的迭代。

```swift
let userAges = ["Anna": 22, "Alex": 17, "Brian": 28, "Jack": 15]

// 结合 where 子句进行过滤遍历
for (name, age) in userAges where age >= 18 {
    print("\(name) is an adult.")
}
```

:::tip 性能与可读性
使用 `where` 子句不仅能避免在循环体内部嵌套一层 `if`，还能让意图更加直观。在编译器层面，这也能更容易被优化为高效的集合枚举指令。
:::

## 2. Switch 语句与穷尽性分析

Swift 的 `switch` 语句默认是不贯穿（fallthrough）的，且必须穷尽（Exhaustive）所有可能的情况。一旦枚举或条件有遗漏，**编译器会直接报错**，这在项目架构演进中简直是防止 Bug 的神器。

### 深入原理：基于抽象语法树的穷尽性检查

Swift 编译器会在 AST (Abstract Syntax Tree) 层面对 `switch` 语句的每一个 `case` 进行分支树构建，检查是否覆盖了所有可能的输入域。如果你在后期迭代中给 `enum` 增加了一个新的 case，所有用到该枚举的 `switch` 都会编译失败，从而强制开发者处理新逻辑，避免在运行时陷入未知状态。

### 工程实战：结合元组与枚举的复杂业务流转

在状态机或网络响应处理等工程场景中，经常需要对多个变量同时做条件判断。Swift 的模式匹配不仅能一次性匹配多个条件，还能解包关联值。

```swift
// 定义网络响应结果
enum HTTPStatus {
    case success
    case unauthorized
    case serverError(code: Int)
}

struct NetworkResponse {
    let status: HTTPStatus
    let data: Data?
}

func handleResponse(_ response: NetworkResponse) {
    // 使用元组 (Tuple) 并行匹配多个状态并解包
    switch (response.status, response.data) {
        
    case (.success, let payload?) where payload.count > 0:
        print("Request succeeded with \(payload.count) bytes of data.")
        
    case (.success, nil), (.success, let p?) where p.isEmpty:
        print("Request succeeded but returned empty data.")
        
    case (.unauthorized, _):
        // 触发自动刷新 Token 逻辑
        print("Session expired, renewing token...")
        
    case (.serverError(let code), _) where (500...599).contains(code):
        fallthrough // 显式贯穿，进入通用的系统错误兜底处理
        
    default:
        print("Unhandled error or unknown state.")
    }
}
```

:::warning 谨慎使用 default
如果你是在处理自定义的 `enum`，尽量**避免**使用 `default` 分支。因为只要加上 `default`，编译器即使在未来发现新增加的枚举项，也不会报警（都被 default 吞噬了）。手动写全所有的 `case` 才是维护大型高可用工程的最佳实践，这也被称为 "Exhaustive Enum Matching"。
:::
