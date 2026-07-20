---
id: security-rbac
title: 安全、RBAC 与网络策略
sidebar_position: 5
---

# K8s 安全体系

## RBAC (基于角色的访问控制)

RBAC 是 K8s 授权验证默认且最重要的手段。它定义了四个核心资源：

1. **Role**：在特定 Namespace 内定义一组操作权限（如针对 pods 的 get, list 操作）。
2. **ClusterRole**：定义集群级别的操作权限。
3. **RoleBinding**：将 Role 绑定到具体的用户、组或 ServiceAccount，使其在特定命名空间具有相应权限。
4. **ClusterRoleBinding**：将 ClusterRole 绑定生效于整个集群。

## Network Policy (网络策略)

默认情况下，K8s 集群中所有的 Pod 之间都是互通的。NetworkPolicy 允许通过标签选择器（Label Selectors）控制 Pod 的入站（Ingress）和出站（Egress）流量。

要使 NetworkPolicy 生效，所使用的 CNI 插件必须支持该功能（如 Calico 支持，基础版本的 Flannel 不支持）。

## Security Context (安全上下文)

定义了 Pod 或 Container 的特权与访问控制设置，例如：

- `runAsUser` / `runAsGroup`：指定以哪个系统用户/组的身份运行容器。
- `privileged`：容器能否开启特权模式（类似于宿主机的 root 权限）。
- `capabilities`：用于增加或删除容器可以获得的 Linux Capabilities（如禁止网络配置能力）。
- `readOnlyRootFilesystem`：使容器的根文件系统以只读方式挂载。
