---
title: Netty 心跳保活与断线重连实战
hide_title: true
sidebar_label: 心跳与断线重连
---

## Netty 心跳保活与断线重连实战

在长连接场景里，TCP 连接看起来“活着”，但实际上可能早已失联。比如客户端进程挂了、网线被拔掉、服务端侧发生网络抖动，这些现象都会让连接处于“半关闭”状态。只有靠应用层心跳，才能尽早发现这类问题并做重连。

---

## 一、 为什么需要心跳？

TCP 自带的 `SO_KEEPALIVE` 只能做底层探测，存在几个局限：

- 只能发现“连接层面”的异常，不能区分业务是否真的活跃。
- 默认探测间隔较长，恢复时间不够敏感。
- 不能表达“应用层协议是否正常工作”。

所以在 IM、消息推送、网关、游戏服务器、物联网设备链路里，通常要做两层检测：

1. TCP 层保活：检测连接是否还在。
2. 应用层心跳：检测业务是否真的可用。

---

## 二、 用 Netty 做服务端心跳

最常用的思路是借助 `IdleStateHandler`，它会在空闲时间过长时触发 `IdleStateEvent`，然后由业务 Handler 处理。

### 1. 服务端代码示例

```java
import io.netty.bootstrap.ServerBootstrap;
import io.netty.channel.*;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.SocketChannel;
import io.netty.channel.socket.nio.NioServerSocketChannel;
import io.netty.handler.timeout.IdleState;
import io.netty.handler.timeout.IdleStateEvent;
import io.netty.handler.timeout.IdleStateHandler;

import java.net.InetSocketAddress;
import java.util.concurrent.TimeUnit;

public class HeartbeatServer {
    public static void main(String[] args) throws Exception {
        EventLoopGroup boss = new NioEventLoopGroup(1);
        EventLoopGroup worker = new NioEventLoopGroup();

        try {
            ServerBootstrap bootstrap = new ServerBootstrap();
            bootstrap.group(boss, worker)
                .channel(NioServerSocketChannel.class)
                .childHandler(new ChannelInitializer<SocketChannel>() {
                    @Override
                    protected void initChannel(SocketChannel ch) {
                        ch.pipeline().addLast(new IdleStateHandler(10, 0, 0, TimeUnit.SECONDS));
                        ch.pipeline().addLast(new HeartbeatHandler());
                    }
                });

            ChannelFuture future = bootstrap.bind(new InetSocketAddress(8081)).sync();
            System.out.println("heartbeat server started");
            future.channel().closeFuture().sync();
        } finally {
            boss.shutdownGracefully();
            worker.shutdownGracefully();
        }
    }

    static class HeartbeatHandler extends ChannelInboundHandlerAdapter {
        @Override
        public void userEventTriggered(ChannelHandlerContext ctx, Object evt) throws Exception {
            if (evt instanceof IdleStateEvent event) {
                if (event.state() == IdleState.READER_IDLE) {
                    System.out.println("reader idle, close channel");
                    ctx.close();
                }
            } else {
                super.userEventTriggered(ctx, evt);
            }
        }
    }
}
```

### 2. 更常见的“Ping/Pong”模式

真正生产里，更推荐的是“客户端每隔一段时间发一个 Ping，服务端返回 Pong”。这样可以区分“客户端没发数据但连接还活着”和“连接已失效”两种情况。

```java
class PingPongHandler extends ChannelInboundHandlerAdapter {
    @Override
    public void userEventTriggered(ChannelHandlerContext ctx, Object evt) throws Exception {
        if (evt instanceof IdleStateEvent event) {
            if (event.state() == IdleState.WRITER_IDLE) {
                ctx.writeAndFlush("PING\n");
            }
        }
    }

    @Override
    public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception {
        String payload = (String) msg;
        if ("PONG".equals(payload)) {
            System.out.println("received pong");
        } else {
            ctx.fireChannelRead(msg);
        }
    }
}
```

---

## 三、 客户端断线重连

客户端常见做法是把连接逻辑封装成一个“自动重试”的 `Bootstrap`。下面是一个简单的重连模板：

```java
public class ReconnectClient {
    private final String host;
    private final int port;

    public ReconnectClient(String host, int port) {
        this.host = host;
        this.port = port;
    }

    public void start() {
        EventLoopGroup group = new NioEventLoopGroup();
        Bootstrap bootstrap = new Bootstrap();
        bootstrap.group(group)
            .channel(NioSocketChannel.class)
            .handler(new ChannelInitializer<SocketChannel>() {
                @Override
                protected void initChannel(SocketChannel ch) {
                    ch.pipeline().addLast(new SimpleChannelInboundHandler<String>() {
                        @Override
                        protected void channelRead0(ChannelHandlerContext ctx, String msg) {
                            System.out.println("client received: " + msg);
                        }

                        @Override
                        public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) {
                            cause.printStackTrace();
                            ctx.close();
                        }
                    });
                }
            });

        connect(bootstrap, host, port);
    }

    private void connect(Bootstrap bootstrap, String host, int port) {
        bootstrap.connect(host, port).addListener(future -> {
            if (!future.isSuccess()) {
                System.out.println("connect failed, retry in 3s");
                EventLoop loop = ((ChannelFuture) future).channel().eventLoop();
                loop.schedule(() -> connect(bootstrap, host, port), 3, TimeUnit.SECONDS);
            }
        });
    }
}
```

---

## 四、 生产环境建议

1. 心跳频率不要过高：太频繁会增加带宽和 CPU 开销。
2. 超时阈值要结合业务：IM 类场景通常比普通 HTTP 网关更敏感。
3. 关闭后要释放资源：包括 `Channel`、`EventLoopGroup` 和业务线程池。
4. 配合限流与熔断：避免重连风暴，尤其是服务端侧存在热点问题时。

> 核心结论：心跳不是“可有可无的附加功能”，而是长连接系统可靠性和故障恢复能力的基础设施。

---

## 五、 这类案例适合什么场景？

- IM 消息推送
- 物联网设备上报
- 游戏服务器的房间心跳
- 网关与后端服务的链路保活

更多基础内容请阅读 [Netty 快速入门](3-netty-quickstart.md)。
