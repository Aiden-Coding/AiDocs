---
sidebar_position: 3
---

# 函数与闭包 (Functions and Closures)

函数是执行特定任务的独立代码块，而闭包（Closures）则是可以捕获其上下文中常量的自包含代码块。在 Swift 中，函数其实是一等公民（First-class citizen），这意味着它们可以像普通变量一样被传递和返回。

## 1. 函数设计与参数机制

Swift 允许同时拥有**参数标签 (Argument Labels)** 和**参数名称 (Parameter Names)**，这使得函数调用读起来像自然的英语句子，极大地增强了 API 的自描述能力。

```swift
// 'with' 是参数标签，调用时可见；'metadata' 是参数名称，函数内部可见
func upload(data: Data, with metadata: [String: String]) {
    // 内部使用 metadata
    print("Uploading \(data.count) bytes... Details: \(metadata)")
}

// 外部调用就像自然语言：upload data with metadata
upload(data: Data(), with: ["contentType": "image/png"])
```

### 原理解析：Inout 内存模型 (Copy-In Copy-Out)

当你需要函数修改外部变量且能在函数结束后生效时，会使用 `inout` 关键字。很多人直觉以为它是传递了内存指针，但实质上 Swift 采用的是**Copy-In Copy-Out (基于值调用的实质化传递)** 机制：
1. **Copy-In**: 函数调用时，实参的值被复制一份副本传入。
2. **Mutate**: 函数内部修改的是这个副本。
3. **Copy-Out**: 函数返回时，副本的值被“写回”到最初的实参内存地址中。
这种设计避免了多线程里由于直接指针共享带来的竞争问题，维持了值类型的高级内存安全。

```swift
func swapValues(_ a: inout Int, _ b: inout Int) {
    let temp = a
    a = b
    b = temp
}
```

## 2. 闭包与逃逸闭包 (@escaping)

闭包常常被用于异步回调。如果在将一个闭包当作参数传递给函数时，该闭包在函数**返回之后**才被系统调用，我们称该闭包发生了**逃逸 (Escape)**。Swift 强制此时必须在参数类型前加上 `@escaping` 标记。

### 工程实战：网络请求与打破循环引用 (Retain Cycle)

在传统的基于 Closure 回调的网络框架中，最大的地雷就是闭包在不经意间强捕获了 `self`，导致视图控制器或服务类无法被 ARC 内存管理系统释放，产生永久**内存泄漏**。

```swift
class ProfileViewController: UIViewController {
    var userProfile: UserProfile?
    let networkService = NetworkService()

    func fetchUserData() {
        // networkService.request 是个异步发信方法，会随时回调闭包 -> @escaping 闭包
        // [weak self] 是捕获列表(Capture List)，用于打破强引用循环
        networkService.request(endpoint: "/users/me") { [weak self] result in
            // 在异步子线程的回调中，首先对 self 进行强弱引用转换 (Strong-Weak Dance)
            // 防止执行中途所在控制器被销毁导致野指针崩溃
            guard let self = self else { return }
            
            switch result {
            case .success(let data):
                self.userProfile = parse(data)
                // 确保在主线程更新 UI 元素
                DispatchQueue.main.async {
                    self.updateUI()
                }
            case .failure(let error):
                print("Error fetching profile: \(error)")
            }
        }
    }
    
    func updateUI() { /* ... */ }
}
```

:::danger 内存泄漏红线
当编译器发现你在逃逸闭包中无意访问了 `self.` 的属性时，它会抛出错误并强制你明文写出 `self.`。这是 Swift 的防呆机制——它在严厉警告你**注意保留环 (Retain Cycle)**。永远在可能长期存活的闭包环境中使用 `[weak self]` 或 `[unowned self]` 打破循环。
:::

:::note 现代 Swift 并发的演进
虽然理解逃逸闭包及 `[weak self]` 对于维护现有项目至关重要，但从 Swift 5.5 开始，Apple 推出了属于未来的特性： `async/await`。使用这种现代并发机制做网络请求，你将彻底告别回调嵌套与繁琐的弱引用捕获（相关工程实践将在「进阶篇」中展开）。
:::
