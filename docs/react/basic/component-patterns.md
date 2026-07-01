---
sidebar_position: 3
---

# 组件设计模式与最佳实践

在构建大型 React 应用时，合理的组件设计模式能够显著提升代码的可维护性、复用性与可测试性。本文将深入剖析企业级 React 项目中的核心设计模式与反模式案例。

---

## 1. 复合组件模式 (Compound Components)

复合组件模式允许多个组件协同工作，同时隐藏内部实现细节，对外暴露简洁的 API。

### 设计理念

通过 Context API 在父子组件间共享隐式状态，避免 Props Drilling（属性逐级透传）。

### 实现案例：可访问的 Tabs 组件

```tsx
import { createContext, useContext, useState, ReactNode } from 'react';

// 定义共享状态的 Context
interface TabsContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs 复合组件必须在 <Tabs> 内部使用');
  }
  return context;
}

// 父容器组件
interface TabsProps {
  defaultTab: string;
  children: ReactNode;
}

function Tabs({ defaultTab, children }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs-container">{children}</div>
    </TabsContext.Provider>
  );
}

// Tab 标签子组件
interface TabProps {
  id: string;
  children: ReactNode;
}

function Tab({ id, children }: TabProps) {
  const { activeTab, setActiveTab } = useTabs();
  const isActive = activeTab === id;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      onClick={() => setActiveTab(id)}
      className={isActive ? 'tab-active' : 'tab-inactive'}
    >
      {children}
    </button>
  );
}

// Tab 内容面板子组件
function TabPanel({ id, children }: TabProps) {
  const { activeTab } = useTabs();
  
  if (activeTab !== id) {
    return null;
  }

  return (
    <div role="tabpanel" className="tab-panel">
      {children}
    </div>
  );
}

// 组合导出
Tabs.Tab = Tab;
Tabs.Panel = TabPanel;

export default Tabs;
```

### 使用示例

```tsx
function App() {
  return (
    <Tabs defaultTab="profile">
      <Tabs.Tab id="profile">个人资料</Tabs.Tab>
      <Tabs.Tab id="settings">系统设置</Tabs.Tab>
      
      <Tabs.Panel id="profile">
        <h2>这是个人资料面板</h2>
      </Tabs.Panel>
      <Tabs.Panel id="settings">
        <h2>这是系统设置面板</h2>
      </Tabs.Panel>
    </Tabs>
  );
}
```

### 优势分析

- **API 简洁**：使用者无需手动管理 `activeTab` 状态与 `onChange` 回调。
- **灵活布局**：子组件的排列顺序完全由使用者控制。
- **类型安全**：通过 TypeScript 约束确保组件间契约。

---

## 2. Render Props 模式

Render Props 通过函数作为 Props 传递，允许组件将渲染逻辑委托给调用方。

### 实现案例：鼠标追踪器

```tsx
import { useState, useEffect, ReactNode } from 'react';

interface MousePosition {
  x: number;
  y: number;
}

interface MouseTrackerProps {
  render: (position: MousePosition) => ReactNode;
}

function MouseTracker({ render }: MouseTrackerProps) {
  const [position, setPosition] = useState<MousePosition>({ x: 0, y: 0 });

  useEffect(() => {
    function handleMouseMove(event: MouseEvent) {
      setPosition({ x: event.clientX, y: event.clientY });
    }

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return <>{render(position)}</>;
}

// 使用示例
function App() {
  return (
    <MouseTracker
      render={({ x, y }) => (
        <div>
          当前鼠标位置：({x}, {y})
        </div>
      )}
    />
  );
}
```

### 现代替代方案：自定义 Hooks

在 Hooks 时代，Render Props 的大部分场景可以用自定义 Hook 更优雅地实现：

```tsx
function useMousePosition() {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    function handleMouseMove(event: MouseEvent) {
      setPosition({ x: event.clientX, y: event.clientY });
    }

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return position;
}

// 使用更简洁
function App() {
  const { x, y } = useMousePosition();
  return <div>当前鼠标位置：({x}, {y})</div>;
}
```

