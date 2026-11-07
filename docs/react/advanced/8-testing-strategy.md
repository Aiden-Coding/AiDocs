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

---

## 4. 自定义 Hook 测试实战：renderHook 与 act

很多时候我们封装了纯逻辑的自定义 Hook（如计数器、分页、窗口监听、防抖等），并没有独立的 JSX 视图。使用 RTL 提供的 `renderHook` 可以直接对其进行单元测试，并通过 `act` 触发内部状态演进。

### 4.1 待测自定义 Hook

```tsx
// useCounter.ts
import { useState, useCallback } from 'react';

export function useCounter(initialValue: number = 0, step: number = 1) {
  const [count, setCount] = useState(initialValue);

  const increment = useCallback(() => setCount((c) => c + step), [step]);
  const decrement = useCallback(() => setCount((c) => c - step), [step]);
  const reset = useCallback(() => setCount(initialValue), [initialValue]);

  return { count, increment, decrement, reset };
}
```

### 4.2 编写 Hook 单元测试

```tsx
// useCounter.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useCounter } from './useCounter';

describe('useCounter 自定义 Hook 测试', () => {
  it('应正确使用初始值初始化', () => {
    const { result } = renderHook(() => useCounter(10));
    expect(result.current.count).toBe(10);
  });

  it('调用 increment 应按步长递增', () => {
    const { result } = renderHook(() => useCounter(0, 5));

    // 修改内部 React 状态的调用必须包裹在 act 中
    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(5);
  });

  it('支持响应 Props 动态更新 (rerender)', () => {
    let step = 1;
    const { result, rerender } = renderHook(() => useCounter(0, step));

    act(() => {
      result.current.increment();
    });
    expect(result.current.count).toBe(1);

    // 改变参数并重新渲染 Hook
    step = 10;
    rerender();

    act(() => {
      result.current.increment();
    });
    expect(result.current.count).toBe(11);
  });
});
```

---

## 5. 带全局状态与路由的自定义测试渲染器 (Custom Render)

在真实业务开发中，大部分组件都会依赖外部环境（如 React Query、Redux、Zustand、React Router 或国际化 Provider）。如果每次写测试都手动包裹一堆 Provider，代码会极度臃肿。标准实践是封装一个统一的 `customRender`：

```tsx
// test-utils.tsx
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// 创建适合测试环境的纯净 QueryClient，关闭失败重试
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

interface AllTheProvidersProps {
  children: React.ReactNode;
  initialRoute?: string;
}

export function AllTheProviders({ children, initialRoute = '/' }: AllTheProvidersProps) {
  const testQueryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={testQueryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// 导出的自定义 render 函数
export const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { initialRoute?: string }
) => {
  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders initialRoute={options?.initialRoute}>
        {children}
      </AllTheProviders>
    ),
    ...options,
  });
};

// 重新导出 RTL 所有方法，外部只引入 test-utils 即可
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
```

---

## 6. 表单交互与无障碍可访问性 (a11y) 深度断言

```tsx
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { customRender } from './test-utils';
import { LoginForm } from './LoginForm';

test('用户能通过键盘 Tab 与回车键完成完整无障碍表单流', async () => {
  const user = userEvent.setup();
  customRender(<LoginForm />);

  // 1. 无障碍查询：确保输入框关联了 label 标签
  const emailInput = screen.getByLabelText(/电子邮箱/i);
  const passwordInput = screen.getByLabelText(/密码/i);
  const submitButton = screen.getByRole('button', { name: /登录/i });

  // 2. 模拟真实键盘输入
  await user.type(emailInput, 'developer@example.com');
  await user.type(passwordInput, 'Secret123456');

  // 3. 验证值状态
  expect(emailInput).toHaveValue('developer@example.com');
  expect(passwordInput).toHaveValue('Secret123456');

  // 4. 点击提交并验证状态
  await user.click(submitButton);
  expect(submitButton).toBeDisabled();
});
```

---

## 7. 测试分层与常见反模式避坑指南

| 测试类型 | 覆盖比例 | 核心目标 | 推荐工具 |
| :--- | :--- | :--- | :--- |
| **单元测试 (Unit)** | 约 60% | 纯逻辑函数、通用 Hooks、基础 UI 基础原子组件 | Vitest / Jest |
| **集成测试 (Integration)** | 约 30% | 业务组件树、表单提交流程、结合 MSW 的网络流 | Vitest + RTL + MSW |
| **端到端测试 (E2E)** | 约 10% | 核心业务闭环（如注册、支付、结账） | Playwright / Cypress |

### 常见反模式避坑

1. **不要断言内部 State**：组件的 `useState` 是内部细节，测试应该断言屏幕上的文字或 DOM 属性，而不是检查内部变量。
2. **避免盲目使用 `waitFor`**：`userEvent` 的很多操作（如输入、点击）已经是异步的，只有在断言真正需要等待的网络请求或定时器 DOM 时才使用 `waitFor`。
3. **优先 `userEvent` 而非 `fireEvent`**：`fireEvent.click` 只会触发 click 事件，而 `userEvent.click` 会严格按照真实浏览器时序触发 hover、focus、pointerDown、mouseDown、click 等一系列完整事件链路。

