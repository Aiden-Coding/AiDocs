---
sidebar_position: 1
---

# Swift Package Manager (SPM)

Swift Package Manager (SPM) 曾经只是用于 Server-side Swift 的依赖管理工具，但随着 Xcode 11 的深度集成和 Apple生态的完善，它现在已经完全取代了 CocoaPods 和 Carthage，成为管理 iOS / macOS 项目源代码、二进制依赖分发构建的**官方绝对标准**。

## 1. Package.swift 核心结构

SPM 的独特之处在于它使用 Swift 语言本身来编写配置文件（基于 `PackageDescription` 模块）。所有的依赖关系、对外暴露的产品（Products）和内部组织的靶标（Targets）都在这里被强类型声明。

```swift
// swift-tools-version:5.7
// 上推注释声明了编译此清单所依赖的最低 Swift 工具链版本

import PackageDescription

let package = Package(
    name: "EnterpriseNetworking",
    
    // 决定该包提供哪些可以被外部其他包或应用 Import 导入的实体库
    products: [
        .library(
            name: "EnterpriseNetworking",
            targets: ["EnterpriseNetworking"] // 至少绑定一个同名或相关的 target
        ),
    ],
    
    // 声明本项目所需的外部第三方图谱
    dependencies: [
        .package(url: "https://github.com/Alamofire/Alamofire.git", .upToNextMajor(from: "5.6.0")),
        // 从 Swift 5.6 开始支持插件体系 (如格式化工具)
        .package(url: "https://github.com/nicklockwood/SwiftFormat", from: "0.50.0")
    ],
    
    // 真正的代码组织单元结构（类似于 Xcode 内部的 Target）
    targets: [
        .target(
            name: "EnterpriseNetworking",
            dependencies: [
                // 绑定第三方包的具体产品
                .product(name: "Alamofire", package: "Alamofire")
            ],
            // 为纯净的跨平台开发提供编译宏支持
            swiftSettings: [
                .define("ENABLE_NEW_API", .when(configuration: .debug))
            ]
        ),
        
        // 测试单元隔离
        .testTarget(
            name: "EnterpriseNetworkingTests",
            dependencies: ["EnterpriseNetworking"]
        ),
    ]
)
```

### 深入原理：依赖解析与校验 (Resolution & graph)
当你执行构建或通过 Xcode 打开包含 SPM 的项目时，工具链会执行图依赖解析（Dependency Resolution）。它会下载相关库，根据 `Package.swift` 指定的版本控制约束（如 `.upToNextMajor`）拉取并计算出一个安全且**无冲突的锁定图**（记录在 `Package.resolved` 文件中）。

:::warning 永远不要把 Package.resolved 移出版本控制
与 CocoaPods 中的 `Podfile.lock` 一样，`Package.resolved` 是保证所有开发者和 CI 环境 (Continuous Integration) 构建出完全一致二进制文件的“定海神针”。如果它不被 git 跟踪，那么你的环境将在不同机器上发生极其诡异的变化（如某个库的次版本被静默升华引发 bug）。
:::

## 2. 工程实战：利用本地依赖（Local Packages）推行模块化架构

以前 iOS 项目模块化（组件化）往往依赖庞杂的多工程 Workspace 或自建私有 Pod 仓库，现在通过 SPM 本地包，可以将巨石型项目迅速进行超轻量级拆分。

```text
// 你的项目层级结构：
MyApp/
├── MyApp.xcodeproj
├── Sources/...
└── LocalPackages/
    ├── UIComponents/         (拥有独立的 Package.swift)
    └── CoreNetworking/       (拥有独立的 Package.swift)
```

开发者只需要把 `UIComponents` 文件夹拖入 Xcode 项目导航器，该包就会被识别。这种做法带来的红利包括：
- **更快的编译速度**：未修改的本地 SPM 库能够生成被重用的缓存。
- **边界与访问控制隔离**：不同包之间通过 `public` 和 `internal` 严格区隔代码可见性，有效制止全局单例和非法引用的互相污染。

:::tip 二进制分发 (Binary Targets)
如果你需要分发包含闭源核心算法的 SDK（如金融底层通信与加密），SPM 完全支持引入 `.xcframework`。只需使用 `.binaryTarget(name: "SecretLib", url: "https://...", checksum: "...")`，就能享受到与源码分发同样便捷的版本管理。
:::

