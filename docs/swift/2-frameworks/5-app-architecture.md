---
sidebar_position: 5
---

# Swift 应用架构与工程实战 (MVVM & TCA)

随着应用业务复杂度的上升，合理良好的架构设计能够实现**高内聚低耦合**、**可独立测试**与**团队并行开发**。本文对比 iOS 经典架构方案，并深入分析现代 SwiftUI 终极架构 **TCA (The Composable Architecture)**。

---

## 1. 经典架构：MVVM (Model-View-ViewModel)

MVVM 是 SwiftUI 最基础的通用架构范式：
- **Model**：纯粹的数据模型与业务 Domain 实体。
- **View**：声明式 UI 描述，只关注界面渲染与用户交互触发。
- **ViewModel**：封装 UI 状态与业务逻辑，通过 `@Published` / `@Observable` 向 View 暴露数据。

```text
[ View ] <--- Binding / Observation ---> [ ViewModel ] <---> [ Service / Network ]
                                              |
                                          [ Model ]
```

```swift
// MVVM 实战模版
struct User: Codable, Identifiable { let id: UUID; var name: String }

@MainActor
class UserListViewModel: ObservableObject {
    @Published private(set) var users: [User] = []
    @Published private(set) var isLoading = false
    
    private let service: UserServiceProtocol
    
    init(service: UserServiceProtocol = UserService()) {
        self.service = service
    }
    
    func fetchUsers() async {
        isLoading = true
        defer { isLoading = false }
        
        do {
            self.users = try await service.getUsers()
        } catch {
            print("Fetch users error: \(error)")
        }
    }
}
```

---

## 2. 现代单向数据流：TCA (The Composable Architecture)

TCA 是由 Point-Free 团队推出的现代化、强类型单向数据流架构，解决了大型 SwiftUI 应用中**状态分散**、**副作用不透明**与**跨组件测试困难**等硬伤。

### 2.1 TCA 五大核心元素

```text
  [ User Action ]
         |
         v
    ( Feature Action ) ---> [ Reducer (State, Action) ] ---> [ New State ] ---> [ View Render ]
                                     |
                                     +---> [ Effect (Network, Timer...) ]
```

1. **State**：描述 Feature 当前界面状态的数据结构（Struct）。
2. **Action**：枚举列举所有可能发生的事件（用户点击、网络回调、定时器触发）。
3. **Reducer**：**纯函数**。根据当前 State 与收到的 Action 计算出全新的 State，或返回副作用 `Effect`。
4. **Environment / Dependency**：依赖注入管理器（如 API Client、Clock）。
5. **Store**：驱动整个 Feature 运转的核心容器。

### 2.2 TCA Reducer 代码示例

```swift
import ComposableArchitecture

@Reducer
struct CounterFeature {
    struct State: Equatable {
        var count = 0
        var isLoading = false
    }
    
    enum Action {
        case incrementButtonTapped
        case decrementButtonTapped
        case fetchFactButtonTapped
        case factResponse(String)
    }
    
    @Dependency(\.numberFactClient) var numberFact
    
    var body: some ReducerOf<Self> {
        Reduce { state, action in
            switch action {
            case .incrementButtonTapped:
                state.count += 1
                return .none
                
            case .decrementButtonTapped:
                state.count -= 1
                return .none
                
            case .fetchFactButtonTapped:
                state.isLoading = true
                return .run { [count = state.count] send in
                    let fact = try await self.numberFact.fetch(count)
                    await send(.factResponse(fact))
                }
                
            case .factResponse(let fact):
                state.isLoading = false
                // 处理事实展示...
                return .none
            }
        }
    }
}
```

---

## 3. 架构选型对比表

| 维度 | 传统 MVVM | Clean Architecture | TCA (Composable Architecture) |
| :--- | :--- | :--- | :--- |
| **状态一致性** | 易产生多个 `@Published` 状态竞争 | 较好，依赖 UseCase 隔离 | **极高**（单一 State，纯函数修改） |
| **可测试性** | 中等（需 Mock 网络服务） | 良好（抽象解耦完备） | **顶级**（纯函数状态断言 + Effect 机制） |
| **模块可组合性**| 一般 | 良好 | **极佳**（支持子 Store 拼接与父子通讯） |
| **学习曲线** | 低（新手友好） | 中等 | 高（需要掌握单向数据流与 Reducer） |

:::tip 架构落地最佳实践
- **小型/中型项目**：使用 **MVVM**，配合原生 `@Observable` 机制，快速开发上线。
- **大型/团队协同工程**：推荐采用 **TCA** 或 **Clean Architecture**，以获得严密的单向数据流防护与 100% 可覆盖的单元测试率。
:::
