---
sidebar_position: 1
---

# 面向协议编程 (POP)

在 2015 年的 WWDC 上，Apple 宣布 Swift 是一门**面向协议编程 (Protocol-Oriented Programming, POP)** 的语言。不同于传统的面向对象编程（OOP）中深度嵌套的类继承树，POP 提倡通过协议（Protocols）和值类型（Value Types，如 Struct）进行横向的能力组合。

## 1. 协议的定义与默认实现

通过协议，我们定义了一整套接口规范，而通过**协议扩展 (Protocol Extensions)**，我们可以直接为这些接口提供具有实战价值的默认实现，无需借助基类。

```swift
protocol Drivable {
    var speed: Double { get set }
    func accelerate()
}

// 通过扩展提供默认实现（Traits 模式的体现）
extension Drivable {
    mutating func accelerate() {
        speed += 10.0
        print("当前速度提升至: \(speed) km/h")
    }
}
```

### 原理解析：方法派发 (Method Dispatch)
在面向协议的大规模架构中，理解“派发机制”至关重要：
- 如果一个方法**在协议原型**中声明了，并在扩展中提供了默认实现，调用时会走 **动态派发 (Protocol Witness Table, PWT)**，这意味着如果有具体类型重写了该方法，多态能够正常工作。
- 如果一个方法**仅仅在协议扩展**中定义（未在协议声明中约定），调用时会走 **静态派发 (Static Dispatch)**，编译器在编译期就绑定了内存地址。此时多态失效！

:::warning 静态派发的陷阱
如果协议的使用者将实例强制转换为协议类型，并调用了仅在扩展中存在的方法，程序的行为可能与预期不符。因此，**核心的重写逻辑必须在协议体内声明！**
:::

## 2. 工程实战：基于 POP 的依赖注入与单元测试

在实际的企业级 iOS/macOS 架构中，网络层几乎全部基于 POP 搭建。通过将组件依赖限制在抽象协议上，我们可以极少侵入性地完成 Mock 数据的注入。

```swift
// 1. 定义网络服务应当具备的能力抽象
protocol NetworkProvider {
    func fetchUserProfile(id: String) async throws -> UserProfile
}

// 2. 生产环境的真实实现
struct ProductionNetworkService: NetworkProvider {
    func fetchUserProfile(id: String) async throws -> UserProfile {
        // ...执行真实 URLSession 逻辑
        return UserProfile(name: "Real User")
    }
}

// 3. 测试环境的 Mock 实现
struct MockNetworkService: NetworkProvider {
    var shouldReturnError = false
    
    func fetchUserProfile(id: String) async throws -> UserProfile {
        if shouldReturnError { throw URLError(.badServerResponse) }
        return UserProfile(name: "Test User")
    }
}

// 4. 业务注入层面 (面向接口而非具体类)
class UserViewModel {
    let provider: NetworkProvider
    
    // 通过初始化器注入协议
    init(provider: NetworkProvider = ProductionNetworkService()) {
        self.provider = provider
    }
    
    func loadData() async {
        do {
            let user = try await provider.fetchUserProfile(id: "123")
            print("Loaded: \(user.name)")
        } catch {
            print("Failed")
        }
    }
}
```

:::tip 组合优于继承 (Composition over Inheritance)
通过 POP，上述 `ProductionNetworkService` 是一个轻量的 `struct`（值类型），相比于继承自特定 `BaseService` 的类（引用类型），它不存在内存堆分配（Heap Allocation）开销，且绝对没有对象状态污染的问题。这正是 Swift 极客推崇的架构之美。
:::
