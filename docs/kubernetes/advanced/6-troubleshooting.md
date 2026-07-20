---
id: troubleshooting
title: 常见排障与最佳实践
sidebar_position: 6
---

# 常见排障与最佳实践

## Pod 处于非 Running 状态排查

- **Pending**：
  - 资源不足（CPU/内存无法满足 requests）。
  - 没有节点满足 NodeSelector 或节点亲和性要求。
  - 无法容忍存在污点的节点。
- **CrashLoopBackOff / Error**：
  - 容器内的应用程序启动失败（检查 `kubectl logs <pod-name>`）。
  - 缺少环境变量或挂载文件错误。
  - 探针（Liveness/Readiness Probe）失败。
- **ImagePullBackOff / ErrImagePull**：
  - 镜像名称或 Tag 写错。
  - 镜像拉取权限不足（没有对应的 ImagePullSecret）。
  - 节点无法访问镜像仓库网络。

## 节点级状态异常

若节点显示未就绪 (NotReady)：

- 检查该节点上的 kubelet 状态 (`systemctl status kubelet`)。
- 检查节点网络，是否与 APIServer 失联。
- 检查节点磁盘空间是否写满，造成驱逐 (DiskPressure)。

## 生产环节最佳实践

1. **合理设置 Requests 和 Limits**：避免单个异常容器吃满节点资源，导致雪崩。
2. **配置健康检查探针**：配置优雅的 Liveness 和 Readiness 探针，让 K8s 明白应用的实际健康状况。
3. **使用声明式资源配置**：将资源对象的 YAML 放置在代码仓库，使用 GitOps 工具（如 ArgoCD 结合 Helm或Kustomize）进行变更管理。
4. **避免使用 `latest` 标签镜像**：生产环境务必锁定镜像具体的版本号 tag。
5. **做好节点反亲和分配**：同一个 Deployment 的副本应尽量分布在不同节点上。
