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

### ⚠️ 编写 HOC 的两大黄金准则

#### 1. 别丢掉 Ref！—— 使用 forwardRef 转发

由于高阶组件实际上返回的是一个新的“包装容器组件”，当你直接把 `ref` 传递给增强后的组件（如 `SecuredDashboard`）时，该 `ref` 只会绑定在外层的匿名组件上，而**无法向下传递到真实的业务组件 `ProjectDashboard`**。

为了确保 `ref` 在高阶组件中不丢失，必须结合 `React.forwardRef` 进行转发：

```tsx
function withLogging<T>(WrappedComponent: React.ComponentType<T>) {
  class LogComponent extends React.Component<T> {
    componentDidMount() {
      console.log('组件已挂载');
    }
    render() {
      // 提取 forwardedRef，将其传给真正的 WrappedComponent
      const { forwardedRef, ...rest } = this.props as any;
      return <WrappedComponent ref={forwardedRef} {...rest as T} />;
    }
  }

  // 2. 用 forwardRef 包装并向下传递 ref
  return React.forwardRef((props: T, ref) => {
    return <LogComponent {...props} forwardedRef={ref} />;
  });
}
```

#### 2. 方便调试！—— 动态生成可辨识的 `displayName`

React 默认会根据函数/类名推导组件的 `displayName`。如果在 HOC 中返回的是匿名组件，React DevTools 里的组件树就会充斥着一堆复用名字（如 `AnonymousComponent`），导致调试困难。

我们需要手动将内部组件的名字与其增强的性质拼在一起：

```tsx
function withAuthentication<T>(WrappedComponent: React.ComponentType<T>) {
  function AuthenticatedComponent(props: any) {
    // ... 逻辑 ...
    return <WrappedComponent {...props} />;
  }

  // 获取组件的 displayName，回退到普通 name
  const componentName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  
  // 设置便于调试的 displayName
  AuthenticatedComponent.displayName = `withAuthentication(${componentName})`;

  return AuthenticatedComponent;
}
```

---

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

---

## 6. 错误边界模式 (Error Boundary)

**错误边界 (ErrorBoundary)** 是一种 React 组件，它可以**捕获其子组件树中任何位置的 JavaScript 错误**，并渲染备用 UI (Fallback UI)，而不是让整个组件树崩溃白屏。

### 为什么必须使用 Class 组件？

截至 React 19，React 仍然**没有提供**能捕获子组件渲染错误的 Hook (如没有对应的 `useErrorBoundary` 等)。因此，实现错误边界**必须使用 Class 组件**，通过实现以下两个生命周期方法：
1. `static getDerivedStateFromError(error)`：从错误中导出状态，从而触发重渲染展示 Fallback UI。
2. `componentDidCatch(error, errorInfo)`：用于将错误信息上报给日志服务器。

### 标准的错误边界 Class 组件模板

```tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  // 1. 当子组件抛出错误时，首先调用此方法
  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  // 2. 捕获错误后，在此处上报日志
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary 捕获到未处理错误:', error, errorInfo);
    // 可在此处调用上报日志的 API，例如 Sentry.captureException(error)
  }

  // 3. 提供重置边界的方法，允许用户重试
  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError && this.state.error) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback(this.state.error, this.handleReset);
      }
      return this.props.fallback || (
        <div className="error-fallback">
          <h3>糟糕，系统出现了一些错误。</h3>
          <button onClick={this.handleReset}>尝试重试</button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

### 错误边界的捕获局限性

错误边界**不会**捕获以下场景中的错误：
1. **事件处理器**（例如 `onClick` 内部抛出的错误）。因为它们不在 React 渲染周期内发生。处理此类错误应使用传统的 `try/catch`。
2. **异步代码**（例如 `setTimeout`、`requestAnimationFrame` 或异步的 `fetch` 请求回调）。
3. **服务端渲染 (SSR)** 期间的错误。
4. **错误边界自身**（而非其子组件）抛出的错误。

### 现代化推荐：使用 `react-error-boundary` 库

在实际的企业级项目开发中，通常推荐直接使用社区成熟且生态完备的第三方库 `react-error-boundary`。它以更符合 Hooks 直觉的方式包装了 Class 错误边界：

```tsx
import { ErrorBoundary } from 'react-error-boundary';

