---
sidebar_position: 9
---

# React 测试策略与 TDD

测试是 React 应用长期可维护性的关键。本文介绍 React 应用在单元测试、集成测试、端到端测试中的最佳实践，以及如何将测试驱动开发（TDD）纳入日常工作流。

---

## 1. 单元测试：组件行为与逻辑验证

React Testing Library 是当前推荐的单元测试工具，强调以用户视角验证组件行为，而不是实现细节。

### 基本原则

- 以用户行为为中心，而非内部实现
- 测试可见文本、按钮、输入等可交互元素
- 使用 `screen` 和 `userEvent` 模拟用户操作

### 基本示例

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';

test('should submit credentials', async () => {
  render(<LoginForm />);

  await userEvent.type(screen.getByLabelText(/用户名/i), 'alice');
  await userEvent.type(screen.getByLabelText(/密码/i), 'pass123');
  await userEvent.click(screen.getByRole('button', { name: /登录/i }));

  expect(screen.getByText(/正在登录/i)).toBeInTheDocument();
});
```

---

## 2. 集成测试：组件协作与数据流验证

集成测试适合验证多个组件之间的协作逻辑，例如表单提交、路由导航、状态管理与网络请求流程。可结合 `msw`(Mock Service Worker) 来模拟后端响应。

### 推荐做法

- 使用 `setupServer` 和 `rest` 定义 API mock
- 只 mock 网络边界，不 mock React 组件内部逻辑
- 在测试中关注用户可见输出和关键路径

### 集成测试示例

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { App } from './App';

const server = setupServer(
  rest.get('/api/profile', (req, res, ctx) => {
    return res(ctx.json({ name: 'Alice' }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('renders user profile', async () => {
  render(<App />);

  expect(screen.getByText(/加载中/i)).toBeInTheDocument();
  await waitFor(() => expect(screen.getByText(/Alice/i)).toBeInTheDocument());
});
```

---

## 3. 端到端测试：真实用户流程验证

端到端测试覆盖最关键的业务流程，通常使用 Playwright 或 Cypress。它们运行在真实浏览器环境中，验证整个应用从入口到后端交互的真实体验。

### 端到端测试建议

- 只编写稳定的高价值测试，用于核心流量路径
- 使用页面对象模式（Page Object）提高可维护性
- 避免对样式、详细 DOM 结构的过度断言

### 示例

```ts
import { test, expect } from '@playwright/test';

test('user can log in and see dashboard', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.fill('input[name="username"]', 'alice');
  await page.fill('input[name="password"]', 'pass123');
  await page.click('button[type="submit"]');
  await expect(page.locator('text=欢迎, alice')).toBeVisible();
});
```

---

## 4. TDD 工作流建议

1. 先写失败测试：明确期待的用户行为。
2. 仅实现足够代码，使测试通过。
3. 重构代码，保持测试覆盖。
4. 定期回顾测试用例，删除重复或低价值的测试。

### TDD 的价值

- 让设计更模块化
- 提高代码可靠性
- 降低回归风险
- 形成可执行文档

---

## 5. React 特殊测试场景

- `Suspense` 与延迟加载组件：使用 `waitFor` 或 `findBy` 等待异步内容。
- `useReducer` 与复杂状态机：测试状态更新后的渲染结果。
- `Context` 提供器：使用测试专用提供器包裹组件，避免直接修补依赖。

---

## 6. 测试工具链建议

- `vitest` / `jest`：测试运行器
- `@testing-library/react`：用户行为测试
- `msw`：网络请求模拟
- `playwright`：端到端测试
- `eslint-plugin-testing-library`：测试规范检查
- `coverage`：保持核心路径测试覆盖率
