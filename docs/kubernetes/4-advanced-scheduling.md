---
id: advanced-scheduling
title: Taint、Toleration 与亲和性调度
sidebar_position: 4
---

# 高级调度机制

## 污点 (Taints) 与 容忍度 (Tolerations)

这套机制用于排斥不满足条件的 Pod 被分配到某些特别的 Node 上。

- **Taints**：应用在 Node 上，类似于给节点上了锁。
- **Tolerations**：应用在 Pod 上，类似于拥有能够打开特定锁的钥匙。

**影响效果 (Effect)**：

- `NoSchedule`: 若 Pod 无法容忍该污点，则不会被调度到该节点。
- `PreferNoSchedule`: 软性的 `NoSchedule`，调度器尽力避免将 Pod 调度过来。
- `NoExecute`: 若 Pod 已经在节点上运行但无法容忍污点，则会被立即驱逐。

## 节点亲和性 (Node Affinity)

吸引 Pod 调度到特定节点的机制，本质上是 NodeSelector 的升级版。

- `requiredDuringSchedulingIgnoredDuringExecution`：硬约束，必须满足。
- `preferredDuringSchedulingIgnoredDuringExecution`：软约束，尽量满足。

## Pod 亲和性与反亲和性 (Pod Affinity/Anti-Affinity)

控制 Pod 与 Pod 之间的调度关系。

- **亲和性**：希望某些 Pod 部署在同一个拓扑域（如同一个 Node 甚至机架），减少网络延迟。
- **反亲和性**：希望某些同类 Pod 分散部署在不同节点，以达到高可用、容灾的目的。
