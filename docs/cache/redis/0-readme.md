---
title: Redis 高性能缓存体系
hide_title: true
sidebar_label: 介绍 & 路线图
sidebar_position: 0
slug: /cache/redis/
---

## Redis 高性能缓存体系

Redis 不仅仅是一个简单的 Key-Value 存储，它是构建现代高并发系统的核心基石。本专题深入探讨其数据结构底层设计、高可用架构及真实的生产级实战。

---

## ⭐ Redis 优秀实践与技术进阶路线图

```mermaid
mindmap
  root((Redis 专家成长之路))
    数据基石
      五大核心结构
      IO 多路复用
      高性能线程模型
      ZipList 到 Listpack 演进
      渐进式 Rehash 机制
    高可用架构
      主从复制与缓冲区调优
      Sentinel 哨兵与脑裂防御
      Cluster 集群分片与槽路由
    缓存进阶
      内存过期与淘汰策略
      数据持久化 AOF/RDB/混合
      双写一致性
    生产实战
      缓存穿透/击穿/雪崩
      BigKey 与 HotKey 深度治理
      Redlock 与加锁深度思辨
```

---

## 🚀 第一阶段：核心基石与线程模型 (Internal Architecture)

- [数据结构与内核 I/O 深度解析](datastructures-io.md)：探究跳表、压缩列表到 Listpack 演进、渐进式 Rehash 及五大高级数据类型原理。
- [一致性模型与淘汰机制](consistency-eviction.md)：深入 LRU/LFU 算法实现与写回策略。

---

## 🏗️ 第二阶段：高可用集群架构 & 性能调优 (High Availability & Performance)

- [主从、哨兵、集群与脑裂防御](highavailability.md)：解构 Cluster 下的哈希槽（Slot）与故障自动转移。
- [性能调优与生产实战](performance-tuning.md)：企业级对齐 BigKey / HotKey 治理、脑裂规避、缓冲区调优。

---

## ⚡ 第三阶段：核心场景与面试复盘 (Workshop)

- [Redis 缓存实战与分布式锁](scenarios.md)：深度对齐缓存雪崩、热点 Key 探测与分布式锁深度设计。
- [Redis 核心面试真题复盘](interview-redis.md)：收录大厂真实高频考点。
