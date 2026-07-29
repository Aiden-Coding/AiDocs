---
sidebar_position: 6
---

# 错误处理与 Result 类型

Swift 提供了完善的错误处理机制，通过显示标记和强制捕获来确保运行时的强安全性。同时，配合标准库中的 `Result` 类型，能够优雅地应对同步与异步任务中的异常流。

---

## 1. Swift 错误处理模型 (`Error` 协议)

在 Swift 中，错误通常由遵循 `Error` 空协议的枚举（Enum）来表示：

```swift
enum NetworkError: Error {
    case invalidURL
    case timeout
    case serverError(code: Int)
}
```

### 1.1 抛出与捕获错误 (`throws` 与 `do-catch`)

使用 `throw` 关键字抛出错误，函数签名需加上 `throws`：

```swift
func fetchData(urlStr: String) throws -> String {
    guard let url = URL(string: urlStr) else {
        throw NetworkError.invalidURL
    }
    // 模拟服务器错误
    throw NetworkError.serverError(code: 500)
}

// 捕获错误
do {
    let result = try fetchData(urlStr: "https://example.com")
    print("Success: \(result)")
} catch NetworkError.invalidURL {
    print("URL 格式错误")
} catch NetworkError.serverError(let code) {
    print("服务器响应异常，状态码: \(code)")
} catch {
    print("其他错误: \(error)")
}
```

---

## 2. 表达式选项：`try?` 与 `try!`

- **`try?`**：将抛出的错误转化为可选值（`Optional`）。成功返回 `Optional(Value)`，抛出错误则返回 `nil`，无须匹配 `do-catch`。
- **`try!`**：禁用错误传递，断言该操作绝对不会失败。若发生错误，程序将直接触发运行时崩溃（Crash）。

```swift
// 安全解析：若失败则返回 nil
let data: String? = try? fetchData(urlStr: "invalid-url")

// 强行解包：仅用于绝对可信的场景（如本地 Bundle 中的打包资源）
let config = try! loadLocalBundleConfig()
```

---

## 3. 高级关键字：`rethrows` 与 `defer`

### 3.1 `rethrows`（重抛错误）

当函数接受一个可能抛出错误的闭包作为参数时，可以使用 `rethrows`。**仅当传入的闭包抛出错误时，该函数才会抛出错误**。

```swift
extension Array {
    // 只有当 transform 闭包抛出错误时，myMap 才会 throws
    func myMap<T>(_ transform: (Element) throws -> T) rethrows -> [T] {
        var result = [T]()
        for item in self {
            result.append(try transform(item))
        }
        return result
    }
}
```

### 3.2 `defer`（延迟清理块）

`defer` 保证代码块在当前作用域退出之前（无论是正常返回、抛出错误还是提前 `return`）一定会执行，常用于资源释放或解锁。

```swift
func processFile(path: String) throws {
    let file = openFile(path)
    defer {
        closeFile(file) // 确保文件句柄必定被关闭
    }
    
    try readFileData(file)
}
```

---

## 4. `Result<Success, Failure>` 范式

`Result` 是 Swift 标准库定义的泛型枚举，专门用在**避免抛错机制过重**或**经典回调闭包**中：

```swift
enum Result<Success, Failure: Error> {
    case success(Success)
    case failure(Failure)
}
```

### 4.1 函数式转换与应用

`Result` 支持类似 Optional 的高阶函数映射：

```swift
func fetchUser(id: Int, completion: @escaping (Result<String, NetworkError>) -> Void) {
    // 异步任务响应
    completion(.success("UserA"))
}

// 使用 map / flatMap 转换结果
fetchUser(id: 101) { result in
    let formattedResult = result.map { name in
        "Username: \(name.uppercased())"
    }
    
    switch formattedResult {
    case .success(let text):
        print(text)
    case .failure(let error):
        print("Fetch failed: \(error)")
    }
}
```

:::tip 现代 Swift 迁移提示
在 Swift 5.5+ 现代并发机制下，优先推荐将回调式的 `Result` 替换为 `async throws` 函数，代码将更加扁平自然。
:::
