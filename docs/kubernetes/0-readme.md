---
id: readme
title: Kubernetes 学习路线
sidebar_position: 0
---

# Kubernetes (K8s) 从入门到精通

本系列文档旨在归纳总结 Kubernetes 的核心概念、架构原理以及生产实践。内容涵盖了从小白入门的基础操作，到高级调度的进阶指南，再到生产环境的排障与面试题。

## 目录导读

1. **基础入门**：带你了解 K8s 的基本概念（Pod、Deployment、Service等）以及快速上手。
2. **核心架构**：深入理解 K8s 的控制平面组件与工作节点组件，以及它们是如何协同工作的。
3. **网络与存储**：剖析 K8s 的网络通信原理（CNI、Ingress）及持久化存储方案（PV/PVC/StorageClass）。
4. **高级调度**：探索 Taint、Toleration、NodeAffinity、PodAffinity 等复杂场景下的集群调度策略。
5. **安全与权限**：K8s 安全防线建设，包括 RBAC 鉴权、NetworkPolicy 及 SecurityContext 设置。
6. **常见排障与最佳实践**：生产环境中的各种奇葩问题及排查思路，集群的高效运维指南。
7. **eBPF 与 Cilium 网络内核**：[eBPF 技术与 Cilium 极速容器网络内核架构](advanced/7-ebpf-cilium-networking.md)：精剖 Linux 内核态 Sockmap 零复制、XDP 驱动层 $O(1)$ Hash 负载均衡和 Hubble 无侵入 7 层服务可观测性底座。
8. **高频面试题**：整理 K8s 领域的高频核心面试题及参考答案，助你从容应对云原生岗位面试。
