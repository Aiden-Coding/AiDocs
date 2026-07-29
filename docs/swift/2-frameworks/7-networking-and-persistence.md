---
sidebar_position: 7
---

# 网络与持久化 (Codable & SwiftData)

现代 Swift 应用的底层架构严重依赖**数据序列化 (Codable)**、**现代异步网络请求 (URLSession + async/await)** 以及**本地离线持久化 (SwiftData)**。三者构成了端到端数据流闭环。

---

## 1. `Codable` 高级序列化实战

`Codable` 是 `Encodable` 与 `Decodable` 协议组合的别名。对于非标准 JSON 数据格式，需要通过自定义扩展实现稳健解析。

### 1.1 自定义 `CodingKeys` 与蛇形转驼峰命名策略

当 API 返回蛇形命名（如 `user_id`）而 Swift 使用驼峰命名（`userId`）时，可以通过 `JSONDecoder.keyDecodingStrategy` 自动转换，或者显式定义 `CodingKeys` 属性映射：

```swift
struct UserProfile: Codable {
    let id: Int
    let username: String
    let avatarURL: URL?

    enum CodingKeys: String, CodingKey {
        case id = "user_id"
        case username = "screen_name"
        case avatarURL = "avatar_url"
    }
}

// 自动转换蛇形命名
let decoder = JSONDecoder()
decoder.keyDecodingStrategy = .convertFromSnakeCase
decoder.dateDecodingStrategy = .iso8601
```

### 1.2 自定义 `init(from decoder:)` 解析容错

在面对服务端不规范 JSON 数据（如某些数值字段偶尔返回字符串、缺失或类型不匹配）时，可重写初始化函数进行降级容错：

```swift
struct Article: Codable {
    let id: Int
    let title: String
    let viewsCount: Int

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = try container.decode(Int.self, forKey: .id)
        self.title = try container.decode(String.self, forKey: .title)

        // 兼容数值以 Int 或 String 形式返回的场景
        if let countInt = try? container.decode(Int.self, forKey: .viewsCount) {
            self.viewsCount = countInt
        } else if let countStr = try? container.decode(String.self, forKey: .viewsCount),
                  let countParsed = Int(countStr) {
            self.viewsCount = countParsed
        } else {
            self.viewsCount = 0 // 降级默认值
        }
    }
}
```

---

## 2. 基于 `URLSession` + `async/await` 现代网络层

结合 Swift 现代并发，可以基于 Actor 与范型构建具备**请求拦截、Token 自动刷新与指数退避重试**的网络 Client。

```swift
actor NetworkClient {
    private let session: URLSession

    init(session: URLSession = .shared) {
        self.session = session
    }

    func request<T: Decodable>(_ endpoint: Endpoint) async throws -> T {
        var request = endpoint.urlRequest

        // 1. 注入请求头拦截器 (Interceptor)
        request.addValue("Bearer token_xyz", forHTTPHeaderField: "Authorization")

        // 2. 发起异步网络请求
        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw NetworkError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw NetworkError.httpError(statusCode: httpResponse.statusCode)
        }

        // 3. JSON 解码
        return try JSONDecoder().decode(T.self, from: data)
    }
}
```

---

## 3. SwiftData 现代持久化 (iOS 17+)

**SwiftData** 是 Apple 在 iOS 17 推出的下一代持久化框架，彻底重构并替代了 Core Data。它原生融合 Swift 5.9+ 宏，采用纯 Swift 声明式语法定义数据模型与操作查询。

### 3.1 定义 `@Model` 数据实体与关联

使用 `@Model` 装饰器后， SwiftData 会自动在编译期生成 Core Data 映射元数据，且对象具备响应式观察能力：

```swift
import SwiftData
import Foundation

@Model
final class Note {
    @Attribute(.unique) var id: UUID
    var title: String
    var content: String
    var createdAt: Date

    // 级联删除一对多关联
    @Relationship(deleteRule: .cascade) var tags: [Tag] = []

    init(title: String, content: String) {
        self.id = UUID()
        self.title = title
        self.content = content
        self.createdAt = Date()
    }
}

@Model
final class Tag {
    var name: String
    var note: Note?

    init(name: String) {
        self.name = name
    }
}
```

### 3.2 在 SwiftUI 中配置与查询 (`@Query`)

```swift
import SwiftUI
import SwiftData

struct NotesListView: View {
    // 根据创建时间降序动态查询 Note 列表
    @Query(sort: \Note.createdAt, order: .reverse) private var notes: [Note]
    @Environment(\.modelContext) private var modelContext

    var body: some View {
        NavigationStack {
            List {
                ForEach(notes) { note in
                    VStack(alignment: .leading) {
                        Text(note.title).font(.headline)
                        Text(note.createdAt.formatted()).font(.caption).foregroundStyle(.secondary)
                    }
                }
                .onDelete(perform: deleteNotes)
            }
            .toolbar {
                Button("Add Note", action: addNote)
            }
        }
    }

    private func addNote() {
        let newNote = Note(title: "New Note", content: "SwiftData is awesome!")
        modelContext.insert(newNote) // 插入模型上下文
    }

    private func deleteNotes(at offsets: IndexSet) {
        for index in offsets {
            modelContext.delete(notes[index]) // 从持久化层移除
        }
    }
}
```

:::tip 存储容器初始化 (`.modelContainer`)
在 App 入口处挂载存储容器：`WindowGroup { ContentView() }.modelContainer(for: [Note.self, Tag.self])`，SwiftData 会自动在后台创建 SQLite 存储库并处理基础迁移。
:::