---

## 3. 高阶组件 (Higher-Order Components, HOC)

高阶组件是一个接收组件并返回新组件的函数，用于横切关注点（如权限校验、日志记录）的抽象。

### 实现案例：权限控制 HOC

```tsx
import { ComponentType } from 'react';

interface WithAuthProps {
  isAuthenticated: boolean;
}

function withAuth<P extends object>(
  WrappedComponent: ComponentType<P>
) {
  return function AuthenticatedComponent(props: P & WithAuthProps) {
    const { isAuthenticated, ...restProps } = props;

    if (!isAuthenticated) {
      return <div>请先登录</div>;
    }

    return <WrappedComponent {...(restProps as P)} />;
  };
}

// 使用示例
interface DashboardProps {
  userName: string;
}

function Dashboard({ userName }: DashboardProps) {
  return <h1>欢迎回来，{userName}</h1>;
}

const ProtectedDashboard = withAuth(Dashboard);

// 调用
<ProtectedDashboard isAuthenticated={true} userName="张三" />
```

### HOC 的局限性

- **Props 命名冲突**：多个 HOC 嵌套时容易产生 Props 覆盖问题。
- **静态类型推导困难**：TypeScript 类型推导在复杂 HOC 链中容易失效。
- **Wrapper Hell**：过度使用导致组件树层级过深。

### 现代替代方案：Hooks

```tsx
function useAuth() {
  // 从 Context 或全局状态读取认证信息
  const isAuthenticated = true; // 示例
  return { isAuthenticated };
}

function Dashboard({ userName }: DashboardProps) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <div>请先登录</div>;
  }

  return <h1>欢迎回来，{userName}</h1>;
}
```

---

## 4. 受控组件 vs 非受控组件

### 受控组件 (Controlled Components)

表单元素的值由 React 状态完全控制，每次输入都会触发状态更新。

```tsx
import { useState } from 'react';

function ControlledInput() {
  const [value, setValue] = useState('');

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}
```

**优势**：完全的数据流可控性，便于实现实时校验、格式化等功能。

**劣势**：频繁的状态更新可能导致性能问题（可通过 `useDeferredValue` 优化）。

### 非受控组件 (Uncontrolled Components)

通过 `ref` 直接访问 DOM 节点，不经过 React 状态。

```tsx
import { useRef } from 'react';

function UncontrolledInput() {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit() {
    console.log('输入值:', inputRef.current?.value);
  }

  return (
    <>
      <input type="text" ref={inputRef} defaultValue="初始值" />
      <button onClick={handleSubmit}>提交</button>
    </>
  );
}
```

**优势**：性能更好，适合简单表单或第三方库集成。

**劣势**：失去 React 的声明式控制，难以实现复杂的交互逻辑。

### 选择策略

- **受控组件**：需要实时校验、格式化、依赖表单状态的 UI 变化。
- **非受控组件**：简单表单提交、集成第三方 DOM 库、性能敏感场景。

---

## 5. 组件组合 vs 继承

React 官方强烈推荐使用**组合 (Composition)** 而非继承来实现组件复用。

### 反模式：类继承

```tsx
// ❌ 不推荐：使用类继承
class BaseButton extends React.Component {
  render() {
    return <button className="base-button">{this.props.children}</button>;
  }
}

class PrimaryButton extends BaseButton {
  render() {
    return <button className="primary-button">{this.props.children}</button>;
  }
}
```

### 最佳实践：组件组合

```tsx
// ✅ 推荐：使用组合
interface ButtonProps {
  variant?: 'base' | 'primary' | 'danger';
  children: ReactNode;
}

function Button({ variant = 'base', children }: ButtonProps) {
  return (
    <button className={`button button--${variant}`}>
      {children}
    </button>
  );
}

// 使用
<Button variant="primary">点击我</Button>
```

