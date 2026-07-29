---
sidebar_position: 2
---

# 控制流 (Control Flow)

Swift 提供了所有基础的控制流语句，包括 `for-in` 循环，`while` 循环，以及 `if` 和 `switch` 条件语句。

## For-In 循环

你可以使用 `for-in` 循环来遍历序列，例如数组元素、字典的键值对或字符串中的字符。

```swift
let names = ["Anna", "Alex", "Brian", "Jack"]
for name in names {
    print("Hello, \(name)!")
}
```

## Switch 语句

Swift 的 `switch` 语句极其强大，支持模式匹配，且默认是不贯穿（fallthrough）的，必须穷尽所有可能的情况。

```swift
let someCharacter: Character = "z"
switch someCharacter {
case "a":
    print("The first letter of the alphabet")
case "z":
    print("The last letter of the alphabet")
default:
    print("Some other character")
}
```
