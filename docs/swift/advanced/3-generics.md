---
sidebar_position: 3
---

# 泛型 (Generics)

泛型代码能让你根据自定义的需求，编写出适用于任意类型的、灵活可重用的函数和类型。

## 泛型函数

```swift
func swapTwoValues<T>(_ a: inout T, _ b: inout T) {
    let temporaryA = a
    a = b
    b = temporaryA
}
```

## 泛型类型

你可以定义泛型类、结构体和枚举。

```swift
struct Stack<Element> {
    var items: [Element] = []
    
    mutating func push(_ item: Element) {
        items.append(item)
    }
    
    mutating func pop() -> Element {
        return items.removeLast()
    }
}
```

## 关联类型 (Associated Types)

在协议中，关联类型为协议中的某个类型提供了一个占位符。

```swift
protocol Container {
    associatedtype Item
    mutating func append(_ item: Item)
    var count: Int { get }
    subscript(i: Int) -> Item { get }
}
```
