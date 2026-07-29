---
sidebar_position: 1
---

# 现代 Swift 并发 (async/await)

从 Swift 5.5 开始，Swift 引入了原生的异步与并发机制，大大简化了回调地狱，并提高了执行效率。

## 异步函数定义

```swift
func fetchPhoto(named name: String) async throws -> Photo {
    // 异步加载图片的代码
}
```

## 使用 await 调用

```swift
Task {
    do {
        let photo = try await fetchPhoto(named: "sunrise")
        print("Fetched photo: \(photo)")
    } catch {
        print("Fetch failed: \(error)")
    }
}
```

## Actor 的使用

`actor` 是一种引用类型，专门用于解决并发环境下的数据竞争问题。

```swift
actor TemperatureLogger {
    var max: Int = 0
    
    func update(with measurement: Int) {
        if measurement > max {
            max = measurement
        }
    }
}
```
