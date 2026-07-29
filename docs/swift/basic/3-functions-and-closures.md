---
sidebar_position: 3
---

# 函数与闭包 (Functions and Closures)

函数是执行特定任务的独立代码块。闭包是自包含的函数代码块，可以在代码中被传递和使用。

## 函数定义与调用

```swift
func greet(person: String) -> String {
    let greeting = "Hello, " + person + "!"
    return greeting
}
print(greet(person: "Anna"))
```

## 参数标签

Swift 函数可以同时拥有**参数标签**（用于调用时）和**参数名称**（用于函数体内部）。

```swift
func greet(to person: String, naturally: Bool = true) {
    if naturally {
        print("Hello, \(person)!")
    } else {
        print("GREETINGS, \(person).")
    }
}
greet(to: "Bill")
```

## 闭包表达式

闭包可以捕获其所在上下文的常量和变量。Swift 提供了优雅的尾随闭包语法。

```swift
let names = ["Chris", "Alex", "Ewa", "Barry", "Daniella"]
let reversedNames = names.sorted { $0 > $1 }
```
