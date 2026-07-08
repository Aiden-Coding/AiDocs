---
title: Netty 实战：构建一个简易 RPC 框架
hide_title: true
sidebar_label: 简易 RPC 实战
---

## Netty 实战：构建一个简易 RPC 框架

RPC 是分布式系统的核心基座之一。虽然成熟框架如 Dubbo、gRPC 早已成熟，但手写一个简易 RPC 仍然是学习 Netty 最好的方式之一。它能把“编解码、线程模型、连接管理、请求响应”这些概念串起来。

---

## 一、 RPC 的核心抽象

一个简化版 RPC 至少要包含以下几部分：

1. 服务接口：客户端调用的契约。
2. 请求对象：包含方法名、参数、请求 ID。
3. 响应对象：包含结果、异常信息和请求 ID。
4. 编解码器：把对象序列化成字节流。
5. 传输层：通过 Netty 把请求发到服务端并拿回响应。

---

## 二、 定义请求与响应对象

```java
public class RpcRequest {
    private String requestId;
    private String serviceName;
    private String methodName;
    private Class<?>[] parameterTypes;
    private Object[] args;

    // getter/setter
}

public class RpcResponse {
    private String requestId;
    private Object result;
    private String error;

    // getter/setter
}
```

---

## 三、 服务端示例

```java
import io.netty.bootstrap.ServerBootstrap;
import io.netty.channel.*;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.SocketChannel;
import io.netty.channel.socket.nio.NioServerSocketChannel;
import io.netty.handler.codec.serialization.ClassResolvers;
import io.netty.handler.codec.serialization.ObjectDecoder;
import io.netty.handler.codec.serialization.ObjectEncoder;

public class RpcServer {
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
                        ch.pipeline().addLast(new ObjectDecoder(1024 * 1024, ClassResolvers.cacheDisabled(null)));
                        ch.pipeline().addLast(new ObjectEncoder());
                        ch.pipeline().addLast(new SimpleChannelInboundHandler<RpcRequest>() {
                            @Override
                            protected void channelRead0(ChannelHandlerContext ctx, RpcRequest request) {
                                RpcResponse response = new RpcResponse();
                                response.setRequestId(request.getRequestId());
                                response.setResult("hello, " + request.getServiceName());
                                ctx.writeAndFlush(response);
                            }
                        });
                    }
                });

            bootstrap.bind(9000).sync().channel().closeFuture().sync();
        } finally {
            boss.shutdownGracefully();
            worker.shutdownGracefully();
        }
    }
}
```

> 这里为了便于说明，使用了 Java 原生序列化；真实项目里更推荐使用 Protobuf、Hessian 或 Kryo。

---

## 四、 客户端调用示例

```java
public class RpcClient {
    public static void main(String[] args) throws Exception {
        EventLoopGroup group = new NioEventLoopGroup();
        try {
            Bootstrap bootstrap = new Bootstrap();
            bootstrap.group(group)
                .channel(NioSocketChannel.class)
                .handler(new ChannelInitializer<SocketChannel>() {
                    @Override
                    protected void initChannel(SocketChannel ch) {
                        ch.pipeline().addLast(new ObjectDecoder(1024 * 1024, ClassResolvers.cacheDisabled(null)));
                        ch.pipeline().addLast(new ObjectEncoder());
                        ch.pipeline().addLast(new SimpleChannelInboundHandler<RpcResponse>() {
                            @Override
                            protected void channelRead0(ChannelHandlerContext ctx, RpcResponse response) {
                                System.out.println("rpc response: " + response.getResult());
                            }
                        });
                    }
                });

            ChannelFuture future = bootstrap.connect("127.0.0.1", 9000).sync();
            RpcRequest request = new RpcRequest();
            request.setRequestId("1");
            request.setServiceName("HelloService");
            request.setMethodName("sayHello");
            future.channel().writeAndFlush(request).sync();
            future.channel().closeFuture().sync();
        } finally {
            group.shutdownGracefully();
        }
    }
}
```

---

## 五、 这个最小 RPC 版本还缺什么？

真正的工业级 RPC 还需要补齐这些能力：

- 服务注册与发现：如 Zookeeper、Nacos、Consul。
- 超时与重试：客户端要防止调用阻塞。
- 负载均衡：多个服务实例时需要做路由。
- 序列化协议：Protobuf、Hessian、Kryo 的性能优势更明显。
- 熔断与限流：防止上游雪崩。

---

## 六、 为什么适合拿来练手？

因为它把 Netty 的几个关键能力一次性串起来：

- 连接管理
- 编解码
- 请求响应模型
- 异步回调
- 线程模型

如果你已经会了 Echo、心跳和 WebSocket，再把这个 RPC 小框架跑通，基本就能把 Netty 的“工程化使用”理解得很深了。
