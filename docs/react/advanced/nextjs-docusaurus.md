---
sidebar_position: 11
---

# Next.js App Router 与 Docusaurus 全栈实践

现代 React 已经从单纯的客户端渲染库进化为全栈渲染框架。本章我们将深入剖析 **Next.js 14+ App Router** 核心架构，详解 **React Server Components (RSC)** 与客户端组件的边界设计，并分享 **Docusaurus** 静态站点的工程化定制方案。

---

## 1. Next.js App Router 与 React Server Components (RSC)

Next.js 13+ 引入的 App Router 建立在 React Server Components (RSC) 基础之上。在这一模型中，**默认所有在 `app` 目录下的组件都是服务端组件**。

### Server Components vs Client Components

- **Server Components (服务端组件)**：
  - **执行环境**：仅在服务端执行，直接渲染出 HTML 并流式传送到浏览器。
  - **打包体积**：其依赖的包（如 marked 渲染库、数据库连接驱动）只在服务端运行，**不会被打包进客户端 JS 中**，从而实现了极致的包体积优化（Zero Bundle Size）。
  - **限制**：**不能**使用 `useState`、`useEffect` 等 Hook，**不能**绑定 `onClick` 等客户端事件监听。
- **Client Components (客户端组件)**：
  - **开启方式**：在文件最顶部添加 `'use client'` 指令。
  - **执行环境**：先在服务端预渲染 HTML（SSR），然后在浏览器中进行 Hydration 注水以激活交互。
  - **限制**：不能直接读取服务端专有的文件系统或直连数据库。

---

## 2. RSC 序列化限制与数据穿透

在将数据从 Server Component 传递给 Client Component 时，所有传递的 Props 必须是**可序列化的（Serializable）**。

- **允许的数据**：普通的 JSON 数据（字符串、数字、布尔值、普通的数组和对象）。
- **禁止的数据**：**函数**（如事件回调）、**类实例**（Class Instances）、**Symbol** 等。

```tsx
// ❌ 错误示范：Server Component 试图向 Client Component 传递函数
// app/product/page.tsx (Server Component)
import LikeButton from './LikeButton';

export default function Page() {
  const handleLike = () => {
    'use server';
    console.log('点赞成功');
  };

  // 报错：无法传递函数给客户端组件
  return <LikeButton onLike={handleLike} />;
}
```

---

## 3. Next.js 缓存机制：Data Cache 与 Full Route Cache

Next.js 14+ 提供了极其强悍且细粒度的缓存机制以压榨服务端响应极限。

### 1) Data Cache (数据缓存)
Next.js 拦截并增强了原生的 `fetch` 方法。请求的数据会被自动持久化缓存到服务器硬盘中，即使服务器重启，下一次请求依然直接读取缓存。

```tsx
// 默认缓存：无限期有效，直到手动清除 (revalidate)
const res = await fetch('https://api.example.com/data', { cache: 'force-cache' });

// 增量失效 (ISR)：缓存 1 小时 (3600 秒)
const res = await fetch('https://api.example.com/data', { next: { revalidate: 3600 } });

// 禁用缓存：每次请求都走网络
const res = await fetch('https://api.example.com/data', { cache: 'no-store' });
```

### 2) Full Route Cache (整页路由缓存)
在构建期，Next.js 会自动分析所有路由。如果检测到某个路由只依赖静态数据（即整个路径上没有使用 headers、cookies、searchParams，且 fetch 请求均开启了缓存），Next.js 会直接**将整个路由编译为静态 HTML 和 JSON 缓存文件**。
当用户请求时，服务器会以零计算开销、微秒级的速度直接从内存或文件缓存中返回该路由。

---

## 4. Docusaurus 主题定制 (Swizzling)

Docusaurus 是一款基于 React 驱动的极佳静态站点生成器。在深度开发文档时，我们需要定制一些默认的内置组件外观。这可以通过 **Swizzling** 技术实现。

Swizzling 可以理解为“撬开”Docusaurus 内置的主题包，将指定组件暴露到项目的 `src/theme` 目录下进行覆盖重写。

### Swizzling 操作命令
在项目根目录下运行终端命令（以包装默认的 `DocItem` 组件为例）：

```bash
# 自动生成 src/theme/DocItem 的代码副本，允许你自由修改
npm run swizzle @docusaurus/theme-classic DocItem -- --wrap
```

### 💡 核心示例：安全使用路径映射与 Docusaurus 专属 Hooks

Docusaurus 使用 `<Link>` 和 `useBaseUrl` 来智能管理不同静态资源在生产环境部署时的子路径映射，规避相对路径失效问题。

```tsx
import useBaseUrl from '@docusaurus/useBaseUrl';
import Link from '@docusaurus/Link';

export function NavigationCard() {
  // 智能补全部署子路径前缀，防止 CDN 路径丢失
  const logoUrl = useBaseUrl('/img/logo.png');

  return (
    <div className="nav-card">
      <img src={logoUrl} alt="Logo" />
      {/* Link 能够自动实现首屏预加载，优化静态切换体验 */}
      <Link to="/docs/react/basic/hooks">
        去学习核心 Hooks
      </Link>
    </div>
  );
}
```
