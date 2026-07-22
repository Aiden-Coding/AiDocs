---
sidebar_position: 7
---

# React Router 路由体系与架构实践

在构建单页应用（Single Page Application, SPA）时，**客户端路由（Client-Side Routing）** 是实现页面无刷新跳转、URL 状态同步与视图组织的核心。React 社区事实上的路由标准是 **React Router**（目前主力为 v6，并已逐步演进为 v7/Remix 模式）。

本章将系统解析 React Router v6/v7 的核心概念、声明式与命令式导航、嵌套路由（Nested Routes）、数据加载器（Data Loaders）与 Actions，以及生产环境中的路由守卫与性能优化策略。

---

## 1. React Router 核心思想与基本配置

React Router 6 摒弃了早期版本的复杂重定向机制，采用了组件化、扁平与嵌套相结合的路由配置树。

### 1.1 安装与环境集成

在 Vite 或 React 应用中安装核心依赖：

```bash
npm install react-router-dom
```

### 1.2 路由提供者设置

现代 React Router 推荐使用 `createBrowserRouter` 与 `<RouterProvider>` 组合，以开启数据加载（Data Loading）和并发渲染特性：

```tsx
// src/router/index.tsx
import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import RootLayout from '../layouts/RootLayout';
import HomePage from '../pages/HomePage';
import NotFoundPage from '../pages/NotFoundPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <NotFoundPage />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'dashboard',
        // 动态懒加载组件
        lazy: async () => {
          const Dashboard = await import('../pages/Dashboard');
          return { Component: Dashboard.default };
        },
      },
      {
        path: 'old-home',
        element: <Navigate to="/" replace />,
      }
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
```

---

## 2. 嵌套路由与 Layout 组织

嵌套路由（Nested Routing）是 React Router 最强大的特性之一，允许 URL 的层级关系直接映射到组件树的嵌套层级中，实现局部 UI 的复用与平滑切换。

### 2.1 嵌套结构与 `<Outlet />` 占位

父级布局组件使用 `<Outlet />` 来指定子路由组件的渲染位置：

```tsx
// src/layouts/RootLayout.tsx
import React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';

export default function RootLayout() {
  return (
    <div className="app-container">
      <header className="navbar">
        <h1>React App</h1>
        <nav>
          {/* NavLink 自动支持 active 状态处理 */}
          <NavLink
            to="/"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            首页
          </NavLink>
          <NavLink
            to="/dashboard"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            控制台
          </NavLink>
        </nav>
      </header>

      <main className="content">
        {/* 子路由匹配的组件将渲染在 Outlet 中 */}
        <Outlet />
      </main>
    </div>
  );
}
```

---

## 3. 核心 Hooks 与状态传递

React Router 提供了丰富的 Hooks，用于在组件内部获取路由信息或执行导航逻辑。

### 3.1 常用 Hooks 汇总

| Hook | 核心用途 | 典型场景 |
| :--- | :--- | :--- |
| `useNavigate` | 命令式页面跳转与历史记录操作 | 表单提交后重定向、取消按钮返回 |
| `useParams` | 读取动态路径参数（`:id`） | 商品详情页 `/product/:id` |
| `useSearchParams` | 读取与修改 URL 查询参数（`?query=react`） | 列表筛选、分页与搜索关键字绑定 |
| `useLocation` | 获取当前 Location 对象 | 埋点统计、获取跳转前携带的 state |

### 3.2 命令式导航与参数读取实战

```tsx
// src/pages/ProductDetail.tsx
import React from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const tab = searchParams.get('tab') || 'overview';

  const handleTabChange = (newTab: string) => {
    // 更新 URL 中的 search params 但不刷新页面
    setSearchParams({ tab: newTab });
  };

  const handleBack = () => {
    // 返回上一页，或者跳转至指定路径
    if (location.state?.from) {
      navigate(location.state.from);
    } else {
      navigate('/products', { replace: true });
    }
  };

  return (
    <div className="product-detail">
      <button onClick={handleBack}>返回列表</button>
      <h2>商品详情 ID: {id}</h2>
      
      <div className="tabs">
        <button
          className={tab === 'overview' ? 'active' : ''}
          onClick={() => handleTabChange('overview')}
        >
          概览
        </button>
        <button
          className={tab === 'reviews' ? 'active' : ''}
          onClick={() => handleTabChange('reviews')}
        >
          评价
        </button>
      </div>

      <div className="tab-content">
        {tab === 'overview' && <p>商品概览信息...</p>}
        {tab === 'reviews' && <p>用户评价列表...</p>}
      </div>
    </div>
  );
}
```

---

## 4. 数据加载机制 (Loader & Action)

React Router v6.4+ 引入了类似全栈框架的数据加载架构，允许在组件渲染**之前**并行发起数据请求，从根本上解决“瀑布流渲染（Waterfall Rendering）”问题。

### 4.1 使用 Loader 获取数据与 `useLoaderData`

```tsx
// src/pages/UserList.tsx
import React from 'react';
import { useLoaderData, defer, Await } from 'react-router-dom';

export interface User {
  id: string;
  name: string;
}

// 1. 定义 Loader 函数
export async function userListLoader() {
  const res = await fetch('/api/users');
  if (!res.ok) {
    throw new Response('加载用户失败', { status: res.status });
  }
  const users: User[] = await res.json();
  return { users };
}

// 2. 组件内部使用 Hook 消费 Loader 返回的数据
export default function UserList() {
  const { users } = useLoaderData() as { users: User[] };

  return (
    <div>
      <h3>用户列表</h3>
      <ul>
        {users.map((user) => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 5. 生产环境路由守卫与权限控制

在企业级应用中，受保护的路由（如后台管理面板、个人中心）必须要求用户已登录并具备指定权限。

### 5.1 受保护路由（Protected Route）封装

```tsx
// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="loading-spinner">检查登录状态中...</div>;
  }

  // 1. 未登录，重定向至登录页并记录当前位置（以便登录后原路返回）
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. 权限不足，跳转至无权限提示页
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}
```

---

## 6. 总结与最佳实践

1. **结构组织**：优先使用 `createBrowserRouter` + `RouterProvider`，获得最新的异步数据流与懒加载优化。
2. **状态与 URL 绑定**：善用 `useSearchParams` 将筛选、分页等 UI 状态暴露在 URL 中，增强可分享性。
3. **代码分割**：在中大型应用中，务必对非首屏路由页面使用 `lazy()` 进行按需加载，降低首屏 JS Bundle 体积。
