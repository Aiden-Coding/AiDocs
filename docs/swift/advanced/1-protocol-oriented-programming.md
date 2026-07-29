---
sidebar_position: 2
---

# 面向协议编程 (POP)

Swift 是一门面向协议编程的语言。与传统的基于继承的面向对象思想不同，Swift 提倡通过协议来组合功能。

## 协议的定义

```swift
protocol FullyNamed {
    var fullName: String { get }
}
```

## 协议的扩展

利用协议扩展，不仅可以提供方法、属性的类型声明，还可以提供默认实现。

```swift
extension FullyNamed {
    func sayHello() {
        print("Hello, \(fullName)")
    }
}
```
