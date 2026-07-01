---
sidebar_position: 10
---

# Next.js App Router 与 Docusaurus 定制

本文深入探索 Next.js 14+ App Router 架构的服务端组件模型，以及 Docusaurus 静态站点生成的主题定制、路径管理与性能优化策略。

---

## 1. Next.js App Router 核心概念

Next.js 13+ 引入的 App Router 是基于 React Server Components (RSC) 的全新路由系统，彻底改变了传统的 Pages Router 架构。

### 1.1 Server Components vs Client Components

```tsx
// app/ServerComponent.tsx
// 默认情况下，所有组件都是 Server Components
export default function ServerComponent() {
  // 可以直接访问数据库、文件系统
  const data = await fetchDataFromDatabase();
  
  return <div>{data.title}</div>;
}

// app/ClientComponent.tsx
'use client'; // 显式标记为客户端组件

import { useState } from 'react';

export default function ClientComponent() {
  const [count, setCount] = useState(0);
  
  // 可以使用 Hooks 和浏览器 API
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

**Server Components 特性**：
- 在服务器端渲染，不打包到客户端 Bundle
- 可以直接访问后端资源（数据库、文件系统）
- 无法使用 Hooks、浏览器 API、事件处理器

**Client Components 特性**：
- 使用 `'use client'` 指令标记
- 支持所有 React 特性（Hooks、事件处理）
- 会打包到客户端 Bundle

### 1.2 组件组合模式

```tsx
// app/page.tsx - Server Component
import ClientSidebar from './ClientSidebar';
import ServerContent from './ServerContent';

export default function Page() {
  return (
    <div>
      {/* Server Component 可以渲染 Client Component */}
      <ClientSidebar />
      
      {/* Server Component 可以渲染其他 Server Component */}
      <ServerContent />
    </div>
  );
}

// app/ClientSidebar.tsx
'use client';

export default function ClientSidebar({ children }) {
  // Client Component 可以接收 Server Component 作为 children
  return (
    <aside>
      {children}
    </aside>
  );
}
```

### 1.3 数据获取模式

```tsx
// app/posts/[id]/page.tsx
interface PageProps {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

// Server Component 中直接使用 async/await
export default async function PostPage({ params }: PageProps) {
  // 并行获取数据
  const [post, comments] = await Promise.all([
    fetch(`/api/posts/${params.id}`).then(r => r.json()),
    fetch(`/api/posts/${params.id}/comments`).then(r => r.json())
  ]);

  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
      <CommentList comments={comments} />
    </article>
  );
}

// 生成静态参数（SSG）
export async function generateStaticParams() {
  const posts = await fetch('/api/posts').then(r => r.json());
  
  return posts.map((post) => ({
    id: post.id.toString()
  }));
}
```

### 1.4 路由组与布局

```tsx
// app/layout.tsx - 根布局
export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>
        <header>网站头部</header>
        {children}
        <footer>网站底部</footer>
      </body>
    </html>
  );
}

// app/dashboard/layout.tsx - 嵌套布局
export default function DashboardLayout({ children }) {
  return (
    <div className="dashboard">
      <nav>仪表盘导航</nav>
      <main>{children}</main>
    </div>
  );
}

// app/dashboard/page.tsx
export default function DashboardPage() {
  return <h1>仪表盘首页</h1>;
}
```

---

## 2. Docusaurus 主题定制

Docusaurus 是基于 React 的静态站点生成器，广泛用于技术文档站点。

### 2.1 Swizzling 主题组件

Swizzling 允许你覆盖或包装 Docusaurus 内置组件。

```bash
# 查看可 Swizzle 的组件
npm run swizzle @docusaurus/theme-classic -- --list

# Swizzle 特定组件
npm run swizzle @docusaurus/theme-classic Footer -- --eject
```

**两种 Swizzle 模式**：
- `--eject`：完全复制组件源码，可完全自定义
- `--wrap`：包装原组件，只添加额外功能

```tsx
// src/theme/Footer/index.tsx - 自定义 Footer
import React from 'react';
import Footer from '@theme-original/Footer';

export default function FooterWrapper(props) {
  return (
    <>
      <Footer {...props} />
      <div className="custom-footer">
        <p>自定义底部内容</p>
      </div>
    </>
  );
}
```

### 2.2 自定义 CSS 与主题变量

```css
/* src/css/custom.css */
:root {
  /* 主色调 */
  --ifm-color-primary: #2e8555;
  --ifm-color-primary-dark: #29784c;
  
  /* 代码块 */
  --ifm-code-font-size: 95%;
  
  /* 导航栏 */
  --ifm-navbar-height: 4rem;
}

