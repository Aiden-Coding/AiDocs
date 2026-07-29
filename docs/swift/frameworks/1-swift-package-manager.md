---
sidebar_position: 1
---

# Swift Package Manager (SPM)

Swift Package Manager 是用于管理源代码的分发、构建的一系列官方工具集合。

## Package.swift 配置文件

依赖项和目标信息都在 `Package.swift` 文件中管理。

```swift
// swift-tools-version:5.5
import PackageDescription

let package = Package(
    name: "MyLibrary",
    products: [
        .library(name: "MyLibrary", targets: ["MyLibrary"]),
    ],
    dependencies: [
        // 声明外部库依赖
        .package(url: "https://github.com/Alamofire/Alamofire.git", .upToNextMajor(from: "5.4.0"))
    ],
    targets: [
        .target(
            name: "MyLibrary",
            dependencies: ["Alamofire"]),
        .testTarget(
            name: "MyLibraryTests",
            dependencies: ["MyLibrary"]),
    ]
)
```
