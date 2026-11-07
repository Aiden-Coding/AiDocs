---
sidebar_position: 13
---

# Next.js App Router 与 Docusaurus 全栈实践

现代 React 已经从单纯的客户端渲染库进化为全栈渲染框架。本章我们将深入剖析 **Next.js 14+ / 15 App Router** 核心架构，详解 **React Server Components (RSC)** 与客户端组件的边界设计、Server Actions 数据流，并分享 **Docusaurus** 静态站点的工程化定制方案。

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
// ❌ 错误示范：Server Component 试图向 Client Component 传递非 Action 函数
// app/product/page.tsx (Server Component)
import LikeButton from './LikeButton';

export default function Page() {
  const handleClick = () => {
    console.log('点击');
  };

  // 报错：无法传递普通函数给客户端组件
  return <LikeButton onClick={handleClick} />;
}
```

---

## 3. Server Actions：全栈数据变更范式

**Server Actions** 是在服务端执行的异步异步函数。可以通过 `'use server'` 指令在 Server Component 内部定义，或者在单独的模块顶部声明并导出给 Client Component 调用。

### 3.1 独立模块声明 Server Actions

```tsx
// app/actions/todos.ts
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';

export async function addTodo(formData: FormData) {
  const title = formData.get('title') as string;
  if (!title || title.trim().length === 0) {
    return { error: '标题不能为空' };
  }

  // 服务端直接写库
  await db.todo.create({ data: { title } });

  // 精准按需失效当前路径的缓存，触发服务端重新渲染
  revalidatePath('/todos');
  return { success: true };
}
```

### 3.2 客户端组件调用 Server Action

```tsx
// app/todos/TodoForm.tsx
'use client';

import { useActionState } from 'react';
import { addTodo } from '@/app/actions/todos';

export function TodoForm() {
  const [state, formAction, isPending] = useActionState(
    async (_prev: any, formData: FormData) => {
      return await addTodo(formData);
    },
    null
  );

  return (
    <form action={formAction}>
      <input type="text" name="title" placeholder="添加待办事项" required />
      <button type="submit" disabled={isPending}>
        {isPending ? '正在保存...' : '添加'}
      </button>
      {state?.error && <p className="error">{state.error}</p>}
    </form>
  );
}
```

---

## 4. Route Handlers：构建 RESTful 与 Webhook API

Next.js App Router 使用 `route.ts` 替代了 Pages Router 下的 `pages/api`，支持原生的 Web `Request` 和 `Response` 标准 API。

```tsx
// app/api/articles/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// 处理 GET 请求
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tag = searchParams.get('tag');

  const articles = await db.article.findMany({
    where: tag ? { tag } : undefined,
    take: 20,
  });

  return NextResponse.json({ code: 0, data: articles });
}

// 处理 POST 请求
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const newArticle = await db.article.create({ data: body });
    return NextResponse.json({ code: 0, data: newArticle }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ code: 500, message: err.message }, { status: 500 });
  }
}
```

---

## 5. Next.js 缓存机制：四层缓存体系

Next.js 14+ 提供了极其强悍且细粒度的缓存机制以压榨服务端响应极限：

| 缓存类型 | 存储位置 | 生命周期 | 用途与策略 |
| :--- | :--- | :--- | :--- |
| **Request Memoization** | 服务端内存 | 单次请求渲染生命周期 | 同一渲染树中重复 `fetch` 自动去重 |
| **Data Cache** | 服务端持久存储 | 跨请求持久有效 | `fetch(url, { next: { revalidate: 3600 } })` 缓存数据 |
| **Full Route Cache** | 服务端持久存储 | 跨请求有效，直到部署或失效 | 静态路由预编译为 HTML 与 RSC Payload |
| **Router Cache** | 客户端内存 | 用户会话期间 | 客户端导航时缓存访问过的页面段 |

```tsx
// 1. 默认持久缓存：无限期有效，直到手动清除 (revalidateTag / revalidatePath)
const res = await fetch('https://api.example.com/data', { cache: 'force-cache' });

// 2. 增量静态再生 (ISR)：缓存 1 小时 (3600 秒)
const res = await fetch('https://api.example.com/data', { next: { revalidate: 3600, tags: ['articles'] } });

// 3. 动态实时请求：禁用缓存
const res = await fetch('https://api.example.com/data', { cache: 'no-store' });
```

---

## 6. Middleware 中间件：全局鉴权与路由守卫

中间件允许在请求到达页面或路由处理器之前拦截并处理请求，例如身份验证、国际化重定向与 A/B 测试：

```tsx
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard');

  // 未登录重定向至登录页
  if (isDashboardRoute && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 正常放行，并可向请求头注入元数据
  const response = NextResponse.next();
  response.headers.set('x-user-authenticated', token ? 'true' : 'false');
  return response;
}

// 仅在指定路由触发中间件
export const config = {
  matcher: ['/dashboard/:path*', '/profile/:path*'],
};
```

---

## 7. 高级路由模式：并行路由与拦截路由

App Router 支持创建复杂交互体验（如弹窗路由与并行加载视窗）：

- **并行路由 (`@slot`)**：允许在同一个父 Layout 下同时渲染多个不同路径的独立页面。例如 `@analytics` 与 `@team`。
- **拦截路由 (`(.)route`)**：允许在客户端软导航时拦截特定路由并以模态框形式展现（如点击图片打开全屏预览弹窗），而在用户刷新或直接分享链接时渲染完整独立页面。

```text
app/
├── feed/
│   ├── page.tsx            # 信息流页面
│   ├── @modal              # 并行插槽
│   │   └── (.)photo/[id]/  # 拦截对 /photo/[id] 的点击，弹窗渲染
│   │       └── page.tsx
│   └── layout.tsx          # 接收 props: { children, modal }
└── photo/[id]/
    └── page.tsx            # 直接在浏览器访问链接时展示的完整页面
```

---

## 8. Docusaurus 主题定制 (Swizzling)

Docusaurus 是一款基于 React 驱动的极佳静态站点生成器。在深度开发文档时，我们需要定制一些默认的内置组件外观。这可以通过 **Swizzling** 技术实现。

Swizzling 可以理解为“撬开”Docusaurus 内置的主题包，将指定组件暴露到项目的 `src/theme` 目录下进行覆盖重写。

### 8.1 Swizzling 操作命令

在项目根目录下运行终端命令（以包装默认的 `DocItem` 组件为例）：

```bash
# 自动生成 src/theme/DocItem 的代码副本，允许自由修改
npm run swizzle @docusaurus/theme-classic DocItem -- --wrap
```

### 8.2 💡 核心示例：安全使用路径映射与 Docusaurus 专属 Hooks

Docusaurus 使用 `<Link>` 和 `useBaseUrl` 来智能管理不同静态资源在生产环境部署时的子路径映射，规避相对路径失效问题：

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
      <Link to="/docs/react/basic/5-hooks">
        去学习核心 Hooks
      </Link>
    </div>
  );
}
```

