# Java 高级开发工程师技术解析文档

欢迎阅读 **Java 高级开发工程师技术解析文档**！

本套文档致力于为 Java 开发者提供系统化、源码级、实战导向的硬核技术解析，涵盖高并发、JVM、Spring 框架、MySQL 数据库、Redis 缓存以及分布式系统等核心领域。无论是日常开发中的性能调优、线上故障排查，还是资深工程师的面试备战，本套文档都将是您的硬核武器。

---

## 📚 目录导航

### 1. Java 并发编程 (Java Concurrent)
- [AQS 机制与锁实现深度解析](docs/java/concurrent/aqs-locks.md)
- [ThreadLocal 与 CAS 原理](docs/java/concurrent/threadlocal-cas.md)
- [线程池深度解析与调优](docs/java/concurrent/threadpool.md)
- [HashMap 与 ConcurrentHashMap 源码级深度解析](docs/java/concurrent/hashmap-concurrenthashmap.md)

### 2. JVM 虚拟机 (JVM)
- [类加载机制与字节码技术](docs/java/jvm/classloader-bytecode.md)
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
