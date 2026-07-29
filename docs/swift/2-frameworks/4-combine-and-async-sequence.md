---
sidebar_position: 4
---

# Combine 与 AsyncSequence

Swift 生态提供了两种处理**随时间变化的连续异步数据流**的方案：传统的响应式框架 **Combine**，以及现代 Swift 并发原生自带的 **`AsyncSequence`**。

---

## 1. Combine 响应式编程框架

Combine 是 Apple 在 iOS 13 推出的声明式响应式框架，围绕三大核心组件建立：
1. **Publisher（发布者）**：定义事件流生产逻辑（输出值 `Output` 或失败 `Failure`）。
2. **Operator（操作符）**：对数据流进行链式转换、过滤与防抖（如 `map`, `filter`, `debounce`）。
3. **Subscriber（订阅者）**：消费数据（如 `sink`, `assign`）。

```swift
import Combine

class SearchViewModel {
    @Published var searchText: String = ""
    private var cancellables = Set<AnyCancellable>()
    
    init() {
        // 典型防抖搜索响应流
        $searchText
            .debounce(for: .milliseconds(300), scheduler: RunLoop.main) // 300ms 防抖
            .removeDuplicates() // 过滤重复输入
            .filter { !$0.isEmpty } // 忽略空字符串
            .sink { [weak self] query in
                self?.performSearch(query: query)
            }
            .store(in: &cancellables) // 保存 CancelToken 避免被提前释放
    }
    
    private func performSearch(query: String) {
        print("Searching for: \(query)")
    }
}
```

---

## 2. 现代 `AsyncSequence` 与 `AsyncStream`

在 Swift 5.5+ 现代并发时代，语言层面原生支持了类似数组遍历风格的异步流接口：`AsyncSequence`。你可以在 `for await` 循环中平滑消费异步数据。

### 2.1 使用 `AsyncStream` 适配传统回调

`AsyncStream` 能够极为简便地将传统的逻辑（如 Location 位置更新、WebSocket 收到消息）转换为 Swift 并发异步序列：

```swift
func makeLocationStream() -> AsyncStream<CLLocation> {
    AsyncStream { continuation in
        let delegate = LocationDelegate { location in
            // 向流中投递新数据
            continuation.yield(location)
        }
        
        continuation.onTermination = { _ in
            delegate.stop()
        }
    }
}

// 消费异步流
func observeLocations() async {
    let locationStream = makeLocationStream()
    
    // 使用 for await 优雅地逐个处理流事件
    for await location in locationStream {
        print("New location: \(location.coordinate.latitude)")
    }
}
```

---

## 3. Combine vs AsyncSequence 对比选型

| 维度 | Combine 框架 | AsyncSequence / AsyncStream |
| :--- | :--- | :--- |
| **范式** | 响应式函数式编程 (RP) | 命令式异步循环 (Imperative Async) |
| **语法风格** | 链式操作符流水线 (`map`/`flatMap`/`combineLatest`) | 语言级 `for await in` 循环与 `async/await` |
| **错误处理** | 强类型 `Failure: Error` 约束 | 依靠 `throws` 关键字 |
| **UI 整合** | SwiftUI `@Published` 深度原生绑定 | 配合 `@Observable` 或 `Task` 组合 |
| **发展趋势** | 维护状态，逐步被 SwiftUI 内部收拢 | Apple 核心语言重点推行演进的方向 |

:::tip 工程选型建议
- **复杂多路数据流组合**：若需频繁处理 `zip`、`combineLatest`、复杂防抖等高级操作符， Combine 仍是强力工具。
- **单路异步事件推送/WebSocket/通知**：优先推荐使用 `AsyncStream` + `for await`，可读性更好且天然防泄漏。
:::
