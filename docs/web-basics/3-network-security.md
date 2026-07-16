---
title: 现代网络协议与 Web 安全防护规范
sidebar_label: 4. 网络与安全
sidebar_position: 3
---

## 现代网络协议与 Web 安全防护规范

对现代 Web 开发者而言，网络传输效率与系统安全性直接决定了线上产品的生命力。本章将对 HTTP 协议演进、浏览器缓存控制、Web 安全攻防以及跨域（CORS）机制进行全方位的底层解析。

---

## 一、 HTTP 协议的演进 (HTTP/1.1 -> HTTP/2 -> HTTP/3)

从最初的文本协议到现在的二进制协议，HTTP 的每一次大版本迭代都极大地提升了网络资源的加载速度。

### 1.1 HTTP/1.1 的瓶颈与优化

- **核心特性**：默认启用持久连接（`Connection: keep-alive`），支持管道化（Pipelining，但几乎未在主流浏览器中默认启用）。
- **瓶颈**：
  - **队头阻塞 (Head-of-Line Blocking)**：在同一个 TCP 连接上，所有请求都必须按顺序排队。如果前一个请求由于服务器处理缓慢而延迟，后面的所有请求都会被阻塞。
  - **头部冗余**：每次请求和响应都必须携带大量相同的文本 HTTP 头部（Headers），造成带宽的极大浪费。

### 1.2 HTTP/2 的底层突破

HTTP/2 引入了**二进制分帧层（Binary Framing Layer）**，这是其所有核心性能优势的基石：

- **多路复用 (Multiplexing)**：在一个 TCP 连接上，多个请求 and 响应被拆分为独立的二进制帧，交错并并行发送。完全消除了 HTTP 层的队头阻塞，使得浏览器可以并发无限个请求。
- **头部压缩 (HPACK)**：使用 HPACK 算法建立静态和动态索引表，传输时仅发送索引号，对相同头部信息进行极致压缩。
- **服务器推送 (Server Push)**：服务器可以在客户端请求 HTML 时，主动将 CSS、JS 等静态资源推送至客户端缓存。

### 1.3 HTTP/3 的基于 UDP 变革

尽管 HTTP/2 解决了 HTTP 层面上的队头阻塞，但它依然基于 **TCP 协议**。如果 TCP 发生丢包，由于 TCP 的可靠性机制，整个 TCP 连接的滑动窗口都必须暂停，从而导致**传输层的队头阻塞**。

HTTP/3 彻底抛弃了 TCP，采用基于 UDP 协议的 **QUIC 协议**：

- **解决传输层队头阻塞**：QUIC 的多个并发流在丢包时互不干扰，单个流发生丢包只会阻塞该流，其他流的数据包依然能够正常交付。
- **极速握手 (0-RTT)**：QUIC 结合了加密（TLS 1.3）与连接建立过程，使得客户端可以在第一次握手时就直接发送应用数据。
- **连接迁移**：通过“连接 ID”而非 TCP 的“四元组（源 IP、源端口、目的 IP、目的端口）”标识连接。即使用户从 Wi-Fi 切换到 5G 导致 IP 发生改变，网络连接也不会中断，无感继续传输。

---

## 二、 浏览器缓存控制机制 (Caching Strategy)

合理配置浏览器缓存能大幅降低服务器带宽消耗，并实现瞬时加载的秒开体验。缓存可分为**强缓存**与**协商缓存**。

### 2.1 强缓存 (Strong Cache)

如果强缓存命中，浏览器将**不会向服务器发送请求**，而是直接从本地（内存 `from memory cache` 或磁盘 `from disk cache`）读取资源，返回 HTTP `200 OK (from cache)`。

- **`Cache-Control` (HTTP/1.1，推荐优先级最高)**：
  - `private` / `public`：指定资源只能被浏览器客户端缓存，还是允许 CDN 等中间代理服务器缓存。
  - `max-age=31536000`：强缓存的有效时长（单位秒）。
  - `no-cache`：绕过强缓存，**必须向服务器发起协商缓存校验**。
  - `no-store`：**禁止任何缓存**，每次都必须重新下载资源。
- **`Expires` (HTTP/1.0，冷备份)**：
  - 指定一个绝对过期的格林威治时间戳。缺点是依赖客户端系统时间，若本地时间不准确则强缓存失效。

### 2.2 协商缓存 (Validation Cache)

当强缓存过期后，浏览器必须向服务器发起请求，校验本地资源是否依然新鲜。

#### 2.2.1 协商缓存的控制机制

1. **基于修改时间的校验**：
   - **响应头**：`Last-Modified`（资源最后修改时间）。
   - **请求头**：`If-Modified-Since`（下次请求时携带）。
   - **缺点**：时间精度仅到秒级；有些资源仅被修改了时间戳但实际内容未变，也会导致缓存失效。
2. **基于唯一标识 (Hash) 的校验 (推荐优先级更高)**：
   - **响应头**：`ETag`（资源内容的唯一 Hash 值）。
   - **请求头**：`If-None-Match`（下次请求时携带）。
   - **优点**：能够极其精准地识别文件内容是否有实质性修改。

#### 2.2.2 状态码反馈机制

