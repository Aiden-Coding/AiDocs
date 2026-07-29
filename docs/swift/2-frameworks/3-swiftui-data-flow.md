---
sidebar_position: 3
---

# SwiftUI 状态管理与数据流

SwiftUI 是一个声明式、状态驱动的 UI 框架。在 SwiftUI 中，“**UI 是状态的函数 ($UI = f(State)$)**”。正确理解各种属性包装器（State Property Wrappers）的作用域与生命周期，是构建稳定大厂级 iOS 应用的关键。

---

## 1. SwiftUI 状态属性包装器全景矩阵

| 属性包装器 | 数据所有权 | 适用场景 | 状态范围 |
| :--- | :--- | :--- | :--- |
| **`@State`** | 当前 View 独占 | 值类型 (String, Int, Struct) | 视图私有局部状态 |
| **`@Binding`** | 共享引用（不拥有数据） | 建立子视图与父视图状态的双向绑定 | 读写传递 |
| **`@StateObject`** | 当前 View 创建并**拥有** | 引用类型 (`ObservableObject`) | 视图树全生命周期对象 |
| **`@ObservedObject`**| 外部传入（不拥有生命周期） | 引用类型，仅用于观察通知 | 依赖外部管理的对象 |
| **`@EnvironmentObject`**| 全局/环境隐式注入 | 贯穿深层视图树的全局共享状态 | 跨组件传递 |
| **`@Observable`** | iOS 17+ 现代宏 | 结构化对象属性追踪 | 细粒度精准刷新 |

---

## 2. 状态传递机制实战

### 2.1 局部状态与双向绑定 (`@State` + `@Binding`)

`@State` 在 View 内部存储数据。当需要将状态传给子视图并允许子视图修改时，使用指针形式的 `$` 传递给 `@Binding`：

```swift
struct ParentView: View {
    @State private var isToggleOn = false
    
    var body: some View {
        VStack {
            Text("State: \(isToggleOn ? "ON" : "OFF")")
            // 使用 $ 传递 Binding
            ChildToggleView(isOn: $isToggleOn)
        }
    }
}

struct ChildToggleView: View {
    @Binding var isOn: Bool
    
    var body: some View {
        Toggle("Switch", isOn: $isOn)
    }
}
```

### 2.2 引用对象生命周期 (`@StateObject` vs `@ObservedObject`)

- **`@StateObject`**：SwiftUI 会在其宿主 View 重绘销毁重建时，**保持该对象的单例生命周期**，防止反复重新初始化。
- **`@ObservedObject`**：不会管理生命周期。父视图重绘会导致它被频繁毁建。

```swift
class UserDataModel: ObservableObject {
    @Published var name = "Alice"
}

struct ProfileContainerView: View {
    // 首次实例化并持有生命周期
    @StateObject private var viewModel = UserDataModel()
    
    var body: some View {
        ProfileDetailView(viewModel: viewModel)
    }
}

struct ProfileDetailView: View {
    // 仅接收观察，生命周期由父视图的 @StateObject 托管
    @ObservedObject var viewModel: UserDataModel
    
    var body: some View {
        Text("User: \(viewModel.name)")
    }
}
```

---

## 3. iOS 17+ 现代 Observation 框架 (`@Observable`)

在 iOS 17 / Swift 5.9 中，Apple 推出了全新的 **Observation 框架**，用以全面替代传统的 `ObservableObject` 与 `@Published` 组合。

### 3.1 核心改进与优势

1. **无需 `@Published`**：类的所有可变属性默认均可自动被跟踪。
2. **细粒度按需重绘**：SwiftUI 视图只会在其 `body` 中真正访问到的属性发生变化时才触发刷新（以往是只要对象内任一 `@Published` 改变就刷新整个视图）。
3. **简化语法**：直接使用普通的 `@State` 或 `@Bindable` 即可。

```swift
import SwiftUI
import Observation

// 1. 使用 @Observable 宏修饰类
@Observable
class ModernProfileViewModel {
    var name: String = "Alice"
    var score: Int = 100
}

struct ModernProfileView: View {
    // 2. 直接使用 @State 管理类对象
    @State private var viewModel = ModernProfileViewModel()
    
    var body: some View {
        VStack {
            // 视图仅在 name 变化时刷，score 变化不会引发此处的无效重写！
            Text("Name: \(viewModel.name)")
            
            // 3. 使用 @Bindable 快速获取属性的双向绑定
            BindableSubView(viewModel: viewModel)
        }
    }
}

struct BindableSubView: View {
    @Bindable var viewModel: ModernProfileViewModel
    
    var body: some View {
        TextField("Name", text: $viewModel.name)
    }
}
```

:::tip 升级落地指导
- iOS 16 及以下项目：继续使用 `@StateObject` + `ObservableObject`。
- iOS 17+ 升级目标：迁移至 `@Observable`，消灭模板代码，享受更高的 Render 性能。
:::
