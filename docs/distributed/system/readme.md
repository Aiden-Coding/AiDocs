---
title: 分布式系统架构图谱
hide_title: true
sidebar_label: 介绍 & 路线图
sidebar_position: 0
slug: /distributed/system/
---

## 分布式系统架构图谱

在海量请求下，如何保障数据的一致性、可用性与分区容错性？本专题涵盖分布式协议、事务、锁及消息队列的核心理论与实践。

---

## 🗺️ 分布式进阶技术栈

```mermaid
mindmap
  root((分布式架构核心))
    一致性协议
      Paxos 协议
      Raft 极速强选举
      ZAB 崩溃恢复与消息广播
    分布式事务
      2PC / 3PC 痛点
      Seata AT 与 XA 模式
      Saga 与 TCC 柔性重塑
    核心协调组件
      ZooKeeper 树模型
      分布式锁惊群消除
      Curator 客户端指数退避
    性能吞吐利器
      Kafka Mmap 与 Sendfile 零拷贝
      顺序消息分布式锁定与单线程重放
```

---

## 🚀 第一阶段：一致性理论基础 (Consensus)

- [共识算法：从 Paxos 到 ZAB](consensus.md)：深入解析 Paxos 二阶段过程、Raft 的 Safety 机制以及 ZooKeeper 的 ZAB 原子组播内幕。

---

## 🏗️ 第二阶段：分布式事务与锁 (Consistency)

- [分布式事务全解方案](transactions.md)：剖析 2PC 顽疾、TCC 三重异常（空回滚/幂等/悬挂）对抗，以及 Saga 架构隔离性自愈修复。
- [基于 ZooKeeper 的分布式锁](lock-zookeeper.md)：探索临时顺序节点极致防惊群监听，以及 Curator 可重入 `InterProcessMutex` 的 Thread 映射实现。

---

## ⚡ 第三阶段：核心中间件机制 (Middleware)

- [高并发零拷贝与顺序消费](message-queue.md)：“端到端”防消息丢失保障方案、高吞吐零拷贝（Mmap vs Sendfile）以及顺序消费的多级分布式锁定实现。