- **304 Not Modified**：服务器发现数据未变更，直接返回 304，通知客户端使用本地旧缓存。
- **200 OK**：服务器发现数据已被更改，直接返回 200 以及最新的文件字节流和 ETag。

---

## 三、 Web 核心安全攻防 (XSS & CSRF & CSP)

开发中必须对用户输入的任何数据持有怀疑态度，建立坚固的安全防线。

### 3.1 跨站脚本攻击 (XSS - Cross-Site Scripting)

- **概念**：攻击者通过向网页中注入恶意的 JavaScript 脚本，在受害者的浏览器上执行，从而盗取 Cookie、发起恶意操作。
- **三种主要类型**：
  1. **反射型**：恶意脚本直接通过 URL 参数或表单提交，被服务器不经处理直接拼接到响应 HTML 中返回。
  2. **存储型 (危害最大)**：恶意脚本被提交并存储到了服务器数据库（如博客评论区），所有访问该页面的正常用户都会被攻击。
  3. **DOM 型**：整个攻击过程纯在客户端执行，由 JS 误用 `innerHTML` 或 `eval` 直接从 URL (`location.search`) 提取参数注入 DOM 引起。
- **核心防护方案**：
  - **HTML 转义 (Escape)**：将所有用户输入的特殊字符进行实体编码（如 `<` 转为 `&lt;`，`>` 转为 `&gt;`）。
  - **设置 `HttpOnly`**：在服务器设置 Cookie 时指定 `HttpOnly` 属性，使客户端 JS 无法通过 `document.cookie` 读取该 Cookie，有效防范 Token 被窃。

### 3.2 跨站请求伪造 (CSRF - Cross-Site Request Forgery)

- **概念**：攻击者引诱受害者访问第三方恶意网站，该网站利用受害者在目标网站已登录的登录凭证（自动携带 Cookie），伪造受害者的身份向目标网站发送恶意请求（如转账、修改密码）。
- **核心防护方案**：
  - **Anti-CSRF Token 校验**：服务器要求客户端在除 Cookie 外的自定义 Header 或 POST 表单中，显式携带一个随机且一次性的 Token，因第三方网站无法跨域读取 Token，故无法伪造请求。
  - **SameSite Cookie 属性**：将敏感 Cookie 设置为 `SameSite=Lax` 或 `SameSite=Strict`，限制第三方网站跨站请求时自动携带 Cookie。

### 3.3 内容安全策略 (CSP - Content Security Policy)

- **概念**：通过配置 HTTP 响应头 `Content-Security-Policy`，告知浏览器哪些外部资源（JS、CSS、图片、iframe）是被允许加载和执行的。它可以从根本上阻断 XSS 脚本向外发包或执行 inline 脚本。
- **示例**：

  ```http
  Content-Security-Policy: default-src 'self'; script-src 'self' https://trustedscripts.com
  ```

---

## 四、 同源策略与 CORS 跨域控制机制

### 4.1 同源策略 (Same-Origin Policy)

同源策略是浏览器最核心的安全基石。它规定：若两个 URL 的**协议 (Protocol)、域名 (Host) 和端口 (Port)** 任何一个不同，则这两个 URL 互为**跨域**。同源策略限制了跨域的 JS 脚本读取本地 DOM、Cookie 或是发起跨域的 XMLHTTPRequest/Fetch 请求。

### 4.2 CORS 跨域资源共享 (Cross-Origin Resource Sharing)

CORS 是 W3C 标准，它允许浏览器通过向服务器发送特定的 HTTP 头部，来安全地打破跨域限制。

#### 4.2.1 简单请求 vs 预检请求 (Preflight Request)

- **简单请求**：满足使用 `GET`/`POST`/`HEAD` 方法且只携带常规 Header（如 `Accept`/`Content-Type: text/plain`）的请求。浏览器会直接发起请求。
- **预检请求**：凡是不满足简单请求条件的请求（如 `Content-Type: application/json` 或使用了 `PUT`/`DELETE` 方法）。浏览器会**首先自动发送一个 `OPTIONS` 方法的预检请求**，向服务器询问是否允许该跨域操作。只有收到允许的响应后，才会发送真正的业务请求。

#### 4.2.2 CORS 常用响应头配置

```http
Access-Control-Allow-Origin: https://myreactapp.com      # 允许跨域的白名单来源
Access-Control-Allow-Methods: GET, POST, PUT, DELETE    # 允许的 HTTP 方法
Access-Control-Allow-Headers: Content-Type, Authorization # 允许的自定义 Header
Access-Control-Allow-Credentials: true                  # 是否允许跨域携带 Cookie
```

### 4.3 常见跨域解决方案

1. **Proxy 反向代理 (开发环境首选)**：
   - **原理**：同源策略是浏览器的限制，服务器与服务器之间不存在跨域限制。
   - **实施**：通过配置 Webpack Dev Server / Vite 的 proxy，或者在生产环境使用 Nginx 反向代理，将客户端的跨域请求代发给真实的后端服务器，使浏览器认为是在同源下通信。
2. **JSONP (淘汰边缘)**：
   - **原理**：利用 `<script>` 标签不受跨域限制的漏洞，通过动态创建 script 并接收一个回调函数来获取数据。由于**仅支持 GET 请求**且存在安全隐患，现代开发已不再推荐使用。
