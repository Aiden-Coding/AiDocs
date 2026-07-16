---
sidebar_position: 8
---

# 测试驱动开发与测试策略

在企业级 React 应用开发中，高质量的测试套件是保障业务迭代不退化的“防弹背心”。本章我们将深入剖析 **React Testing Library (RTL)** 的设计哲学，并展示如何使用 **MSW (Mock Service Worker)** 对异步 API 数据进行三维立体测试。

---

## 1. React Testing Library 的设计哲学

传统的 React 测试工具（如 Enzyme）倾向于测试组件的“内部实现细节”（如检查组件的 state 值是什么，或者查找子组件的实例）。这种测试非常脆弱，一旦重构代码逻辑但功能没变，测试用例就会大面积挂掉。

RTL 提出了颠覆性的测试指导思想：
> **“测试你的组件时，应该尽可能像真实用户在跟它交互一样进行。”**

### RTL 核心测试准则

- **测试用户体验而非实现**：用户看不到 state，用户只看得见 DOM 上的按钮、文字和输入框。
- **优先使用语义化查询 (Queries)**：
  - 首选 `getByRole`（按无障碍角色查询，如 `button`、`heading`），这能顺带检查页面是否具备无障碍易用性。
  - 次选 `getByText`（按文本查询）。
  - 最后万不得已，再使用 `getByTestId`（按自定义测试 ID 查询）。

---

## 2. Vitest 与 RTL 环境基本配置

在现代化项目中，我们通常选择轻量、极速的 **Vitest** 结合 **RTL** 构建测试环境。

```javascript
// vitest.config.ts (极简参考配置)
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom', // 提供模拟浏览器 DOM 环境
    setupFiles: './src/setupTests.ts', // 引入额外的断言库扩展
  },
});
```

在 `setupTests.ts` 中引入 `@testing-library/jest-dom` 以获得诸如 `toBeInTheDocument` 的断言扩展：

```typescript
import '@testing-library/jest-dom';
```

---

## 3. 实战：使用 MSW 进行异步网络组件测试

在真实业务中，最难写、最具含金量的是**异步网络请求交互测试**。直接 mock 全局的 `fetch` 会让测试用例变得非常假。**MSW (Mock Service Worker)** 的核心原理是：**拦截真实的浏览器/Node.js 网络请求层，并返回模拟的数据**，从而支持组件运行最真实的网络逻辑。

### 1. 业务组件代码

```tsx
import { useState } from 'react';

export function UserLoader() {
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/user/active');
      if (!res.ok) throw new Error('接口出错');
      const data = await res.json();
      setUser(data);
    } catch (err: any) {
      setError(err.message || '加载出错');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleFetch} disabled={loading}>获取当前用户</button>
      {loading && <p role="status">正在努力加载中...</p>}
      {error && <p className="error-msg">{error}</p>}
      {user && <p className="success-msg">用户名：{user.name}</p>}
    </div>
  );
}
```

### 2. 测试用例编写 (MSW + RTL)

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { UserLoader } from './UserLoader';
import { beforeAll, afterAll, afterEach, test, expect } from 'vitest';

// 1. 初始化 Mock Server 并定义 API 拦截处理器
const server = setupServer(
  http.get('/api/user/active', () => {
    return HttpResponse.json({ name: '李四' });
  })
);

// 2. 绑定生命周期钩子，托管请求拦截
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('异步成功加载用户信息流程', async () => {
  // A. 渲染组件
  render(<UserLoader />);

  const fetchBtn = screen.getByRole('button', { name: /获取当前用户/i });
  expect(screen.queryByText(/用户名：/i)).not.toBeInTheDocument();

  // B. 模拟用户点击交互
  await userEvent.click(fetchBtn);

  // C. 校验 Loading 挂起态展示
  expect(screen.getByRole('status')).toHaveTextContent('正在努力加载中...');

  // D. 等待异步 DOM 变化出现
  await waitFor(() => {
    expect(screen.getByText('用户名：李四')).toBeInTheDocument();
  });
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('接口报错时的异常捕获展示流程', async () => {
  // 单次覆盖：将接口拦截改写为返回 500 报错
  server.use(
    http.get('/api/user/active', () => {
      return new HttpResponse(null, { status: 500 });
    })
  );

  render(<UserLoader />);
  const fetchBtn = screen.getByRole('button', { name: /获取当前用户/i });

  await userEvent.click(fetchBtn);

  await waitFor(() => {
    expect(screen.getByText('加载出错')).toBeInTheDocument();
  });
});
```
