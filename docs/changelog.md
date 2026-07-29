---
title: 更新记录
sidebar_label: 更新记录
sidebar_position: 2
---

# 🔄 更新记录

记录 **AiDocs** 知识库每一次内容迭代、新增专栏和深度优化的动态。

---

## 📅 2026 年

### 7 月

#### ✨ [新增] Swift 原生开发专栏全体系重构与扩展

- **影响/发布专题**：重构并新增 [Swift 专栏](swift/0-readme.md) 下全套系统化技术文档。
- **核心升级与新章节**：
  - [Swift 学习路线指南](swift/0-readme.md)：重新梳理并整理从基础、进阶到框架与架构的三层系统化学习图谱（包含 23 个核心与进阶专题）。
  - **基础篇**：新增 [集合类型与 COW 写时复制](swift/0-basic/4-collections-and-cow.md)、[结构体与类](swift/0-basic/5-structs-and-classes.md)、[错误处理与 Result 类型](swift/0-basic/6-error-handling.md) 以及 [访问控制与编译优化](swift/0-basic/7-access-control-and-optimization.md)（五级访问控制矩阵、`@inlinable` 跨模块内联与 WMO 全模块优化）。
  - **进阶篇**：新增 [ARC 与内存管理](swift/1-advanced/4-arc-and-memory-management.md)、[Actor 与结构化并发](swift/1-advanced/5-actors-and-structured-concurrency.md)、[属性包装器与 Swift 宏](swift/1-advanced/6-property-wrappers-and-macros.md)、[Unsafe Swift 与 C/C++ 互操作](swift/1-advanced/7-unsafe-swift-and-interop.md)（裸内存指针、`withUnsafeBytes` 与 Swift 5.9+ C++ Interop 原生双向桥接）以及 [KeyPath、反射与 Result Builders](swift/1-advanced/8-keypath-reflection-and-result-builders.md)（`KeyPath` 强类型引用、`Mirror` 反射与 `@resultBuilder` 自定义 DSL）。
  - **生态与框架篇**：新增 [SwiftUI 状态管理与数据流](swift/2-frameworks/3-swiftui-data-flow.md)、[Combine 与 AsyncSequence](swift/2-frameworks/4-combine-and-async-sequence.md)、[Swift 应用架构与工程实战](swift/2-frameworks/5-app-architecture.md)、[SwiftUI 布局与 UIKit 桥接](swift/2-frameworks/6-swiftui-layout-and-uikit-interop.md)（布局三步协商算法、iOS 16+ `Layout` 协议与 UIKit 混编）、[网络与持久化 (Codable & SwiftData)](swift/2-frameworks/7-networking-and-persistence.md)（`Codable` 自定义序列化、URLSession 现代网络层与 iOS 17+ SwiftData 持久化）以及 [现代测试与 Instruments 诊断调优](swift/2-frameworks/8-testing-and-diagnostics.md)（Swift 6 `import Testing` `#expect`/`#require` 断言与 Time Profiler/Leaks/SwiftUI Profiler 诊断）。

#### ⚡ [重构] 全栈 AI 模块小白无痛入门全面重构与升级

