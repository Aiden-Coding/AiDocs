---
title: Netty 性能调优与生产最佳实践
hide_title: true
sidebar_label: Netty 性能调优
---

## Netty 性能调优与生产最佳实践

Netty 虽然开箱即用性能优异，但在高并发、高吞吐的生产环境中，如果不进行针对性的参数调整与架构优化，依然可能遇到 GC 频繁、CPU 飙升或内存泄露等问题。

---

## 一、 TCP 核心参数调优

在构建 `ServerBootstrap` 时，合理配置 TCP 选项是提高连接并发量和网络吞吐量的第一步。

```java
ServerBootstrap b = new ServerBootstrap();
b.group(bossGroup, workerGroup)
    .channel(NioServerSocketChannel.class)
    .option(ChannelOption.SO_BACKLOG, 1024)
    .childOption(ChannelOption.SO_KEEPALIVE, true)
    .childOption(ChannelOption.TCP_NODELAY, true)
    .childOption(ChannelOption.SO_REUSEADDR, true);
```

### 1. SO_BACKLOG 参数

设置 TCP 暂存三次握手已完成连接的队列大小。Linux 默认值通常较小（如 128），在高并发短连接接入场景下，建议提高至 1024 或更高，防止连接队列满导致请求被丢弃。

### 2. TCP_NODELAY 参数

禁用 Nagle 算法。Nagle 算法会将多个小数据包合并发送以提高网络利用率，但这会导致高实时性场景下的响应延迟。设置为 `true` 可实现小数据包即时发送。

### 3. SO_KEEPALIVE 参数

开启 TCP 底层心跳保活机制。注意 TCP 默认心跳探测周期较长（通常为 2 小时），建议结合 Netty 的 `IdleStateHandler` 实现应用层精准心跳。

---

## 二、 线程模型与业务隔离

Netty 的 `EventLoop` 线程负责处理 IO 事件和驱动 `ChannelPipeline`。**绝对禁止在 EventLoop 中执行耗时或阻塞操作**。

### 1. 业务线程池隔离模式

对于数据库查询、RPC 远程调用或复杂计算等耗时任务，应剥离到独立的业务线程池中执行。

```java
// 方式 A：在 pipeline 添加 handler 时指定专属线程池
EventExecutorGroup businessGroup = new DefaultEventExecutorGroup(16);

pipeline.addLast(businessGroup, "businessHandler", new MyBusinessHandler());
```

```java
// 方式 B：在 handler 内部提交至自定义线程池
public class MyBusinessHandler extends SimpleChannelInboundHandler<String> {

    private static final ExecutorService BIZ_POOL = Executors.newFixedThreadPool(32);

    @Override
    protected void channelRead0(ChannelHandlerContext ctx, String msg) {
        BIZ_POOL.submit(() -> {
            String result = doSlowOperation(msg);
            ctx.executor().execute(() -> ctx.writeAndFlush(result));
        });
    }
}
```

---

## 三、 内存泄露监控与诊断

Netty 默认使用堆外内存（Direct Memory）提升读写性能。若 `ByteBuf` 未正确释放（未调用 `ReferenceCountUtil.release(msg)`），将导致堆外内存泄露。

### 1. 检测级别设置

通过 JVM 启动参数配置内存泄露检测级别：

```bash
-Dio.netty.leakDetection.level=PARANOID
```

| 级别 | 抽样比例 | 说明 |
| :--- | :--- | :--- |
| `DISABLED` | 0% | 禁用泄漏检测 |
| `SIMPLE` | 约 1% | 默认级别，报告泄漏位置但不提供调用栈 |
| `ADVANCED` | 约 1% | 记录并打印完整调用堆栈 |
| `PARANOID` | 100% | 全量采样，用于压测或排查严重泄露 |

### 2. 内存释放最佳实践

继承 `SimpleChannelInboundHandler` 时，Netty 会自动释放消息；若继承 `ChannelInboundHandlerAdapter`，则需手动调用 `ReferenceCountUtil.release(msg)` 释放资源。

---

## 四、 Native Transport 极速模式

在 Linux 操作系统上，Netty 提供了基于 `epoll` 的边缘触发（Edge-Triggered）Native Transport 架构，相比默认的 NIO 通道，CPU 占用更低且系统调用更少。

```java
// Linux 环境下切换 Native Epoll 通道
EventLoopGroup bossGroup = new EpollEventLoopGroup(1);
EventLoopGroup workerGroup = new EpollEventLoopGroup();

ServerBootstrap b = new ServerBootstrap();
b.group(bossGroup, workerGroup)
    .channel(EpollServerSocketChannel.class)
    .childHandler(new MyChannelInitializer());
```

---

## 五、 对象池复用机制

为了降低高并发场景下的 GC 压力，Netty 内部广泛应用了对象池技术 `Recycler`。

```mermaid
flowchart LR
    Thread["工作线程"] -->|获取对象| Cache["PoolThreadCache"]
    Cache -->|无可用对象| Stack["Stack 栈结构"]
    Stack -->|回收对象| Queue["WeakOrderQueue"]
```

通过复用 `ByteBuf` 实例与底层 `Task` 对象，大幅减轻垃圾回收器的分配与回收负担。
