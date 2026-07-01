---
sidebar_position: 6
---

# 组件设计模式与最佳实践

在构建中大型 React 应用时，设计模式直接决定了代码的复用性、可维护性与扩展空间。本章我们将对 React 经典的五大设计范式进行系统性拆解：**受控与非受控组件**、**高阶组件 (HOC)**、**Render Props 模式**、**复合组件 (Compound Components)** 与 **自定义 Hooks 转化**。

---

## 1. 受控组件与非受控组件

在处理 HTML 表单元素（如 `<input>`、`<select>`、`<textarea>`）时，React 提供了两种管理数据的方式。

### 受控组件 (Controlled Components)
表单的数据完全由 React 组件的 `state` 来托管。每一次字符输入都会触发事件处理器更新 state，再通过重新渲染改变输入框的 `value`。

- **优势**：状态实时同步，可以极方便地进行即时校验（如限制输入格式、动态展示错误提示）、过滤或清空输入。
- **缺点**：每次键盘输入都会触发一次完整的组件 Render 周期，在超大复杂表单中可能会产生轻微的输入延迟。

```tsx
import { useState } from 'react';

function ControlledInput() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    if (!val.includes('@')) {
      setError('请输入有效的邮箱地址');
    } else {
      setError(null);
    }
  };

  return (
    <div>
      <input type="text" value={email} onChange={handleChange} />
      {error && <span style={{ color: 'red' }}>{error}</span>}
    </div>
  );
}
```

### 非受控组件 (Uncontrolled Components)
表单的数据不由 React 状态管理，而是保留在 DOM 元素自身内部。我们通过 `useRef` 在需要的时候（例如点击提交按钮时）直接去 DOM 节点上“抓取”数据。

- **优势**：不需要频繁触发 React 重渲染，代码简单，非常适合用于“仅在提交时读取一次数据”的简单表单或第三方非 React 库的集成。

```tsx
import { useRef } from 'react';

function UncontrolledForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 运行时直接从 DOM 读取文件数据
    const fileName = fileInputRef.current?.files?.[0]?.name;
    alert(`已选择文件: ${fileName}`);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="file" ref={fileInputRef} />
      <button type="submit">提交文件</button>
    </form>
  );
}
```

---

## 2. 高阶组件 (HOC - High Order Components)

高阶组件是 React 中用于**复用组件逻辑**的经典高级技术。它不是一个 React 组件，而是一个**函数**：接收一个组件作为参数，并返回一个被增强后的全新组件。

> [!TIP]
> **命名规范**：高阶组件函数应当以 `with` 开头（如 `withAuth`、`withLogging`），以便于开发者一眼识破。

```tsx
import React, { useEffect, useState } from 'react';

interface UserInfo {
  name: string;
  isLoggedIn: boolean;
}

// 1. 定义 HOC 函数
function withAuthentication<T extends { user: UserInfo }>(
  WrappedComponent: React.ComponentType<T>
) {
  return function AuthenticatedComponent(props: Omit<T, 'user'>) {
    const [user, setUser] = useState<UserInfo | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      // 模拟检测登录态的副作用
      setTimeout(() => {
        setUser({ name: '张三', isLoggedIn: true });
        setLoading(false);
      }, 1000);
    }, []);

    if (loading) return <div>正在安全验证中...</div>;
    if (!user || !user.isLoggedIn) return <div>您没有权限访问此页面，请先登录。</div>;

    // 将注入的 user 属性与外部 props 一起解构传给被包装组件
    return <WrappedComponent {...(props as T)} user={user} />;
  };
}

// 2. 编写普通业务组件
function ProjectDashboard({ user }: { user: UserInfo }) {
  return <h1>欢迎回来，{user.name}！这是您的项目仪表盘。</h1>;
}

// 3. 使用 HOC 增强组件
const SecuredDashboard = withAuthentication(ProjectDashboard);
```

---

## 3. Render Props 模式

Render Props 是指：一个组件的 `prop` 接收的是一个**返回 React 元素的函数**，组件在内部调用这个函数来完成自身的渲染。这使得组件只专注于**封装行为和数据**，而将具体的“UI 呈现样式”完全让渡给外部使用者。

