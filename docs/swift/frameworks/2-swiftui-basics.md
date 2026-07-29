---
sidebar_position: 2
---

# SwiftUI 基础

SwiftUI 是 Apple 推出的一种极其简单的、用于跨 Apple 平台构建用户界面的声明式框架。

## 声明式视图

在 SwiftUI 中，视图（View）是一个协议，只需实现 `body` 属性即可描述界面的外观。

```swift
import SwiftUI

struct ContentView: View {
    var body: some View {
        VStack {
            Image(systemName: "globe")
                .imageScale(.large)
                .foregroundColor(.accentColor)
            Text("Hello, world!")
        }
        .padding()
    }
}
```

## 状态管理 (@State)

SwiftUI 使用 `@State` 等属性包装器来管理界面的状态，状态改变时界面自动刷新。

```swift
struct CounterView: View {
    @State private var count = 0

    var body: some View {
        Button("Tap count: \(count)") {
            count += 1
        }
    }
}
```
