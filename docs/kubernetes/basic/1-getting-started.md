---
id: getting-started
title: K8s 基础概念与入门
sidebar_position: 1
---

# K8s 基础概念与入门

## 什么是 Kubernetes？

Kubernetes 是一个开源的容器编排引擎，用来对容器化应用进行自动化部署、扩缩和管理。

## 核心对象 (Core Objects)

### Pod

- **概念**：K8s 中创建和管理的、最小的可部署的计算单元。
- **特点**：一个 Pod 可以包含一个或多个紧密相关的容器，这些容器共享存储、网络和运行时的环境。

### Deployment

- **概念**：用于管理无状态应用的控制器。
- **作用**：声明式地管理 Pod 的副本数、升级和回滚。当你描述好一个目标状态后，Deployment 控制器会自动调节集群让实际状态达到目标状态。

### Service

- **概念**：一种抽象，定义了一组 Pod 的逻辑集合和一个用于访问它们的策略（有时也称为微服务）。
- **类型**：
  - **ClusterIP**：默认类型，只能在集群内部访问。
  - **NodePort**：在每个节点上暴露特定端口，允许从外部访问集群内服务。
  - **LoadBalancer**：使用云提供商的负载均衡器向外部暴露服务。

### Namespace (命名空间)

- **概念**：用于将一个集群内的资源划分为多个虚拟集群。
- **场景**：常用于区分不同环境（如 dev, test, prod）或不同团队的项目资源。

## 常用 kubectl 命令

```bash
# 查看所有命名空间的 Pod
kubectl get pods -A

# 查看指定命名空间的 Pod，并持续刷新
kubectl get pods -n <namespace> -w

# 查看资源的详细信息
kubectl describe pod <pod-name> -n <namespace>

# 查看容器日志
kubectl logs <pod-name> -n <namespace>

# 进入容器执行命令
kubectl exec -it <pod-name> -n <namespace> -- /bin/sh
```