```tsx
import React, { useState } from 'react';

interface MousePosition {
  x: number;
  y: number;
}

interface MouseTrackerProps {
  // 接收一个渲染函数，该函数把内部的坐标状态传出去
  render: (position: MousePosition) => React.ReactNode;
}

// 1. 行为封装组件：只负责监听鼠标移动轨迹并维护状态
function MouseTracker({ render }: MouseTrackerProps) {
  const [position, setPosition] = useState<MousePosition>({ x: 0, y: 0 });

  const handleMouseMove = (event: React.MouseEvent) => {
    setPosition({
      x: event.clientX,
      y: event.clientY,
    });
  };

  return (
    <div style={{ height: '200px', border: '1px dashed #ccc' }} onMouseMove={handleMouseMove}>
      {render(position)}
    </div>
  );
}

// 2. 外部使用：传入不同的渲染函数展示不同的 UI
function App() {
  return (
    <div>
      {/* UI 1: 数字坐标展示 */}
      <MouseTracker render={({ x, y }) => (
        <p>当前鼠标位置：X: {x}, Y: {y}</p>
      )} />

      {/* UI 2: 随着鼠标移动而移动的红点 */}
      <MouseTracker render={({ x, y }) => (
        <div style={{
          position: 'absolute',
          left: x - 10,
          top: y - 10,
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: 'red',
          pointerEvents: 'none'
        }} />
      )} />
    </div>
  );
}
```

---

## 4. 复合组件模式 (Compound Components)

复合组件模式用于设计那些**在逻辑上紧密耦合、共同协作完成一项任务的组件群**（如 Select 与 Option、Tabs 与 TabItem、Menu 与 MenuItem）。

它通过 React Context 共享隐式状态，允许使用者随意组合子组件的 HTML 布局，避免了极其臃肿复杂的“Props 透传地狱”。

```tsx
import React, { createContext, useContext, useState } from 'react';

const TabsContext = createContext<{
  activeTab: string;
  setActiveTab: (val: string) => void;
} | null>(null);

// 1. 父级容器：维护活动 Tab 状态
function Tabs({ children, defaultTab }: { children: React.ReactNode; defaultTab: string }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs-container">{children}</div>
    </TabsContext.Provider>
  );
}

// 2. 子组件：标签按钮
Tabs.Tab = function Tab({ value, label }: { value: string; label: string }) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('Tabs.Tab 必须在 Tabs 组件内部使用');

  const isActive = context.activeTab === value;
  return (
    <button 
      onClick={() => context.setActiveTab(value)}
      className={`tab-btn ${isActive ? 'active' : ''}`}
      style={{ fontWeight: isActive ? 'bold' : 'normal' }}
    >
      {label}
    </button>
  );
};

// 3. 子组件：面板内容
Tabs.Panel = function Panel({ value, children }: { value: string; children: React.ReactNode }) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('Tabs.Panel 必须在 Tabs 组件内部使用');
  
  return context.activeTab === value ? <div className="tab-panel">{children}</div> : null;
};

// 4. 外部极富弹性的拼装式使用：可以自由穿插自定义标签
function TabsUsage() {
  return (
    <Tabs defaultTab="home">
      <div className="tabs-header">
        <Tabs.Tab value="home" label="首页" />
        <Tabs.Tab value="profile" label="个人资料" />
      </div>
      <hr />
      <div className="tabs-body">
        <Tabs.Panel value="home">这是首页内容区域</Tabs.Panel>
        <Tabs.Panel value="profile">这是个人资料面板，支持复杂信息管理</Tabs.Panel>
      </div>
    </Tabs>
  );
}
```

---

## 5. 现代化替代：使用自定义 Hooks 转化逻辑

在 React Hooks 诞生后，许多原先需要 HOC 或 Render Props 实现的逻辑，都可以被**自定义 Hooks (Custom Hooks)** 以更扁平、无嵌套、类型安全的方式完美替代。

### 转化案例：将上面的“鼠标追踪”Render Props 转化为自定义 Hook

```tsx
import { useEffect, useState } from 'react';

// 1. 提取逻辑为自定义 Hook
function useMousePosition() {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return position;
}

// 2. 扁平化地应用于任何组件中，零组件层级嵌套
function FlatTracker() {
  const { x, y } = useMousePosition();
  return (
    <div className="coord-box">
      Hook 追踪到的鼠标位置：X: {x}, Y: {y}
    </div>
  );
}
```
