---
sidebar_position: 5
---

# Actor 与结构化并发

Swift 5.5 引入了全新的并发模型，旨在通过语言层面的语法约束，消除传统的由于多线程竞态（Race Condition）导致的内存安全隐患。

---

## 1. Actor 数据隔离机制

传统多线程并发开发中，保护共享可变状态需要手动加锁（如 `NSLock`、`dispatch_queue`）。`Actor` 是 Swift 引入的引用类型（类似于 `class`），但它提供了**Actor Isolation（Actor 隔离）**：
- **互斥访问**：同一时刻，只有一个 Task 可以访问 Actor 内部的状态。
- **外部异步**：外部访问 Actor 的属性或调用其方法时，必须使用 `await` 异步挂起，等待 Actor 的排队调度。

```swift
actor BankAccount {
    private var balance: Double = 0.0
    
    func deposit(amount: Double) {
        balance += amount
    }
    
    func withdraw(amount: Double) -> Double {
        guard balance >= amount else { return 0 }
        balance -= amount
        return amount
    }
}

// 外部调用场景
func processTransaction(account: BankAccount) async {
    // 必须使用 await，编译期强制排队
    await account.deposit(amount: 100.0)
    let cash = await account.withdraw(amount: 50.0)
    print("Withdrew: \(cash)")
}
```

---

## 2. 结构化并发 (Structured Concurrency)

结构化并发保证了异步任务树的生命周期可预测、可取消，并防止“野 Task（Orphan Tasks）”导致内存泄漏。

### 2.1 `TaskGroup` 动态子任务

使用 `withTaskGroup` 或 `withThrowingTaskGroup` 可以并行发起多个未知数量的子任务，并按顺序收集结果：

```swift
func fetchAllUserImages(ids: [String]) async throws -> [UIImage] {
    try await withThrowingTaskGroup(of: UIImage.self) { group in
        var images = [UIImage]()
        
        for id in ids {
            group.addTask {
                return try await fetchSingleImage(id: id)
            }
        }
        
        // 收集并行任务的运行结果
        for try await image in group {
            images.append(image)
        }
        
        return images
    }
}
```

### 2.2 `async let` 并行绑定

当已知固定的几个独立异步任务时，使用 `async let` 可以更自然地实现并行：

```swift
func loadDashboardData() async throws -> (UserProfile, [NewsItem]) {
    // 两个任务同时启动并行执行
    async let profileTask = fetchUserProfile()
    async let newsTask = fetchLatestNews()
    
    // 在需要使用结果的地方组合 await
    return try await (profileTask, newsTask)
}
```

---

## 3. 全局 Actor 与 `@MainActor`

UI 框架（如 UIKit、SwiftUI）要求所有的界面更新必须运行在主线程。Swift 提供了 `@MainActor` 属性标注：

```swift
@MainActor
class ProfileViewModel: ObservableObject {
    @Published var username = ""
    
    func updateUsername() {
        // 确保被包裹的代码块百分百在 Main Thread 运行
        self.username = "NewName"
    }
}
```

---

## 4. `Sendable` 协议与数据跨域安全

在 Swift 强安全并发体系中，在不同 Task 或 Actor 边界之间传递的数据类型，必须遵循 `Sendable` 协议：
- **值类型 (Struct, Enum)**：如果所有成员属性都遵循 `Sendable`，则默认自动获得 `Sendable` 约束。
- **引用类型 (Class)**：默认是不安全的；只有标记为 `final` 且内部没有可变状态（完全只读）的类，才能手动声明为 `@unchecked Sendable`。

```swift
// 跨并发边界传递的安全数据结构
struct UserMessage: Sendable {
    let id: UUID
    let content: String
}
```
