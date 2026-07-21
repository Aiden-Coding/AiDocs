---
title: Linux 核心技术知识体系
hide_title: true
sidebar_label: 介绍 & 路线图
sidebar_position: 0
slug: /linux/
---

## Linux 核心技术知识体系

Linux 是现代后端工程师必须深入掌握的底层基石。无论是理解 JVM 内存管理、Netty 零拷贝，还是排查线上 CPU 飙高、网络抖动，都离不开对 Linux 内核机制的原生认知。本体系从内核原理出发，贯穿系统调用、网络协议栈，直达生产运维实战与高级底层调试。

---

## 工程师进阶路线图

```mermaid
mindmap
  root((Linux 专家成长之路))
    基础运维与服务守护
      文件系统与 VFS
      用户与权限管理
      进程与信号管理
      Systemd 深度剖析
    内核原理与高级通信
      I/O 模型与多路复用
      虚拟内存与页表
      进程调度 CFS
      隔离 Namespaces & Cgroups
      进程间通信 IPC
    网络协议栈与安全
      TCP/IP 内核协议栈
      Socket 与网络缓冲区
      Netfilter 与本地防火墙
      网络连接跟踪 conntrack
    性能调优与故障排查
      CPU 与内存性能分析
      内存泄漏定位与碎片管理
      磁盘 I/O 调优
      崩溃转储 KDUMP & Core Dump
```

---

## 第一阶段：基础命令与系统管理

### 1.1 文件系统与核心命令

- [文件系统与核心命令速查](basic/0-filesystem-commands.md)：VFS 抽象层、inode/dentry 结构、硬链接与软链接本质，以及 find/awk/sed/xargs 生产级用法。
- [用户权限与安全模型](basic/1-user-permission.md)：DAC 自主访问控制、`rwx` 位与 `setuid/setgid/sticky` 特权位、`sudo` 提权机制与 `/etc/sudoers` 深度解析。
- [进程管理与信号机制](basic/2-process-management.md)：进程状态机（R/S/D/Z/T）、`fork/exec/wait` 调用链、信号传递模型与进程控制。
- [Systemd 深度剖析](basic/3-systemd-deep-dive.md)：Systemd PID 1 进程初始化流程、并行服务启动（套接字激活/D-Bus 激活）、Unit 全类型配置与依赖拓扑设计，以及 journald 日志管理与守护进程模型。

---

## 第二阶段：内核原理深度剖析

### 2.1 I/O 模型

- [Linux I/O 模型与多路复用](kernel/0-io-model.md)：五种 I/O 模型对比、`select/poll/epoll` 实现差异、`epoll` LT/ET 触发模式与 `io_uring` 异步 I/O 内核原理。

### 2.2 内存管理

- [虚拟内存与内核内存管理](kernel/1-memory-management.md)：四级页表结构、`mmap/brk` 内存分配、Buddy System + Slab 分配器、OOM Killer 触发机制与 /proc/meminfo 解读。

### 2.3 进程调度与隔离

- [进程调度器 CFS 与实时调度](kernel/2-process-scheduler.md)：完全公平调度器 CFS vruntime 红黑树、调度类优先级、CPU 亲和性与 `cgroups` 资源隔离机制。
- [虚拟化 Namespaces & Cgroups](kernel/3-namespaces-cgroups.md)：Linux 6大命名空间、内核 `clone/unshare/setns` 系统调用、Cgroups v1 与 v2 单层级层次结构区别，以及容器化隔离的底层机理。

### 2.4 进程间通信

- [IPC 底层通信](kernel/4-ipc-deep-dive.md)：管道（Anon/FIFO Pipe）、共享内存（System V/POSIX SHM）、信号量、Unix 域套接字（UDS）等的高吞吐零拷贝及内存隔离通信技术。

---

## 第三阶段：网络协议栈与安全

- [TCP/IP 内核协议栈深度解析](network/0-tcp-ip-stack.md)：内核 Socket 接收发送缓冲区、TCP 三次握手/四次挥手内核状态机、TIME_WAIT 大量积压根因与 `tcp_tw_reuse` 调优。
- [网络诊断工具实战](network/1-network-tools.md)：`tcpdump` 过滤语法与抓包分析、`ss/netstat` 连接状态诊断、`iperf3` 带宽测试与 `eBPF/bcc` 动态追踪。
- [Netfilter 与本地防火墙](network/2-firewall-netfilter.md)：Netfilter 内核框架五表五链、`iptables` 与新一代高性能 `nftables` 防火墙对比、高吞吐下 `conntrack` 连接跟踪表爆满引发丢包性能调优。

---

## 第四阶段：性能调优与故障排查

- [CPU 与内存性能调优](ops/0-performance-tuning.md)：`perf/flamegraph` 火焰图分析、`vmstat/mpstat/sar` 系统级监控、内存碎片与大页（HugePage）调优。
- [线上故障排查方法论](ops/1-troubleshooting.md)：CPU 100% 根因分析（`top/pidstat/strace`）、内存泄漏定位（`valgrind/smaps`）、磁盘 I/O 瓶颈排查（`iostat/iotop/blktrace`）。
- [崩溃转储 KDUMP & GDB](ops/2-kdump-debugger.md)：应用层 Core Dump 信号控制与高吞吐调优、内核 Panic 时的 KDUMP 双内核捕获转储流程，以及使用 GDB 和 Crash 实战分析崩溃堆栈。

---

## 关联知识推荐

- **Java NIO 与 Netty**：Linux epoll 是 Netty 高性能的底层支撑，见 [JDK NIO 核心三件套](../java/network/0-jdk-nio-fundamentals.md)。
- **容器与 K8s**：Linux cgroups/namespace 是容器隔离的基础，见 [Kubernetes 架构](../kubernetes/basic/2-architecture.md)。
- **JVM 调优**：Linux 内存管理与 JVM GC 调优紧密相关，见 [JVM 内存模型与 GC](../java/jvm/0-memory-gc.md)。
