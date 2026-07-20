---
id: networking-storage
title: K8s 网络与存储
sidebar_position: 3
---

# K8s 网络与存储

## Kubernetes 网络模型 (CNI)

K8s 制定了统一的网络模型，要求每个 Pod 都拥有一个独立的 IP，且：

- 节点上的 Pod 可以不经过 NAT 和其他节点上的 Pod 通信。
- 节点上的代理（比如系统守护进程、kubelet）可以和节点上的所有 Pod 通信。

主流的 CNI (Container Network Interface) 插件有 Calico、Flannel、Cilium 等。

## Ingress

虽然 Service 可以暴露服务（通过 NodePort 或 LoadBalancer），但对于七层（HTTP/HTTPS）协议的流量转发，Ingress 是更好的选择。

- **Ingress 资源**：定义路由规则、主机名、路径等到 Service 的映射。
- **Ingress 控制器**：如 Nginx Ingress Controller，负责读取 Ingress 资源配置，将其转化为反向代理规则。

## Kubernetes 存储架构

容器的生命周期是短暂的，这就需要持久化存储来保存数据。

### PV (PersistentVolume)

PV 是集群中由管理员配置或使用 StorageClass 动态配置的一段网络存储。它和节点一样具有集群级抽象，生命周期独立于使用 PV 的任何单个 Pod。

### PVC (PersistentVolumeClaim)

PVC 是用户对存储的请求。Pod 像消耗 Node 节点资源一样消耗 PV 资源。用户在 PVC 中声明自己所需的存储容量及访问模式（如 ReadWriteOnce, ReadWriteMany）。

### StorageClass

用于动态提供存储。当用户创建 PVC 并指定 StorageClass 时，K8s 会通过对应的存储插件（Provisioner）自动创建 PV，无需管理员人工介入。