- **影响/发布专题**：重构 [docs/ai/](ai/0-readme.md) 下全部 AI 技术文档。
- **核心升级与优化细节**：
  - [AI 学习路线导航](ai/0-readme.md)：新增零基础小白“应用 $\rightarrow$ 理论 $\rightarrow$ 业务 $\rightarrow$ 微调”四步走路线图、硬件显存与依赖指南，及高频 AI 术语“小白通俗字典”。
  - [01. 数学与 Python 编程基础](ai/01-fundamentals/0-readme.md)：拆分为 [Python 科学计算 (NumPy/Pandas)](ai/01-fundamentals/1-python-numpy-pandas.md)、[直观线性代数与概率论](ai/01-fundamentals/2-math-for-ai.md) 和 [PyTorch 张量与自动求导](ai/01-fundamentals/3-pytorch-basics.md)。
  - [02. 机器学习与深度学习](ai/02-ml-and-dl/0-readme.md)：拆分为 [经典机器学习入门](ai/02-ml-and-dl/1-classical-ml-intro.md)、[手写多层感知机 (MLP)](ai/02-ml-and-dl/2-neural-network-from-scratch.md) 和 [Transformer 与 Attention 全解](ai/02-ml-and-dl/3-transformer-and-attention.md)。
  - [03. 大语言模型 LLM 核心](ai/03-llm-core/0-readme.md)：拆分为 [Prompt 工程指南](ai/03-llm-core/1-prompt-engineering-guide.md)、[Tokenizer 与 LLM 架构](ai/03-llm-core/2-tokenization-and-architecture.md) 和 [LoRA/QLoRA 微调实战](ai/03-llm-core/3-peft-lora-qlora-practice.md)。
  - [04. RAG 与向量数据库](ai/04-rag-and-vector/0-readme.md)：拆分为 [RAG 基础与切分策略](ai/04-rag-and-vector/1-rag-basics-and-chunking.md)、[Embedding 与 Chroma 向量库](ai/04-rag-and-vector/2-vector-database-and-embedding.md) 和 [混合检索与 Rerank](ai/04-rag-and-vector/3-advanced-rag-and-rerank.md)。
  - [05. AI Agent 智能体开发](ai/05-agent-development/0-readme.md)：拆分为 [Agent 架构与 Tool Calling](ai/05-agent-development/1-agent-architecture-overview.md)、[ReAct 与 LangChain 基础](ai/05-agent-development/2-react-and-langchain.md) 和 [LangGraph 状态图 Agent](ai/05-agent-development/3-langgraph-stateful-agents.md)。
  - [06. MLOps & LLMOps](ai/06-mlops-llmops/0-readme.md)：拆分为 [Ollama 本地私有化部署](ai/06-mlops-llmops/1-local-llm-ollama.md)、[vLLM 推理加速](ai/06-mlops-llmops/2-vllm-inference-acceleration.md) 和 [模型量化与监控](ai/06-mlops-llmops/3-quantization-and-monitoring.md)。

#### ✨ [新增] 2026 Java 后端核心考点突击指南

- **发布专题**：新增 [interview/java/0-intro.md](interview/java/0-intro.md)，涵盖全新 70 道大厂高频面试真题与源码级解构。
- **核心考点**：直击 Java 21/25 虚拟线程底层调度、Spring Boot 4.0 升级指南、GraalVM 静态编译以及 Java 与 LLM 结合的 AI 工程化落地。

#### ⚡ [优化] MySQL & Redis 深度优化

- **MySQL 专栏**：重构 [InnoDB MVCC 机制](database/mysql/0-core/2-mvcc-locks.md) 章节。补充 Read View 隔离算法决策树和 Undo Log 回滚段的物理存储拓扑图。
- **Redis 专栏**：优化 [Redis 哨兵与 Cluster 集群](cache/redis/3-highavailability.md) 的底层选举算法分析。

---

### 6 月

#### ✨ [新增] 分布式一致性协议与锁

- **Raft 算法**：新增 [Paxos 与 Raft 共识算法](distributed/system/2-consensus.md) 章节。包含 Leader 选举、日志复制以及网络分区（Brain-split）脑裂应对策略的深度推演。
- **ZooKeeper 锁**：新增 [基于 ZooKeeper 临时顺序节点的排他锁实现](distributed/system/1-lock-zookeeper.md)。包含 Curator 源码分析。

#### ⚡ [优化] Rust 内存安全大图谱

- **生命周期**：优化 [所有权借用检查器与生命周期约束](rust/04-understanding-ownership/ch04-01-what-is-ownership.md) 的编译期检测推导图。
- **高级特性**：补全 [Send 与 Sync 约束](rust/16-concurrency/ch16-00-concurrency.md) 下的多线程无锁并发安全性论证。

---

### 5 月

#### 🌱 项目初始化

- **项目成立**：**AiDocs** 硬核技术知识库立项，构建 Java、MySQL、Redis、分布式系统、Rust 等系统化的底层原理知识库。
- **骨架配置**：完成 Docusaurus 3 框架搭建，集成 KaTeX 数学公式渲染和 Mermaid 流程图引擎。
