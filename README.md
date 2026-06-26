# Java 高级开发工程师技术解析文档

欢迎阅读 **Java 高级开发工程师技术解析文档**！

本套文档致力于为 Java 开发者提供系统化、源码级、实战导向的硬核技术解析，涵盖高并发、JVM、Spring 框架、MySQL 数据库、Redis 缓存以及分布式系统等核心领域。无论是日常开发中的性能调优、线上故障排查，还是资深工程师的面试备战，本套文档都将是您的硬核武器。

---

## 📚 目录导航

### 1. Java 并发编程 (Java Concurrent)
- [AQS 机制与锁实现深度解析](01-Java-Concurrent/AQS-and-Locks.md)
- [ThreadLocal 与 CAS 原理](01-Java-Concurrent/ThreadLocal-and-CAS.md)
- [线程池深度解析与调优](01-Java-Concurrent/ThreadPool-Deep-Dive.md)
- [HashMap 与 ConcurrentHashMap 源码级深度解析](01-Java-Concurrent/HashMap-and-ConcurrentHashMap.md)

### 2. JVM 虚拟机 (JVM)
- [类加载机制与字节码技术](02-JVM/ClassLoader-and-Bytecode.md)
- [JVM 内存模型与垃圾回收机制](02-JVM/JVM-Memory-and-GC.md)
- [JVM 调优实战与 Arthas 工具使用](02-JVM/JVM-Tuning-and-Tools.md)

### 3. Spring 框架 (Spring Framework)
- [Spring IoC 与 AOP 源码级解析](03-Spring-Framework/Spring-IoC-and-AOP.md)
- [Spring 事务传播与失效场景](03-Spring-Framework/Spring-Transaction.md)
- [Spring Boot 自动装配与微服务组件原理](03-Spring-Framework/SpringBoot-and-SpringCloud.md)

### 4. MySQL 数据库 (Database MySQL)
- [MySQL B+树索引与 InnoDB 引擎](04-Database-MySQL/MySQL-Index-and-Engine.md)
- [MySQL MVCC 机制与锁机制](04-Database-MySQL/MySQL-MVCC-and-Locks.md)
- [MySQL 慢 SQL 优化与分库分表](04-Database-MySQL/MySQL-Optimization.md)
- [MySQL 日志系统与主从复制原理](04-Database-MySQL/MySQL-Logs-and-Replication.md)

### 5. Redis 缓存 (Cache Redis)
- [Redis 核心数据结构与单线程模型](05-Cache-Redis/Redis-DataStructures-and-IO.md)
- [Redis 高可用：持久化、哨兵与集群](05-Cache-Redis/Redis-HighAvailability.md)
- [Redis 缓存实战：三剑客与分布式锁](05-Cache-Redis/Redis-Scenarios.md)
- [Redis 双写一致性与内存淘汰策略](05-Cache-Redis/Redis-Consistency-and-Eviction.md)

### 6. 分布式系统 (Distributed System)
- [分布式共识协议：Raft 与 Paxos](06-Distributed-System/Distributed-Consensus.md)
- [分布式事务原理与 Seata 实战](06-Distributed-System/Distributed-Transactions.md)
- [消息队列高可用与消息丢失解决方案](06-Distributed-System/Message-Queue.md)
- [ZooKeeper 分布式锁与高可用原理](06-Distributed-System/Distributed-Lock-ZooKeeper.md)

---

## 🛠️ 本地预览与构建

本套文档支持使用 **mdBook** 编译成静态网页。

### 1. 安装 mdBook
```bash
# 使用 Cargo 安装
cargo install mdbook

# 安装 Mermaid 预处理器（用于渲染架构图）
cargo install mdbook-mermaid
```

### 2. 本地运行
```bash
# 启动本地开发服务器，支持热重载
mdbook serve
```
启动后，可在浏览器中访问 `http://localhost:3000` 进行实时预览。

### 3. 编译静态网页
```bash
# 编译输出静态网页到 book/ 目录
mdbook build
```
