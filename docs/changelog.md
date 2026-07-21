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

#### ✨ [新增] 2026 Java 后端核心考点突击指南

- **发布专题**：新增 [interview/java/0-intro.md](interview/java/0-intro.md)，涵盖全新 70 道大厂高频面试真题与源码级解构。
- **核心考点**：直击 Java 21/25 虚拟线程底层调度、Spring Boot 4.0 升级指南、GraalVM 静态编译以及 Java 与 LLM 结合的 AI 工程化落地。

#### ⚡ [优化] MySQL & Redis 深度优化

- **MySQL 专栏**：重构 [InnoDB MVCC 机制](database/mysql/core/2-mvcc-locks.md) 章节。补充 Read View 隔离算法决策树和 Undo Log 回滚段的物理存储拓扑图。
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