// 1. 定义 Fallback 组件
function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div role="alert" className="error-box">
      <p>渲染出错：{error.message}</p>
      <button onClick={resetErrorBoundary}>点击重试</button>
    </div>
  );
}

// 2. 结合业务组件使用
function App() {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // 在这里重置状态，例如清空本地缓存或重新加载路由
        console.log('用户尝试重试，重置应用状态');
      }}
    >
      <MyBrokenComponent />
    </ErrorBoundary>
  );
}
```

---

## 7. 传送门模式 (Portal)

在构建 UI 组件时，有些元素需要在视觉上“打破”父组件的 DOM 树层级限制（例如：Modal 模态框、Tooltip 气泡提示、Dropdown 下拉菜单、Drawer 抽屉）。

- **痛点**：如果这些浮层组件直接嵌套在父组件的 DOM 树内，如果父级容器设置了 `overflow: hidden`，浮层会被截断；或者如果父级设置了特定的 `z-index`，浮层可能会被其他组件遮挡。
- **解决方案**：使用 React 提供的 `createPortal` 将子节点渲染到**原本组件树之外的任意 DOM 节点**（通常是 `document.body`），但在逻辑上它依然是该组件的子代。

### 使用语法

```tsx
import { createPortal } from 'react-dom';

// 接收子元素，以及目标 DOM 挂载点
createPortal(child, container)
```

### 经典模态框 (Modal) 实现示例

```tsx
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

