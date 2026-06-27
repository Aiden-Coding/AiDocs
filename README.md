---
title: AiDocs: 工程师硬核技术知识手册
hide_title: true
---

## AiDocs: 工程师硬核技术知识手册

欢迎阅读 **AiDocs**！本手册致力于为中高级工程师提供系统化、源码级、实战导向的硬核技术解析。

涵盖了从 Java 并发内核、JVM 调优到 Rust 内存安全、分布式协议以及大厂高并发应急排障的完整闭环。无论您是在进行性能压测、线上救火，还是在冲击资深技术专家岗，这里都将为您提供最硬核的逻辑支撑。

---

## 🗺️ 全站技术图谱导航

### 1. Java 核心体系 (Java Ecosystem)

- [JUC 并发编程深度解析](docs/java/concurrent/aqs-locks.md)
- [JVM 虚拟机内核与调优](docs/java/jvm/memory-gc.md)
- [Spring 源码与启动加载原理](docs/java/spring/springboot-core.md)
- [高性能网络引擎 Netty](docs/java/network/netty-io.md)

### 2. 存储与中间件 (Middleware)

- [MySQL 索引、锁与 MVCC](docs/database/mysql/readme.md)
- [Redis 高性能结构与高可用](docs/cache/redis/readme.md)
- [消息队列高可用与事务](docs/distributed/system/message-queue.md)

### 3. 系统编程与架构 (Systems & Architecture)

- [Rust 内存安全与无畏并发](docs/rust/readme.md)
- [分布式共识协议 Raft/Paxos](docs/distributed/system/consensus.md)
- [分布式锁与事务一致性](docs/distributed/system/transactions.md)

- [JVM 内存模型与垃圾回收机制](docs/java/jvm/memory-gc.md)
- [JVM 调优实战与 Arthas 工具使用](docs/java/jvm/tuning-tools.md)

### 3. Spring 框架 (Spring Framework)

- [Spring IoC 与 AOP 源码级解析](docs/java/spring/ioc-aop.md)
- [Spring 事务传播与失效场景](docs/java/spring/transaction.md)
- [Spring Boot 自动装配与微服务组件原理](docs/java/spring/springboot-springcloud.md)

### 4. MySQL 数据库 (Database MySQL)

- [MySQL B+树索引与 InnoDB 引擎](docs/database/mysql/index-engine.md)
- [MySQL MVCC 机制与锁机制](docs/database/mysql/mvcc-locks.md)
- [MySQL 慢 SQL 优化与分库分表](docs/database/mysql/optimization.md)
- [MySQL 日志系统与主从复制原理](docs/database/mysql/logs-replication.md)

### 5. Redis 缓存 (Cache Redis)

- [Redis 核心数据结构与单线程模型](docs/cache/redis/datastructures-io.md)
- [Redis 高可用：持久化、哨兵与集群](docs/cache/redis/highavailability.md)
- [Redis 缓存实战：三剑客与分布式锁](docs/cache/redis/scenarios.md)
- [Redis 双写一致性与内存淘汰策略](docs/cache/redis/consistency-eviction.md)

### 6. 分布式系统 (Distributed System)

- [分布式共识协议：Raft 与 Paxos](docs/distributed/system/consensus.md)
- [分布式事务原理与 Seata 实战](docs/distributed/system/transactions.md)
- [消息队列高可用与消息丢失解决方案](docs/distributed/system/message-queue.md)
- [ZooKeeper 分布式锁与高可用原理](docs/distributed/system/lock-zookeeper.md)

### 7. Rust 系统编程 (Rust System Programming)

- [Rust 所有权与生命周期系统](docs/rust/ownership-lifetimes.md)
- [Rust 内存布局与零拷贝优化](docs/rust/memory-management.md)
- [Rust 并发编程与 Tokio 运行机制](docs/rust/concurrency.md)

---

## 🛠️ 本地预览与构建

本套文档支持使用 **Docusaurus** 编译并浏览网页。

### 1. 安装依赖

```bash
npm install
```

### 2. 本地运行

```bash
npm run start
```

启动后，可在浏览器中访问 `http://localhost:3000` 进行实时预览。

### 3. 编译静态网页

```bash
npm run build
```
