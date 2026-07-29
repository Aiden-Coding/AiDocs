---
sidebar_position: 4
---

# ARC 与内存管理

Swift 使用**自动引用计数 (Automatic Reference Counting, ARC)** 来追踪和管理应用中的堆内存使用情况。与垃圾回收（Garbage Collection, GC）机制不同，ARC 在编译期自动插入强引用的保留（Retain）与释放（Release）指令，具有运行时开销小、内存释放及时的特点。

---

## 1. ARC 运行机制与原理

每当你创建一个类的实例时，ARC 会在堆上为其分配一块内存，其中包含实例的元数据以及一个**引用计数器 (Reference Counter)**。

- **创建/强引用**：当实例赋值给变量、常量或属性时，引用计数 $+1$。
- **断开引用**：当变量超出作用域、被设为 `nil` 或指向其他实例时，引用计数 $-1$。
- **内存回收**：当引用计数降至 $0$ 时，ARC 会立即调用 `deinit` 析构器，并销毁该实例释放堆内存。

---

## 2. 强引用环 (Strong Reference Cycles)

当两个或多个类实例互相保持强引用（Strong Reference）时，会导致两者的引用计数永远无法降为 $0$，从而引发**内存泄漏 (Memory Leak)**。

### 2.1 对象间的强引用环

```swift
class Person {
    let name: String
    var apartment: Apartment? // 强引用
    init(name: String) { self.name = name }
    deinit { print("\(name) 被销毁") }
}

class Apartment {
    let unit: String
    var tenant: Person? // 强引用
    init(unit: String) { self.unit = unit }
    deinit { print("Apartment \(unit) 被销毁") }
}

var john: Person? = Person(name: "John")
var unit4A: Apartment? = Apartment(unit: "4A")

john?.apartment = unit4A
unit4A?.tenant = john

// 置空指针后，两者的引用计数均为 1，deinit 绝不会被触发！
john = nil
unit4A = nil
```

### 2.2 闭包引起的循环引用

闭包如果捕获了 `self` 的强引用，且该闭包本身被 `self` 的属性所持有，也会形成强引用环：

```swift
class HTMLElement {
    let name: String
    let text: String?
    
    // 闭包属性持有了 self
    lazy var asHTML: () -> String = {
        if let text = self.text {
            return "<\(self.name)>\(text)</\(self.name)>"
        } else {
            return "<\(self.name)/>"
        }
    }
}
```

---

## 3. 弱引用 (`weak`) 与 无主引用 (`unowned`)

为了打破强引用环，Swift 提供了 `weak` 和 `unowned` 两种捕获修饰符。

### 3.1 弱引用 (`weak`)

- **定义**：不会增加实例的引用计数。
- **类型**：必须声明为**可空变量 (`var Optional`)**。
- **底层原理**：当引用的对象被销毁时，ARC 会自动通过 Side Table（侧表）将该 `weak` 属性**自动置为 `nil`**。

```swift
class Apartment {
    let unit: String
    weak var tenant: Person? // 弱引用，打破循环
    init(unit: String) { self.unit = unit }
}
```

### 3.2 无主引用 (`unowned`)

- **定义**：假定引用的实例在生命周期内**永远不会变成 `nil`**。
- **类型**：非可选类型（Non-optional）。
- **风险**：若引用的实例已销毁，访问 `unowned` 引用将触发运行时 Crash（野指针野引用悬挂）。

```swift
class Customer {
    let name: String
    var card: CreditCard?
    init(name: String) { self.name = name }
}

class CreditCard {
    let number: UInt64
    unowned let customer: Customer // 信用卡必定属于某个顾客
    init(number: UInt64, customer: Customer) {
        self.number = number
        self.customer = customer
    }
}
```

### 3.3 闭包捕获列表 (Capture List)

解决闭包循环引用的工程标准写法：

```swift
lazy var asHTML: () -> String = { [weak self] in
    guard let self = self else { return "" }
    return "<\(self.name)>\(self.text ?? "")</\(self.name)>"
}
```

---

## 4. 内存泄漏诊断工程实战

### 4.1 Memory Graph Debugger ( Xcode 内存图)

在 Xcode 运行调试时，点击控制台顶部的 **Memory Graph** 图标。如果节点出现黄色感叹号，即表示产生了泄漏的对象拓扑树。

### 4.2 Instruments (Leaks 工具)

使用 Xcode 工具链集成的 **Instruments -> Leaks** 模板，可以在运行时实时捕捉并输出循环引用的完整对象调用堆栈。
