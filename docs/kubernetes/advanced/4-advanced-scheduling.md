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

## 弹性伸缩 HPA

### 什么是 HPA

HPA（水平 Pod 自动扩缩容）能够根据 CPU 利用率、内存占用或其他自定义指标，自动调整 Deployment、ReplicaSet 或 StatefulSet 中的 Pod 副本数，以应对流量的波动。

### 工作原理

1. **指标采集**：Metrics Server 组件定期（默认每 15 秒）采集 Pod 的资源消耗数据。
2. **计算副本数**：HPA 控制器通过以下逻辑计算出目标副本数并向上取整：
   
   ```text
   期望副本数 = ceil[ 当前副本数 * (当前指标值 / 目标指标值) ]
   ```

3. **扩缩容执行**：修改工作负载对象的 `replicas` 字段，实现 Pod 实例的增加或减少。

### 基础配置示例

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-app-hpa
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  minReplicas: 1
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 50
```
