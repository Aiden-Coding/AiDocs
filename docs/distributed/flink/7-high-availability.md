---
title: Flink HA 高可用容错集群架构
hide_title: true
sidebar_label: HA 高可用容错架构
---

## Flink HA 高可用容错集群架构

由于 Flink 主打 7x24 不间断运作，这就要求不管它是部署在古老的 YARN 上，还是现代 Kubernetes 容器编排环境中，整个管理调度中枢都不能存在**单点故障 (Single Point of Failure， SPOF)**风险。

对于 Flink 集群而言，Worker 节点（TaskManager）崩溃只是损失了算力而已，JobManager 会重新部署；但若是主帅枢纽 **JobManager** 自身不幸挂机，整个作业会彻底群龙无首瘫痪。

HA (High Availability) 架构机制就是致力于彻底消除 JobManager 重大崩溃问题。 

---

## 一、 主备切换机制基石 (Active-Standby)

Flink 大量采用 **Leader Election** 的首领选举概念来解决单点故障环境：

1. **多重备岗 (Standby)**：在提交生产集群中，我们会强行拉起或配置拥有不止一个 `JobManager` 进程。
2. **唯一干活 (Active Leader)**：在任何指定时刻，只有其中**唯一一个**夺得令牌的 JM 被授予 Active Leader 的王冠，开始真正分派任务并调度。
3. **其它的处于暗中蛰伏 (Standbys)**：其他的 JM 只是安分守己的作为副手保持闲置与监听，绝不开销管理动作。
4. **瞬间补位**：若是唯一的那个老大突然挂断猝死，剩下的这些副手里马上会通过抢占选出一位新的老大，新的老大通过读取外部高可靠介质里的图纸 (High-Availability Storage) 从断点恢复作业。 

---

## 二、 现代最普遍的两大容错介质

为了让这些不同的副手们公平选举不打架，并且新上任的老大能够顺利接替上一代老大处理好的烂摊子状态数据，Flink 依赖两个核心系统组件完成高可用信息共享。

### 1. 传统大数据界的图腾：ZooKeeper HA

这是 Flink 在 Hadoop / YARN 或 Standalone 物理机体系上最主流的打法。

- **高可靠配置与元数据的存储介质通常是 HDFS**（或其他类似 S3 的持久化远端文件系统）。JobManager 会把自己编译好的 `JobGraph` 图纸以及自己提交产生的那些至关重要的 `Completed Checkpoint` 日志保存凭证文件扔到 HDFS 里。
- **调度抢夺裁判所依赖的则是 ZooKeeper 分布式协调进程**。利用 ZK 中的短暂节点（Ephemeral Znode），最先在 ZK 创建特定锁节点成功的 JM 就是老大。老大死了节点自然破裂消散。所有的备用 JM 均盯着 ZK。一旦旧领导断开心跳触发节点移除，其余备选人便能马上捕获这一事件冲上去抢锁，夺得新权利。

### 2. 拥抱云原生：Kubernetes Native HA (Flink 1.12+)

在现代环境中引入 ZooKeeper 这巨兽让单纯的云原生容器集群太重负，Flink 支持完全利用 **Kubernetes** 本身的控制面原语实现原生的 HA 重修。

```mermaid
graph TD
    K8S[K8s API Server 控制核心]
    subgraph ConfigMap
        LeaderLock[(Leader Election Lock ConfigMap)]
        JobPointer[(JobGraph / Pointer ConfigMap)]
    end

    JMA[JobManager Pod A (Active)]
    JMB[JobManager Pod B (Standby)]
    JMC[JobManager Pod C (Standby)]

    JMA -->|1. 占用并刷新心跳| LeaderLock
    JMA -.->|崩溃,心跳消失| LeaderLock
    JMB -->|2. K8s监测到释放, 争抢锁| LeaderLock
    JMB -->|3. 成主, 提取信息恢复| JobPointer
```

- 取代 ZK 节点的则是 K8s 里独有的 **ConfigMap 乐观并发控制** 以及 Lease（租约）资源来充当选主锁。
- 各个 JM 实例会在启动时试图给自己在 K8s 里建立或者抢夺那个代表最高权柄的 ConfigMap。
- 这是完全解耦了第三方协调者应用的最清爽方式，实现了彻底的云原生（Cloud Native Flow）。

---

## 三、 JobManager 新上任的数据恢复 (Recovery)

不管是哪种选主方案，只要老君王驾崩，新太子夺权后，新一任 JobManager 都要面对下面复活这四大要务：

1. 寻找远端 HDFS (或 S3) 储存池。
2. 将里面过去保存记录的主 `JobGraph` 还原加载。
3. 把当时已经持久化了的、最近一次成功的 **Checkpoint 状态把控文件索引**提取到自己大脑。
4. 呼唤下方还在干活或者游离态重新连接进来的全部 **TaskManagers** 斩断旧作业事务。并从上一轮 Checkpoint 指示里读取数据进行全盘的完美恢复执行，继续运算流数据！