function Modal({ isOpen, onClose, children }: ModalProps) {
  // 1. 创建挂载目标 DOM，或者直接绑定到 document.body
  const modalRoot = document.getElementById('modal-root') || document.body;

  useEffect(() => {
    if (!isOpen) return;
    
    // 禁用背景滚动等副作用
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // 2. 将 Modal 的主体结构“传送”到 modalRoot 中渲染
  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        {children}
      </div>
    </div>,
    modalRoot
  );
}

// 外部使用
function Dashboard() {
  const [showModal, setShowModal] = React.useState(false);

  return (
    <div className="dashboard-wrapper" style={{ overflow: 'hidden', position: 'relative' }}>
      <h2>我的控制台</h2>
      <button onClick={() => setShowModal(true)}>打开模态弹窗</button>

      {/* 即使 dashboard-wrapper 被设置了 overflow: hidden，模态框也绝不会被遮挡或截断 */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        <h3>系统升级提示</h3>
        <p>最新的 React 19 现代化开发体系文档已上线，请及时查看。</p>
      </Modal>
    </div>
  );
}
```

### ⚠️ 关键点：Portal 中的事件冒泡

尽管通过 `createPortal` 传送出去的 DOM 元素在**真实 DOM 树中渲染到了外面**（例如在 `<body>` 底部），但它在 **React 组件树的结构和上下文依然保持不变**。

这意味着：
- **Context 共享**：Portal 内部依然可以顺畅地消费定义在父级组件中的 React Context。
- **事件冒泡**：在 Portal 节点内部触发的事件，仍然会按照 **React 组件树的层级结构** 向父组件冒泡，而不是沿着 DOM 树的层级。

#### 事件冒泡示例

```tsx
// 即使 Modal 渲染在 document.body 中，
// 当用户点击 Modal 内部的按钮时，父级 Dashboard 的 onClick 仍然会被触发
function Dashboard() {
  const handleDivClick = () => {
    console.log('Dashboard 点击事件被捕获（React 事件冒泡成功）');
  };

  return (
    <div onClick={handleDivClick}>
      <Modal isOpen={true} onClose={() => {}}>
        <button>点击我</button>
      </Modal>
    </div>
  );
}
```

---

## 补充案例：各模式实战强化

---

### 受控组件进阶：多字段表单 + 异步提交

实际项目中受控组件通常要处理多字段、统一提交逻辑和异步校验：

```tsx
import { useState } from 'react';

interface LoginForm {
  username: string;
  password: string;
}
interface FieldErrors {
  username?: string;
  password?: string;
}

function LoginFormExample() {
  const [form, setForm] = useState<LoginForm>({ username: '', password: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // 通用 change handler，通过 name 属性区分字段
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: undefined })); // 输入时清除该字段错误
  };

  const validate = (): boolean => {
    const newErrors: FieldErrors = {};
    if (!form.username.trim()) newErrors.username = '用户名不能为空';
    if (form.password.length < 8) newErrors.password = '密码至少 8 位';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await new Promise(r => setTimeout(r, 1000)); // 模拟异步登录
      alert(`登录成功，欢迎 ${form.username}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div>
        <label>用户名</label>
        <input
          name="username"
          value={form.username}
          onChange={handleChange}
          aria-invalid={!!errors.username}
        />
        {errors.username && <span style={{ color: 'red' }}>{errors.username}</span>}
      </div>
      <div>
        <label>密码</label>
        <input
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
        />
        {errors.password && <span style={{ color: 'red' }}>{errors.password}</span>}
      </div>
      <button type="submit" disabled={submitting}>
        {submitting ? '登录中...' : '登录'}
      </button>
    </form>
  );
}
```

### 受控 vs 非受控选型速查

| 场景 | 推荐方式 |
|:---|:---|
| 即时校验、动态联动（省市联动） | 受控组件 |
| 仅在提交时读取一次值 | 非受控（`useRef`） |
| 集成第三方 DOM 库（Chart.js 等） | 非受控（`useRef`） |
| 需要命令式操作（聚焦、清空） | 非受控 + `useImperativeHandle` |
| 大型多步骤表单 | `react-hook-form`（非受控优先） |

---

### HOC 进阶：数据加载 HOC

除了权限校验，HOC 也常用于统一封装数据请求逻辑，将"加载中/错误/数据就绪"三态从业务组件中剥离：

```tsx
import React, { useEffect, useState } from 'react';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// 接收一个异步获取函数，返回增强后的组件
function withDataFetching<T, P extends object>(
  WrappedComponent: React.ComponentType<P & { data: T }>,
  fetchFn: (props: P) => Promise<T>
) {
  function DataFetchingComponent(props: P) {
    const [state, setState] = useState<AsyncState<T>>({
      data: null,
      loading: true,
      error: null,
    });

    useEffect(() => {
      let cancelled = false;
      setState({ data: null, loading: true, error: null });

      fetchFn(props)
        .then(data => {
          if (!cancelled) setState({ data, loading: false, error: null });
        })
        .catch(err => {
          if (!cancelled) setState({ data: null, loading: false, error: err.message });
        });

      return () => { cancelled = true; }; // 清理：防止组件卸载后更新 state
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    if (state.loading) return <div className="skeleton">加载中...</div>;
    if (state.error)   return <div className="error-tip">加载失败：{state.error}</div>;
    if (!state.data)   return null;

    return <WrappedComponent {...props} data={state.data} />;
  }

  DataFetchingComponent.displayName =
    `withDataFetching(${WrappedComponent.displayName ?? WrappedComponent.name})`;

  return DataFetchingComponent;
}

// ── 使用示例 ──────────────────────────────────────────────────────
interface User { id: number; name: string; email: string; }

function UserCard({ data }: { data: User }) {
  return (
    <div className="user-card">
      <h3>{data.name}</h3>
      <p>{data.email}</p>
    </div>
  );
}

// 注入数据获取逻辑，UserCard 完全不感知网络请求
const UserCardWithData = withDataFetching(
  UserCard,
  () => fetch('/api/user/1').then(r => r.json())
);

function App() {
  return <UserCardWithData />;
}
```

---

### Render Props 进阶：可排序数据列表

将排序逻辑封装在 Render Props 容器中，UI 渲染完全由外部决定：

```tsx
import { useState, useMemo } from 'react';

type SortOrder = 'asc' | 'desc';

interface SortableListProps<T> {
  items: T[];
  sortKey: keyof T;
  render: (sortedItems: T[], order: SortOrder, toggle: () => void) => React.ReactNode;
}

function SortableList<T>({ items, sortKey, render }: SortableListProps<T>) {
  const [order, setOrder] = useState<SortOrder>('asc');

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey];
      if (va < vb) return order === 'asc' ? -1 : 1;
      if (va > vb) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }, [items, sortKey, order]);

  const toggle = () => setOrder(o => o === 'asc' ? 'desc' : 'asc');

  return <>{render(sorted, order, toggle)}</>;
}

// ── 同一数据，两种 UI 展示 ────────────────────────────────────────
interface Product { id: number; name: string; price: number; }

const products: Product[] = [
  { id: 1, name: 'MacBook Pro', price: 12999 },
  { id: 2, name: 'iPad Air',    price: 4799  },
  { id: 3, name: 'AirPods Pro', price: 1899  },
];

function ProductPage() {
  return (
    <div>
      {/* 展示 1：卡片网格 */}
      <SortableList
        items={products}
        sortKey="price"
        render={(sorted, order, toggle) => (
          <>
            <button onClick={toggle}>
              价格 {order === 'asc' ? '↑ 升序' : '↓ 降序'}
            </button>
            <div style={{ display: 'flex', gap: 12 }}>
              {sorted.map(p => (
                <div key={p.id} className="product-card">
                  <strong>{p.name}</strong>
                  <span>¥{p.price}</span>
                </div>
              ))}
            </div>
          </>
        )}
      />

      <hr />

      {/* 展示 2：紧凑表格 */}
      <SortableList
        items={products}
        sortKey="name"
        render={(sorted, order, toggle) => (
          <table>
            <thead>
              <tr>
                <th onClick={toggle} style={{ cursor: 'pointer' }}>
                  名称 {order === 'asc' ? '▲' : '▼'}
                </th>
                <th>价格</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(p => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>¥{p.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      />
    </div>
  );
}
```

---

### 复合组件进阶：Accordion 手风琴

Accordion（手风琴）是复合组件模式的另一个典型案例，每个 Item 管理自身展开状态，父级 Accordion 可控制是否允许多个同时展开：

```tsx
import React, { createContext, useContext, useState } from 'react';

interface AccordionCtx {
  openItems: Set<string>;
  toggle: (id: string) => void;
  allowMultiple: boolean;
}

const AccordionContext = createContext<AccordionCtx | null>(null);

function useAccordion() {
  const ctx = useContext(AccordionContext);
  if (!ctx) throw new Error('必须在 <Accordion> 内部使用');
  return ctx;
}

// ── 父级容器 ──────────────────────────────────────────────────────
function Accordion({
  children,
  allowMultiple = false,
  defaultOpen = [],
}: {
  children: React.ReactNode;
  allowMultiple?: boolean;
  defaultOpen?: string[];
}) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set(defaultOpen));

  const toggle = (id: string) => {
    setOpenItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (!allowMultiple) next.clear(); // 单开模式：先清空
        next.add(id);
      }
      return next;
    });
  };

  return (
    <AccordionContext.Provider value={{ openItems, toggle, allowMultiple }}>
      <div className="accordion">{children}</div>
    </AccordionContext.Provider>
  );
}

// ── 子组件：每一项 ────────────────────────────────────────────────
Accordion.Item = function AccordionItem({
  id,
  title,
  children,
}: {
  id: string;
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  const { openItems, toggle } = useAccordion();
  const isOpen = openItems.has(id);

  return (
    <div className={`accordion-item ${isOpen ? 'open' : ''}`}>
      <button
        className="accordion-trigger"
        onClick={() => toggle(id)}
        aria-expanded={isOpen}
        aria-controls={`panel-${id}`}
      >
        {title}
        <span aria-hidden>{isOpen ? '▲' : '▼'}</span>
      </button>
      <div
        id={`panel-${id}`}
        role="region"
        hidden={!isOpen}
        className="accordion-panel"
      >
        {children}
      </div>
    </div>
  );
};

// ── 使用示例 ──────────────────────────────────────────────────────
function FaqPage() {
  return (
    <Accordion allowMultiple defaultOpen={['q1']}>
      <Accordion.Item id="q1" title="React 什么时候会触发重渲染？">
        当组件的 state 或 props 变化时触发。使用 memo/useMemo/useCallback 可以减少不必要的重渲染。
      </Accordion.Item>
      <Accordion.Item id="q2" title="HOC 和自定义 Hook 如何选择？">
        若需要包装组件（修改渲染树），用 HOC；若只需要复用逻辑，优先用自定义 Hook，更简洁类型安全。
      </Accordion.Item>
      <Accordion.Item id="q3" title="Portal 和普通组件有何区别？">
        Portal 改变 DOM 挂载位置但不改变 React 组件树，事件冒泡仍遵循组件树而非 DOM 树。
      </Accordion.Item>
    </Accordion>
  );
}
```

---

### 自定义 Hook 进阶：防抖输入 + 本地存储持久化

两个高频实用 Hook，直接覆盖 HOC/Render Props 中最常见的需求：

```tsx
import { useEffect, useRef, useState } from 'react';

// ── Hook 1：防抖值 useDebounce ────────────────────────────────────
function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer); // 每次 value 变化都清除上次的 timer
  }, [value, delay]);

  return debounced;
}

// 使用：搜索框防抖（只有停止输入 300ms 后才真正触发搜索）
function SearchBox() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (!debouncedQuery) return;
    console.log('发起搜索请求:', debouncedQuery);
    // fetch(`/api/search?q=${debouncedQuery}`)
  }, [debouncedQuery]);

  return (
    <input
      value={query}
      onChange={e => setQuery(e.target.value)}
      placeholder="输入关键词搜索..."
    />
  );
}

// ── Hook 2：localStorage 持久化 useLocalStorage ───────────────────
function useLocalStorage<T>(key: string, initialValue: T) {
  const [stored, setStored] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value: T | ((prev: T) => T)) => {
    setStored(prev => {
      const next = typeof value === 'function' ? (value as (p: T) => T)(prev) : value;
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        console.warn(`localStorage.setItem("${key}") 失败`);
      }
      return next;
    });
  };

  const remove = () => {
    window.localStorage.removeItem(key);
    setStored(initialValue);
  };

  return [stored, setValue, remove] as const;
}

// 使用：主题设置自动持久化
function ThemeToggle() {
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('app-theme', 'light');

  return (
    <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>
      当前主题：{theme === 'light' ? '☀️ 亮色' : '🌙 暗色'}（刷新后保留）
    </button>
  );
}

// ── Hook 3：前一个值 usePrevious ──────────────────────────────────
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  }); // 每次渲染后同步，不传依赖数组
  return ref.current; // 返回上一次渲染时的值
}

// 使用：显示值的变化方向
function CounterWithDiff() {
  const [count, setCount] = useState(0);
  const prevCount = usePrevious(count);

  const diff = prevCount !== undefined ? count - prevCount : 0;
  const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '';

  return (
    <div>
      <p>当前：{count} {arrow} （上一次：{prevCount ?? '—'}）</p>
      <button onClick={() => setCount(c => c + 1)}>+1</button>
      <button onClick={() => setCount(c => c - 1)}>-1</button>
    </div>
  );
}
```

---

### 错误边界进阶：细粒度边界策略

不要只在应用顶层放一个大边界。根据模块独立性分层布置，局部崩溃不影响整体：

```tsx
import { ErrorBoundary } from 'react-error-boundary';

// ── 可复用的轻量 Fallback ─────────────────────────────────────────
function InlineFallback({ error, resetErrorBoundary }: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div role="alert" style={{ padding: 12, border: '1px solid #f5c6cb', borderRadius: 4 }}>
      <p style={{ color: '#721c24' }}>⚠️ 此模块加载失败</p>
      <code style={{ fontSize: 12 }}>{error.message}</code>
      <br />
      <button onClick={resetErrorBoundary} style={{ marginTop: 8 }}>重试</button>
    </div>
  );
}

// ── 按功能模块分层包裹 ────────────────────────────────────────────
function Dashboard() {
  return (
    <div className="dashboard">
      {/* 推荐模块崩溃不影响主内容 */}
      <ErrorBoundary FallbackComponent={InlineFallback}>
        <RecommendationWidget />
      </ErrorBoundary>

      {/* 核心内容区域有自己的边界 */}
      <ErrorBoundary
        FallbackComponent={InlineFallback}
        onError={(error, info) => {
          // 上报到监控平台（如 Sentry）
          console.error('[Sentry]', error, info.componentStack);
        }}
      >
        <MainContentArea />
      </ErrorBoundary>

      {/* 侧边栏独立边界 */}
      <ErrorBoundary FallbackComponent={InlineFallback}>
        <Sidebar />
      </ErrorBoundary>
    </div>
  );
}

// ── 结合 React.lazy 的异步边界 ────────────────────────────────────
import React, { Suspense, lazy } from 'react';

const HeavyChart = lazy(() => import('./HeavyChart'));

function AnalyticsPage() {
  return (
    // ErrorBoundary 在外捕获 lazy 加载失败
    // Suspense 在内处理 loading 状态
    <ErrorBoundary FallbackComponent={InlineFallback}>
      <Suspense fallback={<div>图表加载中...</div>}>
        <HeavyChart />
      </Suspense>
    </ErrorBoundary>
  );
}
```

---

### Portal 进阶：通用 Tooltip 组件

Tooltip 是 Portal 的另一个高频用例，需要动态计算触发元素的位置后在 `body` 上渲染浮层：

```tsx
import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  placement?: 'top' | 'bottom';
}

function Tooltip({ content, children, placement = 'top' }: TooltipProps) {
  const triggerRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setCoords({
      top: placement === 'top'
        ? rect.top + window.scrollY - 8  // 8px 间距
        : rect.bottom + window.scrollY + 8,
      left: rect.left + window.scrollX + rect.width / 2,
    });
  };

  // 将 ref 注入到子元素
  const trigger = React.cloneElement(children, {
    ref: triggerRef,
    onMouseEnter: () => { updatePosition(); setVisible(true); },
    onMouseLeave: () => setVisible(false),
    onFocus:      () => { updatePosition(); setVisible(true); },
    onBlur:       () => setVisible(false),
  });

  const tooltip = visible
    ? createPortal(
        <div
          role="tooltip"
          style={{
            position: 'absolute',
            top: coords.top,
            left: coords.left,
            transform: placement === 'top'
              ? 'translate(-50%, -100%)'
              : 'translate(-50%, 0)',
            background: 'rgba(0,0,0,0.75)',
            color: '#fff',
            padding: '4px 8px',
            borderRadius: 4,
            fontSize: 12,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 9999,
          }}
        >
          {content}
        </div>,
        document.body
      )
    : null;

  return (
    <>
      {trigger}
      {tooltip}
    </>
  );
}

// 使用
function ButtonBar() {
  return (
    <div style={{ padding: 40 }}>
      <Tooltip content="删除此条记录，操作不可撤销" placement="top">
        <button>删除</button>
      </Tooltip>
      {'  '}
      <Tooltip content="导出为 CSV 格式" placement="bottom">
        <button>导出</button>
      </Tooltip>
    </div>
  );
}
```