/* 深色模式 */
[data-theme='dark'] {
  --ifm-color-primary: #25c2a0;
  --ifm-background-color: #1b1b1d;
}

/* 自定义组件样式 */
.custom-card {
  border: 1px solid var(--ifm-color-emphasis-300);
  border-radius: 8px;
  padding: 1rem;
}
```

### 2.3 MDX 组件注入

```tsx
// src/theme/MDXComponents.tsx
import React from 'react';
import MDXComponents from '@theme-original/MDXComponents';
import Highlight from '@site/src/components/Highlight';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

export default {
  ...MDXComponents,
  Highlight, // 可在 MDX 中直接使用 <Highlight>
  Tabs,
  TabItem
};
```

在 MDX 文件中使用：

````mdx
# 我的文档

<Highlight color="#25c2a0">重点内容</Highlight>

<Tabs>
  <TabItem value="js" label="JavaScript">
    ```js
    console.log('Hello');
    ```
  </TabItem>
  <TabItem value="ts" label="TypeScript">
    ```ts
    const msg: string = 'Hello';
    ```
  </TabItem>
</Tabs>
````

### 2.4 useBaseUrl 路径管理

```tsx
import useBaseUrl from '@docusaurus/useBaseUrl';
import { useHistory } from '@docusaurus/router';

function MyComponent() {
  // 自动处理 baseUrl 前缀
  const logoUrl = useBaseUrl('/img/logo.svg');
  const docsUrl = useBaseUrl('/docs/intro');
  
  const history = useHistory();
  
  const navigateToDocs = () => {
    history.push(docsUrl);
  };
  
  return (
    <div>
      <img src={logoUrl} alt="Logo" />
      <button onClick={navigateToDocs}>查看文档</button>
    </div>
  );
}
```

---

## 3. 性能优化策略

### 3.1 Next.js 优化

**图片优化**：

```tsx
import Image from 'next/image';

function HeroSection() {
  return (
    <Image
      src="/hero.jpg"
      alt="Hero"
      width={1200}
      height={600}
      priority // 预加载关键图片
      placeholder="blur" // 模糊占位符
    />
  );
}
```

**字体优化**：

```tsx
// app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap' // 字体交换策略
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
```

**路由预取**：

```tsx
import Link from 'next/link';

function Navigation() {
  return (
    <nav>
      {/* 默认预取可见链接 */}
      <Link href="/about">关于</Link>
      
      {/* 禁用预取 */}
      <Link href="/heavy-page" prefetch={false}>
        重页面
      </Link>
    </nav>
  );
}
```

### 3.2 Docusaurus 优化

**代码分割**：

```tsx
import React, { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

function MyPage() {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <HeavyComponent />
    </Suspense>
  );
}
```

**静态资源压缩**：

```js
// docusaurus.config.js
module.exports = {
  webpack: {
    jsLoader: (isServer) => ({
      loader: require.resolve('swc-loader'),
      options: {
        jsc: {
          parser: {
            syntax: 'typescript',
            tsx: true,
          },
          minify: {
            compress: true,
            mangle: true
          }
        },
      },
    }),
  },
};
```

---

## 4. 常见问题与解决方案

### 问题 1：Hydration 不匹配

**原因**：Server Component 和 Client Component 渲染结果不一致。

**解决方案**：

```tsx
'use client';

import { useEffect, useState } from 'react';

function TimeDisplay() {
  const [time, setTime] = useState<string | null>(null);
  
  useEffect(() => {
    // 客户端挂载后再显示时间
    setTime(new Date().toLocaleTimeString());
  }, []);
  
  return <div>{time || '加载中...'}</div>;
}
```

### 问题 2：Docusaurus 构建时访问浏览器 API

**解决方案**：

```tsx
import BrowserOnly from '@docusaurus/BrowserOnly';
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';

function SafeComponent() {
  // 方法 1：BrowserOnly
  return (
    <BrowserOnly>
      {() => <div>窗口宽度: {window.innerWidth}</div>}
    </BrowserOnly>
  );
  
  // 方法 2：ExecutionEnvironment
  if (ExecutionEnvironment.canUseDOM) {
    console.log(window.location.href);
  }
}
```

---

## 总结

- **Next.js App Router**：拥抱 Server Components，合理划分客户端与服务端边界
- **Docusaurus**：通过 Swizzling 和 MDX 定制实现灵活的文档体验
- **性能优化**：利用框架内置工具（Image、Font、Suspense）提升加载性能
- **SSR/SSG 防护**：始终注意服务端与客户端的环境差异，使用适当的防护模式
