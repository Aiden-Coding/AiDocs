---
id: architecture
title: K8s 体系架构与组件
sidebar_position: 2
---

# K8s 体系架构与组件

Kubernetes 集群主要由**控制平面 (Control Plane)** 和 **数据平面 / 工作节点 (Node)** 组成。

## 控制平面 (Control Plane)

控制平面的组件构成了系统的全局决策中心，负责响应集群事件（例如调度、扩缩容等）。

1. **kube-apiserver**
   - K8s 控制平面的前端，所有针对控制平面的操作和 API 调用都需要经过这里。
   - 提供了网关、认证授权通道以及准入控制的功能。

2. **etcd**
   - 兼具一致性和高可用性的键值数据库，K8s 所有的集群状态数据、配置数据均保存在 etcd 中。

3. **kube-scheduler**
   - 负责监控新创建且尚未被分配到某个 Node 的 Pod，并在集群中为其选择一个合适的 Node。
   - 调度策略包括资源限制、亲和性/反亲和性规范、污点容忍等。

4. **kube-controller-manager**
   - 运行一系列不同控制器的进程。
   - 主要包括节点控制器、副本控制器（ReplicaSet Controller）、端点控制器等，负责维护集群的状态，比如故障检测、自动扩展和滚动更新。

## 工作节点组件 (Node Components)

节点组件运行在每一个 Node 上，负责维护运行的 Pod 并提供 Kubernetes 环境。

1. **kubelet**
   - 在集群每个节点上运行的代理。它保证容器都运行在 Pod 中。
   - kubelet 接收通过各种机制提供给它的 PodSpecs，确保这些 PodSpecs 中描述的容器处于健康的运行状态。

2. **kube-proxy**
   - 集群中每个节点上运行的网络代理，实现 Kubernetes 服务（Service）概念的一部分。
   - 维护节点上的网络规则。这些网络规则允许从集群内部或外部的网络会话与 Pod 进行网络通信。

3. **容器运行时 (Container Runtime)**
   - 负责运行容器的软件。常见的包块 containerd、CRI-O 等（Docker shim 已经被弃用并移除）。