### 插槽模式 (Slots Pattern)

通过多个 Props 传递不同区域的内容，实现灵活的布局组合。

```tsx
interface CardProps {
  header: ReactNode;
  body: ReactNode;
  footer?: ReactNode;
}

function Card({ header, body, footer }: CardProps) {
  return (
    <div className="card">
      <div className="card-header">{header}</div>
      <div className="card-body">{body}</div>
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
}

// 使用
<Card
  header={<h2>卡片标题</h2>}
  body={<p>这是卡片内容</p>}
  footer={<button>操作按钮</button>}
/>
```

---

## 6. 单一职责原则 (Single Responsibility Principle)

每个组件应该只负责一个功能，避免出现"上帝组件"。

### 反模式：职责混乱

```tsx
// ❌ 不推荐：一个组件做了太多事情
function UserDashboard() {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);

  // 混杂了数据获取、UI 渲染、业务逻辑
  useEffect(() => {
    fetch('/api/user').then(r => r.json()).then(setUser);
    fetch('/api/posts').then(r => r.json()).then(setPosts);
    fetch('/api/comments').then(r => r.json()).then(setComments);
  }, []);

  return (
    <div>
      {/* 大量嵌套的 UI 代码 */}
    </div>
  );
}
```

### 最佳实践：职责分离

```tsx
// ✅ 推荐：拆分成多个单一职责的组件和 Hooks
function useUser() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    fetch('/api/user').then(r => r.json()).then(setUser);
  }, []);
  return user;
}

function usePosts() {
  const [posts, setPosts] = useState([]);
  useEffect(() => {
    fetch('/api/posts').then(r => r.json()).then(setPosts);
  }, []);
  return posts;
}

function UserProfile({ user }) {
  return <div>{user.name}</div>;
}

function PostList({ posts }) {
  return <ul>{posts.map(p => <li key={p.id}>{p.title}</li>)}</ul>;
}

function UserDashboard() {
  const user = useUser();
  const posts = usePosts();

  return (
    <div>
      <UserProfile user={user} />
      <PostList posts={posts} />
    </div>
  );
}
```

---

## 7. 避免派生状态 (Avoid Derived State)

派生状态是指可以从现有 Props 或 State 计算得出的值，应避免将其存储为独立的 State。

### 反模式：重复存储派生状态

```tsx
// ❌ 不推荐：派生状态存储在 State 中
function ProductList({ products }) {
  const [filteredProducts, setFilteredProducts] = useState(products);

  useEffect(() => {
    setFilteredProducts(products.filter(p => p.inStock));
  }, [products]);

  return <ul>{filteredProducts.map(...)}</ul>;
}
```

### 最佳实践：直接计算派生值

```tsx
// ✅ 推荐：每次渲染时计算派生值
function ProductList({ products }) {
  const filteredProducts = products.filter(p => p.inStock);
  return <ul>{filteredProducts.map(...)}</ul>;
}

// 如果计算开销大，使用 useMemo 优化
function ProductList({ products }) {
  const filteredProducts = useMemo(
    () => products.filter(p => p.inStock),
    [products]
  );
  return <ul>{filteredProducts.map(...)}</ul>;
}
```

---

## 总结

| 模式 | 适用场景 | 现代替代方案 |
| ------ | ---------- | ------------- |
| 复合组件 | 多组件协同、隐式状态共享 | 依然推荐 |
| Render Props | 逻辑复用、灵活渲染 | 自定义 Hooks |
| 高阶组件 | 横切关注点抽象 | 自定义 Hooks |
| 受控组件 | 需要完全控制表单状态 | 依然推荐 |
| 非受控组件 | 简单表单、性能优化 | 依然推荐 |
| 组件组合 | 所有复用场景 | 始终优于继承 |

在 Hooks 时代，**自定义 Hooks + 组件组合**已经成为 React 组件设计的黄金法则，能够覆盖绝大多数业务场景。
