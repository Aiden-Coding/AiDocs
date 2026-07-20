---
id: interview-k8s
title: K8s 高频面试题
sidebar_position: 7
---

# Kubernetes 高频面试题解析

## 1. Pod 的创建流程

1. 用户通过 kubectl/API 提交 Pod 创建请求到 APIServer。
2. APIServer 将对象信息写入到 etcd。
3. Scheduler 监听到有未调度的 Pod，通过一系列过滤和打分算法计算出最佳 Node。
4. Scheduler 将绑定信息发回给 APIServer 并写入 etcd。
5. 对应 Node 上的 kubelet 监听到 Pod 被绑定到自己，开始调用容器运行时组件创建容器。
6. Kubelet 将 Pod 运行状态汇报给 APIServer。

## 2. Deployment 中的平滑升级原理

Deployment 并不直接管理 Pod，而是管理 ReplicaSet。在滚动更新时，Deployment 会新建一个带有新版本 Image 的 ReplicaSet 叫 RS-new，原来的叫 RS-old，然后在增加 RS-new 的副本数的同时，逐渐减少 RS-old 的副本数，最终达到完全更新。在此过程中，旧版的 Pod 只会在新的 Pod 就绪后才会被终结，从而保障服务不中断。

## 3. Kube-proxy 的几种工作模式有何区别

- **UserSpace（已淘汰）**：请求经过内核空间再进入用户空间的 kube-proxy 进行转发，性能损耗大。
- **iptables（默认/常用模式）**：kube-proxy 监控 Service 和 Endpoints 变化，将负载均衡与地址转换规则写入 Linux iptables 中。由于 iptables 规则是顺序匹配，当服务量极大时会有性能瓶颈。
- **IPVS（高性能模式）**：同样也是利用宿主机的网络特性，但底层数据结构为哈希表，相比 iptables 查询极快，支持更多的调度算法，非常适合大型 K8s 集群。

## 4. 什么是 StatefulSet 及其与 Deployment 的区别

StatefulSet 主要用于管理有状态应用（如 MySQL集群、ZooKeeper 等），有三大特性：

1. **稳定的网络标识**：Pod 名称不变，可以通过 Headless Service 为每个 Pod 分配固定域名。
2. **稳定的本地存储**：每个 Pod 都可以有独立绑定的 PV。当 Pod 重启/重建时依然能绑定原来的 PV。
3. **有序的部署和扩展**：按编号顺序启动与停止，前面的就绪后才启动下一个。

## 5. 简述 LivenessProbe 和 ReadinessProbe

- **LivenessProbe (存活探针)**：判断容器是否还在运行，若失败，kubelet 会杀掉该容器然后根据重启策略重启。
- **ReadinessProbe (就绪探针)**：判断应用是否准备好接收流量，若失败，Endpoints Controller 会将该 Pod 的 IP 从关联的 Service 列表中被剔除。

## 6. HPA 的工作原理及其扩缩容抖动的解决方法

- **原理**：HPA 通过 Metrics Server 定期获取指标数据，计算期望副本数并调节工作负载。
- **抖动问题**：如果指标频繁波动，会导致 Pod 频繁创建和销毁，造成系统震荡（抖动）。
- **解决方法**：
  - **缩容延迟 (Cooldown)**：限制缩容的速度。通过配置稳定性窗口时间（`stabilizationWindowSeconds`），在此窗口期内，HPA 会选择计算出的副本最大值，避免因指标短暂下降而快速缩容。
  - **扩容策略**：在 HPA 的 `behavior` 字段中分别配置扩容（scaleUp）与缩容（scaleDown）的策略，以限制一定时间内新增/减少的副本百分比或绝对数量。

## 7. 简述 Helm 的核心概念与 Chart 结构

- **核心概念**：
  - **Chart**：Helm 包，包含在 Kubernetes 集群内运行应用程序所需的所有资源定义。
  - **Config**：包含合并到 Chart 中的配置信息，用于实例化模板。
  - **Release**：在 Kubernetes 集群中运行的 Chart 的一个特定实例。
- **Chart 基本结构**：

  ```text
  mychart/
  ├── Chart.yaml          # 声明 Chart 的元数据（名称、版本、描述）
  ├── values.yaml          # 模板的默认配置值
  ├── templates/           # K8s 资源清单的模板文件目录
  └── charts/              # 依赖的其他子 Chart 目录
  ```
