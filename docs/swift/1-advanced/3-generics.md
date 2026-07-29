---
sidebar_position: 3
---

# 泛型与类型擦除 (Generics)

泛型 (Generics) 是让 Swift 能够兼顾“强类型安全”与“高度复用性”的基石。在日益复杂的 iOS 应用开发和基础库抽象中，深刻理解泛型的编译时行为，以及现代 Swift (5.6 及之后) 引入的 `some` 和 `any` 关键字区别，是迈向高级架构师的必经之路。

## 1. 泛型函数与集合应用

通过参数化类型，你可以省去大量功能重复但参数不一致的冗余代码。Swift 标准库的 `Array` 和 `Dictionary` 本质上就是泛型的巅峰运用。

```swift
// T 被约束为必须遵循 Comparable 协议
func findLargest<T: Comparable>(in array: [T]) -> T? {
    guard !array.isEmpty else { return nil }
    var largest = array[0]
    for element in array {
        if element > largest {
            largest = element
        }
    }
    return largest
}
```

## 2. 深入原理：any 与 some (Existential vs Opaque)

很久以来，在协议名作为类型使用时，开发者很难判断当前是在操作一个具体的**泛型编译实体**，还是一个在运行时打包的**装箱类型**。因此 Swift 引入了强制的关键字。

### any 关键字 (存在类型 / Type Erasure)
当你看到 `let service: any NetworkService` 时，这代表了**动态派发**。
它在内存中其实是一个“盒子”（Existential Container），前三个字存放值本身或堆指针，再配上类型描述表（VWT）和协议目击表（PWT）。这会带来堆分配和动态派发的轻微性能损耗，但换来了“可以把完全不同底层类型的实例，塞进同一种协议数组里”的极高灵活性。

### some 关键字 (不透明返回类型 / Opaque Type)
当你看到 `func fetchView() -> some View` 时，这代表了**静态派发**。
它告诉编译器：“这个方法一定会返回一个符合 `View` 协议的具体类型，至于到底是什么，对调用者隐蔽（Opaque），但**编译器底层对真实类型了如指掌**。” 这样可以直接展开内联化，没有动态分配的开销！这也是 SwiftUI 极其高效渲染的原因。

:::tip any 还是 some？
日常业务开发中牢记性能铁律：**优先使用 `some` (泛型约束)**，只有当你需要在集合如 `[any Animal]` 中装载不同实现类（如 Dog 和 Cat 共存）面临编译报错时，才退化使用 `any`（存在类型）。
:::

## 3. 工程实战：通用本地缓存模块设计

泛型结合关联类型 (Associated Types)，能构造出极具拓展性的业务模块。下面是一个利用泛型和缓存协议构造的基础设施代码：

```swift
// 定义具有泛型业务边界的仓库协议
protocol Repository {
    // 决定存进仓库里的是什么实体
    associatedtype Entity
    
    func save(_ item: Entity)
    func fetch(by id: String) -> Entity?
}

// 具体实现的通用内存缓存类
class MemoryCache<T>: Repository {
    typealias Entity = T
    
    private var storage: [String: T] = [:]
    
    func save(_ item: T) {
        // ... (省略对象序列化或提取主键等繁琐逻辑)
        print("Saving item of type \(T.self)")
    }
    
    func fetch(by id: String) -> T? {
        return storage[id]
    }
}

// 在外层服务构建针对“特定实体”的缓存
struct User { let id: String; let name: String }
let userCache = MemoryCache<User>()
userCache.save(User(id: "1", name: "Alice"))
```

:::note associatedtype 的传递
如果你需要将存在 `associatedtype` 的协议作为函数的直接返回值，老版本 Swift 会报 `Protocol can only be used as a generic constraint` 的经典错误。在最新版本中，你只需要写 `func buildRepo() -> any Repository<User>` (Primary Associated Types 特性) 就可以优美地绕过。
:::
