---
sidebar_position: 2
---

# 现代 Swift 并发 (async/await)

从 Swift 5.5 开始，Apple 推出了基于 `async/await` 的结构化并发模型。这不仅是对老旧的 GCD (Grand Central Dispatch) 和回调嵌套的语法糖替换，更是一次底层的革命：它引入了**协作式线程池 (Cooperative Thread Pool)** 概念，从根本上防止了线程爆炸 (Thread Explosion)。

## 1. 结构化并发基础

使用 `async` 标记异步函数，使用 `await` 挂起当前执行流，释放底层线程给其他任务使用。

```swift
func fetchRemoteConfig() async throws -> [String: Any] {
    let url = URL(string: "https://api.example.com/config")!
    // await 使得此处的系统线程被释放，去做其他工作，直到网络返回
    let (data, response) = try await URLSession.shared.data(from: url)
    
    guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
        throw URLError(.badServerResponse)
    }
    return try JSONSerialization.jsonObject(with: data) as? [String: Any] ?? [:]
}
```

### 原理解析：挂起与恢复 (Suspend & Resume)
当遇到 `await` 时，Swift 并不会阻塞（Block）当前线程！相反，它记录当前函数的局部变量和调用栈（保存为一个状态机），然后主动**交出线程控制权**。当异步操作完成，系统会在协作式线程池中寻找一个**任意可用线程**（并非一定是挂起前的线程！）来恢复执行。

:::danger 严禁包含传统阻塞调用
永远不要在 `async` 上下文中调用传统的阻塞函数（如 `Thread.sleep` 或是 `DispatchSemaphore.wait`）。因为 Swift 并发框架的线程池大小通常等于 CPU 核心数，一旦阻塞了这些受限的线程，整个应用的并发系统将面临死锁灾难。对于挂起，请使用 `try await Task.sleep(nanoseconds:)`。
:::

## 2. 桥接旧版回调地狱 (Continuation)

在真实的工程接手中，你难免遇到老旧的第三方库基于闭包回调。Swift 提供了隔离且安全的接口，用于将基于回调的异步函数"包装"进现代的 `async/await` 世界。

```swift
// 老旧的 GCD 回调函数
func legacyFetchData(completion: @escaping (Result<String, Error>) -> Void) {
    DispatchQueue.global().asyncAfter(deadline: .now() + 1) {
        completion(.success("Legacy Data"))
    }
}

// 现代优雅的封装：withCheckedThrowingContinuation
func modernFetchData() async throws -> String {
    return try await withCheckedThrowingContinuation { continuation in
        legacyFetchData { result in
            switch result {
            case .success(let data):
                continuation.resume(returning: data)
            case .failure(let err):
                continuation.resume(throwing: err)
            }
        }
    }
}
```

:::warning Continuation 简历恢复规则
`continuation` 有一个铁律：你**必须且只能 (Exactly Once)** 调用一次 `resume`。忘记调用会导致挂起的任务永远无法恢复（内存泄漏）；调用两次会引发运行时 **Crash**。
:::

## 3. Actor 与隔离域 (Isolation)

在多核编程中，保护数据的互斥访问是永恒难题。以往我们用 串行队列 或 `NSLock` 避免 Data Race。在现代 Swift 中，引入了极简的 `actor` 。

```swift
actor BankAccount {
    private(set) var balance: Decimal = 0.0
    
    // Actor 内部方法可以直接互相调用，共享同一数据隔离域
    func deposit(amount: Decimal) {
        balance += amount
    }
    
    // 外部调用者必须使用 await 进行异步跨域访问
    func transfer(amount: Decimal, to other: BankAccount) async throws {
        if balance >= amount {
            balance -= amount
            await other.deposit(amount: amount)
        }
    }
}
```

### 深入原理：可重入陷阱 (Actor Reentrancy)
`actor` 保证了每次只有单个任务能执行它的状态改变。但是！如果在 `actor` 内部有一句 `await` 网络调用，在挂起期间，这个 `actor` 的锁其实是会被**释放**的！其他任务可以在这个挂起窗口期进入 `actor` 执行其他方法。这就是 "Actor Reentrancy (可重入性)"。如果你的跨网络事务依赖于严格的前后状态同步，必须特别防范挂起期间状态被他人篡改。
