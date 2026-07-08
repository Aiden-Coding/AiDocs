---
title: Netty 实战：HTTP 服务与 WebSocket 长连接
hide_title: true
sidebar_label: HTTP 与 WebSocket
---

## Netty 实战：HTTP 服务与 WebSocket 长连接

HTTP 仍然是互联网最常见的协议，而 WebSocket 则是在浏览器和服务端之间建立长连接的核心方案。Netty 同时支持这两类场景，尤其适合做网关、消息推送和实时聊天系统。

---

## 一、 搭建一个最小的 HTTP 服务

Netty 提供了 `HttpServerCodec` 和 `HttpObjectAggregator`，可以很快搭出一个简洁的 HTTP 服务。

```java
import io.netty.bootstrap.ServerBootstrap;
import io.netty.channel.*;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.SocketChannel;
import io.netty.channel.socket.nio.NioServerSocketChannel;
import io.netty.handler.codec.http.*;
import io.netty.handler.stream.ChunkedWriteHandler;
import io.netty.util.CharsetUtil;

public class HttpServer {
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
                        ch.pipeline().addLast(new HttpServerCodec());
                        ch.pipeline().addLast(new HttpObjectAggregator(65536));
                        ch.pipeline().addLast(new ChunkedWriteHandler());
                        ch.pipeline().addLast(new SimpleChannelInboundHandler<FullHttpRequest>() {
                            @Override
                            protected void channelRead0(ChannelHandlerContext ctx, FullHttpRequest req) {
                                String path = req.uri();
                                String body = "hello from netty http: " + path;

                                FullHttpResponse response = new DefaultFullHttpResponse(
                                    HttpVersion.HTTP_1_1,
                                    HttpResponseStatus.OK,
                                    Unpooled.copiedBuffer(body, CharsetUtil.UTF_8)
                                );
                                response.headers().set(HttpHeaderNames.CONTENT_TYPE, "text/plain; charset=utf-8");
                                response.headers().setInt(HttpHeaderNames.CONTENT_LENGTH, body.length());
                                ctx.writeAndFlush(response);
                            }
                        });
                    }
                });

            bootstrap.bind(8082).sync().channel().closeFuture().sync();
        } finally {
            boss.shutdownGracefully();
            worker.shutdownGracefully();
        }
    }
}
```

---

## 二、 用 WebSocket 做实时消息推送

如果你要做在线聊天、实时订单通知或消息广播，WebSocket 是更自然的选择。

### 1. 服务端升级协议

```java
import io.netty.channel.*;
import io.netty.handler.codec.http.*;
import io.netty.handler.codec.http.websocketx.*;

public class WebSocketHandler extends SimpleChannelInboundHandler<Object> {
    private WebSocketServerHandshaker handshaker;

    @Override
    protected void channelRead0(ChannelHandlerContext ctx, Object msg) {
        if (msg instanceof FullHttpRequest req) {
            WebSocketServerHandshakerFactory factory =
                new WebSocketServerHandshakerFactory("ws://localhost:8083/ws", null, true);
            handshaker = factory.newHandshaker(req);
            if (handshaker != null) {
                handshaker.handshake(ctx.channel(), req);
            }
        } else if (msg instanceof WebSocketFrame frame) {
            if (frame instanceof TextWebSocketFrame textFrame) {
                ctx.channel().writeAndFlush(new TextWebSocketFrame("echo: " + textFrame.text()));
            }
        }
    }
}
```

### 2. 浏览器客户端示例

```html
<script>
  const ws = new WebSocket('ws://localhost:8083/ws');
  ws.onopen = () => ws.send('hello from browser');
  ws.onmessage = evt => console.log(evt.data);
</script>
```

---

## 三、 典型场景拆解

### 1. 网关场景

Netty 常用于 API 网关，因为它天然适合做：

- 请求路由
- 限流
- 熔断
- 长连接代理

### 2. 实时聊天场景

WebSocket 适合做：

- 在线客服
- 实时消息推送
- 直播间弹幕

### 3. 统一协议入口

很多公司会通过 Netty 做统一协议网关，把 TCP/UDP/HTTP 的请求统一接入，再分发给内部微服务。

---

## 四、 设计要点

1. HTTP 走 `HttpServerCodec`，不要手写裸字节。
2. WebSocket 统一使用 `TextWebSocketFrame` / `BinaryWebSocketFrame`。
3. HTTP 和 WebSocket 的 Handler 要分层，避免协议混淆。
4. 如果要做大流量网关，建议再加上限流、熔断和日志链路。

这类实战特别适合做企业级网关、消息推送平台和实时协作系统。
