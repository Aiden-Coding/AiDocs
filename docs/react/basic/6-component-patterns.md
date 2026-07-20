---
sidebar_position: 6
---

# 组件设计模式与最佳实践

构建中大型 React 应用，设计模式决定代码的复用性、可维护性与扩展空间。本章系统拆解 React 核心设计模式，从基础到生产实战。

## 📋 模式总览

| 模式 | 用途 | 现代推荐度 |
|:---|:---|:---:|
| [受控/非受控组件](#1-受控与非受控组件) | 表单数据管理 | ⭐⭐⭐⭐⭐ |
| [自定义 Hooks](#2-自定义-hooks) | 逻辑复用（首选） | ⭐⭐⭐⭐⭐ |
| [复合组件](#3-复合组件-compound-components) | 组件族协作 | ⭐⭐⭐⭐⭐ |
| [Portal](#4-portal-传送门) | 跨层级渲染 | ⭐⭐⭐⭐⭐ |
| [错误边界](#5-错误边界-error-boundary) | 错误捕获 | ⭐⭐⭐⭐ |
| [高阶组件 HOC](#6-高阶组件-hoc) | 组件增强 | ⭐⭐⭐ |
| [Render Props](#7-render-props) | UI与逻辑分离 | ⭐⭐ |

**推荐策略**：优先 Hooks，按需复合组件/Portal，HOC/Render Props 仅用于特定场景或遗留兼容。

---

## 第一部分：核心模式详解

---

## 1. 受控与非受控组件

在 React 中处理表单是最常见的场景之一。理解受控与非受控组件的本质区别，是掌握 React 数据流的关键。

### 1.1 基础概念

#### 受控组件 (Controlled Components)

表单数据完全由 React `state` 托管。数据流向是**单向的**：用户输入 → 触发事件 → 更新 state → state 驱动 value 重新渲染。这意味着 React 成为"**唯一数据源 (Single Source of Truth)**"。

**核心特征：**
- 表单元素的 `value` 由 state 控制
- 每次输入都触发 `onChange` 事件
- state 变化导致组件重新渲染

**优势：**
- ✅ 实时校验：输入时立即显示错误提示
- ✅ 动态联动：省市区三级联动、条件显示字段
- ✅ 格式化：自动格式化手机号、金额、日期
- ✅ 提交前验证：表单提交时 state 已包含最新数据
- ✅ 易于测试：state 完全可预测可控制

**缺点：**
- ⚠️ 性能开销：每次输入触发完整 Render 周期
- ⚠️ 代码冗长：需要为每个字段编写 handler
- ⚠️ 复杂表单：几十个字段会导致大量样板代码

```tsx
import { useState } from 'react';

function ControlledInput() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    
    // 即时校验：输入时立即反馈
    if (!val.includes('@')) {
      setError('请输入有效邮箱');
    } else {
      setError(null);
    }
  };

  return (
    <div>
      <input 
        type="email"
        value={email} 
        onChange={handleChange}
        aria-invalid={!!error}
        aria-describedby={error ? 'email-error' : undefined}
      />
      {error && (
        <span id="email-error" role="alert" style={{ color: 'red' }}>
          {error}
        </span>
      )}
    </div>
  );
}
```

#### 非受控组件 (Uncontrolled Components)

表单数据保留在 **DOM 自身内部**，React 不追踪其变化。通过 `useRef` 在需要时（如提交）直接从 DOM 读取数据。数据流是**单次的**：用户输入 → 保存在 DOM → 提交时读取。

**核心特征：**
- 不使用 `value` prop（或使用 `defaultValue` 设置初始值）
- 不绑定 `onChange` 事件
- 通过 `ref.current` 访问 DOM 节点

**优势：**
- ✅ 零性能开销：不触发 React 重渲染
- ✅ 代码简洁：无需编写大量 state 和 handler
- ✅ 易于集成：第三方 DOM 库（富文本编辑器、图表库）
- ✅ 文件上传：`<input type="file">` 天然适合非受控

**缺点：**
- ⚠️ 无即时校验：无法在输入时显示错误
- ⚠️ 难以联动：无法根据一个字段控制另一个字段
- ⚠️ 测试困难：需要模拟 DOM 操作

```tsx
import { useRef } from 'react';

function UncontrolledForm() {
  const fileRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 提交时一次性读取所有数据
    const file = fileRef.current?.files?.[0];
    const name = nameRef.current?.value;
    
    console.log('文件:', file?.name);
    console.log('姓名:', name);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="text" 
        ref={nameRef}
        defaultValue="张三" // 使用 defaultValue 而非 value
        placeholder="姓名"
      />
      <input type="file" ref={fileRef} />
      <button type="submit">提交</button>
    </form>
  );
}
```

#### 混合模式：受控 + 非受控

某些场景下可以混合使用，例如：关键字段受控（需校验），辅助字段非受控（不需校验）。

```tsx
function MixedForm() {
  // 关键字段：受控（需要即时校验）
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  
  // 辅助字段：非受控（仅在提交时读取）
  const remarksRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailError) return;
    
    const data = {
      email,
      remarks: remarksRef.current?.value || '',
    };
    console.log('提交数据:', data);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* 受控：需要实时校验 */}
      <input
        type="email"
        value={email}
        onChange={e => {
          setEmail(e.target.value);
          setEmailError(e.target.value.includes('@') ? '' : '邮箱格式错误');
        }}
      />
      {emailError && <span style={{ color: 'red' }}>{emailError}</span>}
      
      {/* 非受控：不需要校验 */}
      <textarea ref={remarksRef} placeholder="备注（可选）" />
      
      <button type="submit">提交</button>
    </form>
  );
}
```



### 1.2 生产实战：多字段表单 + 异步提交

实际项目中受控组件需处理多字段、统一提交逻辑和异步校验：

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

### 1.3 选型速查

| 场景 | 推荐 | 理由 |
|:---|:---|:---|
| 即时校验、动态联动（省市联动） | 受控组件 | 需要实时响应用户输入 |
| 仅提交时读取一次值 | 非受控（`useRef`） | 避免不必要的重渲染 |
| 集成第三方 DOM 库（Chart.js、富文本编辑器） | 非受控（`useRef`） | 第三方库自己管理 DOM |
| 需要命令式操作（聚焦、清空、选中） | 非受控 + `useImperativeHandle` | ref 提供命令式 API |
| 大型多步骤表单（10+ 字段） | `react-hook-form`（非受控优先） | 性能优化 + 内置校验 |
| 需要跨组件共享表单状态 | 受控 + Context/Zustand | 统一状态管理 |
| 文件上传 | 非受控（`<input type="file">`） | 浏览器限制，value 只读 |

### 1.4 性能优化技巧

#### 技巧 1：防抖输入（受控组件优化）

对于搜索框等高频输入场景，使用防抖避免每次输入都触发昂贵操作：

```tsx
import { useState, useEffect } from 'react';

function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  
  return debounced;
}

function SearchBox() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 500);

  useEffect(() => {
    if (debouncedQuery) {
      // 只在停止输入 500ms 后才发起请求
      fetch(`/api/search?q=${debouncedQuery}`).then(/* ... */);
    }
  }, [debouncedQuery]);

  return (
    <input
      value={query}
      onChange={e => setQuery(e.target.value)}
      placeholder="输入关键词搜索..."
    />
  );
}
```

#### 技巧 2：受控转非受控警告修复

React 会警告：`A component is changing an uncontrolled input to be controlled`。

**原因：** `value` 从 `undefined` 变为非 `undefined`（或反之）。

**修复：**

```tsx
// ❌ 错误：初始 state 为 undefined
const [name, setName] = useState<string>();

// ✅ 正确：提供空字符串作为初始值
const [name, setName] = useState<string>('');

// ✅ 或者使用 defaultValue（非受控）
<input defaultValue={initialName} />
```

---

## 2. 自定义 Hooks

**现代 React 逻辑复用的首选方案**。自定义 Hook 本质是将**带状态的逻辑**提取为可复用函数，遵循 Hook 命名规范（`use` 开头）。

### 2.1 为什么 Hook 优于 HOC/Render Props

| 对比维度 | 自定义 Hook | HOC | Render Props |
|:---|:---|:---|:---|
| **嵌套层级** | ✅ 扁平（零嵌套） | ❌ 每层 HOC 增加一层 | ❌ 回调地狱 |
| **类型推导** | ✅ 完美支持 TS | ⚠️ 需手动声明泛型 | ⚠️ 复杂泛型推导 |
| **多逻辑组合** | ✅ 自由组合多个 Hook | ❌ HOC 顺序有副作用 | ❌ 难以组合 |
| **性能优化** | ✅ 精确控制依赖 | ⚠️ 额外组件层级 | ⚠️ 额外函数调用 |
| **DevTools 调试** | ✅ 显示 Hook 名称 | ❌ 匿名组件嵌套 | ❌ 难以追踪 |
| **学习曲线** | ✅ 符合直觉 | ⚠️ 需理解高阶函数 | ⚠️ 理解成本高 |

### 2.2 编写自定义 Hook 的黄金法则

1. **命名必须以 `use` 开头**（React 通过命名识别 Hook）
2. **只在顶层调用**（不能在循环/条件/嵌套函数中）
3. **返回值设计清晰**（tuple、object、或单值）
4. **依赖数组要完整**（避免闭包陷阱）
5. **清理副作用**（useEffect 返回清理函数）

### 2.3 基础示例：鼠标追踪

```tsx
import { useEffect, useState } from 'react';

function useMousePosition() {
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handler = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  return pos;
}

// 使用：扁平无嵌套
function Tracker() {
  const { x, y } = useMousePosition();
  return <p>鼠标位置: X:{x}, Y:{y}</p>;
}
```

### 2.4 生产实战：五个高频 Hook

#### Hook 1：防抖值 `useDebounce`

**场景：** 搜索框、自动保存、滚动加载

```tsx
import { useEffect, useState } from 'react';

function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer); // 清理：每次 value 变化清除上次定时器
  }, [value, delay]);

  return debounced;
}

// 使用：搜索防抖
function SearchBox() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery) {
      // 仅在停止输入 300ms 后触发
      fetch(`/api/search?q=${debouncedQuery}`).then(res => res.json());
    }
  }, [debouncedQuery]);

  return <input value={query} onChange={e => setQuery(e.target.value)} />;
}
```

**优化版：** 支持立即执行（leading edge）

```tsx
function useDebounce<T>(value: T, delay = 300, options = { leading: false }): T {
  const [debounced, setDebounced] = useState<T>(value);
  const isLeadingRef = useRef(true);

  useEffect(() => {
    if (isLeadingRef.current && options.leading) {
      setDebounced(value);
      isLeadingRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      setDebounced(value);
      isLeadingRef.current = true;
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay, options.leading]);

  return debounced;
}
```

#### Hook 2：localStorage 持久化 `useLocalStorage`

**场景：** 主题设置、用户偏好、表单草稿

```tsx
import { useState, useEffect } from 'react';

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // 初始化：从 localStorage 读取或使用初始值
  const [stored, setStored] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`localStorage.getItem("${key}") 失败:`, error);
      return initialValue;
    }
  });

  // 同步到 localStorage
  const setValue = (value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(stored) : value;
      setStored(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(`localStorage.setItem("${key}") 失败:`, error);
    }
  };

  // 清除
  const remove = () => {
    try {
      window.localStorage.removeItem(key);
      setStored(initialValue);
    } catch (error) {
      console.warn(`localStorage.removeItem("${key}") 失败:`, error);
    }
  };

  return [stored, setValue, remove] as const;
}

// 使用：主题持久化
function ThemeToggle() {
  const [theme, setTheme, removeTheme] = useLocalStorage<'light' | 'dark'>('app-theme', 'light');

  return (
    <div>
      <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>
        当前主题: {theme === 'light' ? '☀️ 亮色' : '🌙 暗色'}（刷新后保留）
      </button>
      <button onClick={removeTheme}>重置为默认</button>
    </div>
  );
}
```

**进阶：跨标签页同步**

```tsx
function useLocalStorage<T>(key: string, initialValue: T) {
  const [stored, setStored] = useState<T>(/* ... */);

  // 监听其他标签页的变化
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          setStored(JSON.parse(e.newValue));
        } catch {}
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  // ... 其他代码

  return [stored, setValue, remove] as const;
}
```

#### Hook 3：前一个值 `usePrevious`

**场景：** 动画过渡、数据对比、撤销/重做

```tsx
import { useRef, useEffect } from 'react';

function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  
  useEffect(() => {
    ref.current = value; // 每次渲染后更新
  }); // 注意：无依赖数组，每次渲染后都执行

  return ref.current; // 返回上一次渲染时的值
}

// 使用：显示变化方向
function Counter() {
  const [count, setCount] = useState(0);
  const prevCount = usePrevious(count);
  
  const diff = prevCount !== undefined ? count - prevCount : 0;
  const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '';

  return (
    <div>
      <p>
        当前: {count} {arrow} 
        <span style={{ color: '#999' }}>(上次: {prevCount ?? '—'})</span>
      </p>
      <button onClick={() => setCount(c => c + 1)}>+1</button>
      <button onClick={() => setCount(c => c - 1)}>-1</button>
      <button onClick={() => setCount(0)}>重置</button>
    </div>
  );
}
```

**进阶：对比对象差异**

```tsx
function usePreviousDistinct<T>(value: T): T | undefined {
  const ref = useRef<T>();
  
  useEffect(() => {
    // 只有值真正变化时才更新
    if (JSON.stringify(ref.current) !== JSON.stringify(value)) {
      ref.current = value;
    }
  });

  return ref.current;
}
```

#### Hook 4：异步数据获取 `useFetch`

**场景：** API 请求、数据加载

```tsx
import { useState, useEffect, useRef } from 'react';

interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

function useFetch<T>(url: string, options?: RequestInit): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [trigger, setTrigger] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // 清理上一次请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const res = await fetch(url, { ...options, signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        const json = await res.json();
        setData(json);
        setLoading(false);
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err as Error);
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [url, trigger]);

  const refetch = () => setTrigger(prev => prev + 1);

  return { data, loading, error, refetch };
}

// 使用
function UserProfile({ userId }: { userId: number }) {
  const { data, loading, error, refetch } = useFetch<User>(`/api/users/${userId}`);

  if (loading) return <div className="skeleton">加载中...</div>;
  if (error) return <div className="error">错误: {error.message}</div>;
  if (!data) return null;

  return (
    <div className="profile">
      <h2>{data.name}</h2>
      <p>{data.email}</p>
      <button onClick={refetch}>刷新</button>
    </div>
  );
}
```

#### Hook 5：窗口尺寸 `useWindowSize`

**场景：** 响应式布局、图表自适应

```tsx
import { useState, useEffect } from 'react';

interface WindowSize {
  width: number;
  height: number;
}

function useWindowSize(): WindowSize {
  const [size, setSize] = useState<WindowSize>({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    // 防抖处理，避免频繁触发
    let timeoutId: number;
    
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        setSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return size;
}

// 使用：响应式组件
function ResponsiveChart() {
  const { width, height } = useWindowSize();
  const isMobile = width < 768;

  return (
    <div>
      <h3>图表尺寸: {width} x {height}</h3>
      <Chart width={width} height={isMobile ? 300 : 500} />
    </div>
  );
}
```

---

## 3. 复合组件 (Compound Components)

逻辑紧密耦合的组件群（Tabs/Menu/Select）通过 Context 共享状态，允许灵活组合子组件。

### 3.1 经典案例：Tabs 组件

```tsx
import { createContext, useContext, useState } from 'react';

const TabsContext = createContext<{
  active: string;
  setActive: (v: string) => void;
} | null>(null);

function Tabs({ children, defaultTab }: { children: React.ReactNode; defaultTab: string }) {
  const [active, setActive] = useState(defaultTab);
  return (
    <TabsContext.Provider value={{ active, setActive }}>
      <div>{children}</div>
    </TabsContext.Provider>
  );
}

Tabs.Tab = function Tab({ value, label }: { value: string; label: string }) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tab must be inside Tabs');
  
  return (
    <button
      onClick={() => ctx.setActive(value)}
      style={{ fontWeight: ctx.active === value ? 'bold' : 'normal' }}
    >
      {label}
    </button>
  );
};

Tabs.Panel = function Panel({ value, children }: { value: string; children: React.ReactNode }) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Panel must be inside Tabs');
  return ctx.active === value ? <div>{children}</div> : null;
};

// 使用：灵活组合
function App() {
  return (
    <Tabs defaultTab="home">
      <Tabs.Tab value="home" label="首页" />
      <Tabs.Tab value="profile" label="个人" />
      <hr />
      <Tabs.Panel value="home">首页内容</Tabs.Panel>
      <Tabs.Panel value="profile">个人资料</Tabs.Panel>
    </Tabs>
  );
}
```

### 3.2 进阶案例：Accordion 手风琴

```tsx
import React, { createContext, useContext, useState } from 'react';

interface AccordionCtx {
  openItems: Set<string>;
  toggle: (id: string) => void;
}

const AccordionContext = createContext<AccordionCtx | null>(null);

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
        if (!allowMultiple) next.clear(); // 单开模式
        next.add(id);
      }
      return next;
    });
  };

  return (
    <AccordionContext.Provider value={{ openItems, toggle }}>
      <div className="accordion">{children}</div>
    </AccordionContext.Provider>
  );
}

Accordion.Item = function Item({ id, title, children }: {
  id: string;
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  const ctx = useContext(AccordionContext);
  if (!ctx) throw new Error('Item 必须在 Accordion 内');
  const isOpen = ctx.openItems.has(id);

  return (
    <div className={`item ${isOpen ? 'open' : ''}`}>
      <button onClick={() => ctx.toggle(id)} aria-expanded={isOpen}>
        {title} <span>{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && <div className="panel">{children}</div>}
    </div>
  );
};

// 使用：FAQ 页面
function FaqPage() {
  return (
    <Accordion allowMultiple defaultOpen={['q1']}>
      <Accordion.Item id="q1" title="React 何时触发重渲染？">
        state 或 props 变化时触发。使用 memo/useMemo 可减少不必要渲染。
      </Accordion.Item>
      <Accordion.Item id="q2" title="HOC 和 Hook 如何选择？">
        优先用 Hook，更简洁类型安全。HOC 用于遗留兼容。
      </Accordion.Item>
      <Accordion.Item id="q3" title="Portal 有何特殊之处？">
        改变 DOM 挂载位置，但事件冒泡仍遵循 React 组件树。
      </Accordion.Item>
    </Accordion>
  );
}
```

---

## 4. Portal (传送门)

将子节点渲染到组件树外的任意 DOM（通常 `document.body`），用于 Modal/Tooltip/Dropdown 等浮层。

### 4.1 基础用法

```tsx
import { createPortal } from 'react-dom';

function Modal({ isOpen, onClose, children }: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button onClick={onClose}>×</button>
        {children}
      </div>
    </div>,
    document.body
  );
}
```

### 4.2 关键特性

#### 事件冒泡遵循 React 树

尽管 Portal 渲染到 `body`，事件冒泡仍按 **React 组件树** 层级，而非 DOM 树：

```tsx
function Parent() {
  return (
    <div onClick={() => console.log('Parent clicked')}>
      <Modal isOpen={true} onClose={() => {}}>
        <button>点我</button> {/* 点击会触发 Parent 的 onClick */}
      </Modal>
    </div>
  );
}
```

#### 实用 Hook：`usePortal`

封装 Portal 创建逻辑：

```tsx
function usePortal(id = 'portal-root') {
  const [container] = useState(() => {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      document.body.appendChild(el);
    }
    return el;
  });

  return (node: React.ReactNode) => createPortal(node, container);
}

// 使用：极简 Modal
function SimpleModal({ isOpen, children }: any) {
  const renderPortal = usePortal();
  return isOpen ? renderPortal(<div className="modal">{children}</div>) : null;
}
```

### 4.3 进阶案例：Tooltip 组件

动态计算触发元素位置后在 `body` 渲染浮层：

```tsx
import React, { useRef, useState } from 'react';
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
        ? rect.top + window.scrollY - 8
        : rect.bottom + window.scrollY + 8,
      left: rect.left + window.scrollX + rect.width / 2,
    });
  };

  // 将 ref 和事件注入子元素
  const trigger = React.cloneElement(children, {
    ref: triggerRef,
    onMouseEnter: () => { updatePosition(); setVisible(true); },
    onMouseLeave: () => setVisible(false),
  });

  const tooltip = visible
    ? createPortal(
        <div
          role="tooltip"
          style={{
            position: 'absolute',
            top: coords.top,
            left: coords.left,
            transform: placement === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
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
      {' '}
      <Tooltip content="导出为 CSV 格式" placement="bottom">
        <button>导出</button>
      </Tooltip>
    </div>
  );
}
```

---

## 5. 错误边界 (Error Boundary)

捕获子组件树渲染错误，显示 Fallback UI 而非白屏。**必须使用 Class 组件**（React 19 仍无 Hook 替代）。

### 5.1 标准实现

```tsx
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  fallback?: ReactNode;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    // 上报到 Sentry 等监控平台
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>出错了</div>;
    }
    return this.props.children;
  }
}
```

### 5.2 捕获局限

**不会捕获**：
- 事件处理器（用 `try/catch`）
- 异步代码（setTimeout/fetch）
- SSR 错误
- 错误边界自身的错误

### 5.3 生产推荐：`react-error-boundary`

```tsx
import { ErrorBoundary } from 'react-error-boundary';

function Fallback({ error, resetErrorBoundary }: any) {
  return (
    <div>
      <p>出错: {error.message}</p>
      <button onClick={resetErrorBoundary}>重试</button>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary FallbackComponent={Fallback}>
      <MyComponent />
    </ErrorBoundary>
  );
}
```

**分层策略**：不要只在顶层放一个边界，按模块独立包裹，局部崩溃不扩散。

### 5.4 生产策略：细粒度边界布置

```tsx
import { ErrorBoundary } from 'react-error-boundary';

function InlineFallback({ error, resetErrorBoundary }: any) {
  return (
    <div role="alert" style={{ padding: 12, border: '1px solid #f5c6cb' }}>
      <p style={{ color: '#721c24' }}>⚠️ 此模块加载失败</p>
      <code style={{ fontSize: 12 }}>{error.message}</code>
      <br />
      <button onClick={resetErrorBoundary} style={{ marginTop: 8 }}>重试</button>
    </div>
  );
}

// 按功能模块分层包裹
function Dashboard() {
  return (
    <div className="dashboard">
      {/* 推荐模块崩溃不影响主内容 */}
      <ErrorBoundary FallbackComponent={InlineFallback}>
        <RecommendationWidget />
      </ErrorBoundary>

      {/* 核心内容区域独立边界 */}
      <ErrorBoundary
        FallbackComponent={InlineFallback}
        onError={(error, info) => {
          // 上报到 Sentry 等监控平台
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

// 结合 React.lazy 的异步边界
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

## 6. 高阶组件 (HOC)

函数接收组件返回增强组件。**现代项目优先 Hooks**，HOC 用于遗留兼容或特定场景。

### 6.1 基础结构

```tsx
function withAuth<T extends { user: any }>(WrappedComponent: React.ComponentType<T>) {
  return function AuthComponent(props: Omit<T, 'user'>) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      // 模拟鉴权
      setTimeout(() => {
        setUser({ name: '张三' });
        setLoading(false);
      }, 1000);
    }, []);

    if (loading) return <div>验证中...</div>;
    if (!user) return <div>请先登录</div>;

    return <WrappedComponent {...(props as T)} user={user} />;
  };
}

// 使用
const SecuredDashboard = withAuth(Dashboard);
```

### 6.2 关键要点

#### 要点 1：转发 Ref

HOC 返回新组件，直接传 ref 只会绑定到外层。需用 `forwardRef` 转发：

```tsx
function withLogging<T>(WrappedComponent: React.ComponentType<T>) {
  class LogComponent extends React.Component<T> {
    componentDidMount() {
      console.log('组件已挂载');
    }
    render() {
      const { forwardedRef, ...rest } = this.props as any;
      return <WrappedComponent ref={forwardedRef} {...(rest as T)} />;
    }
  }

  // 用 forwardRef 包装并向下传递 ref
  return React.forwardRef((props: T, ref) => {
    return <LogComponent {...props} forwardedRef={ref} />;
  });
}
```

#### 要点 2：设置 displayName

方便 DevTools 调试，避免组件树全是 `AnonymousComponent`：

```tsx
function withAuth<T>(Component: React.ComponentType<T>) {
  function AuthComponent(props: T) {
    // ... 鉴权逻辑
    return <Component {...props} />;
  }
  
  const name = Component.displayName || Component.name || 'Component';
  AuthComponent.displayName = `withAuth(${name})`;
  
  return AuthComponent;
}
```

### 6.3 生产案例：数据加载 HOC

统一封装"加载中/错误/数据就绪"三态：

```tsx
import React, { useEffect, useState } from 'react';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function withDataFetching<T, P extends object>(
  WrappedComponent: React.ComponentType<P & { data: T }>,
  fetchFn: (props: P) => Promise<T>
): React.ComponentType<P> {
  function DataComponent(props: P) {
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

      return () => { cancelled = true; };
    }, []); // eslint-disable-line

    if (state.loading) return <div className="skeleton">加载中...</div>;
    if (state.error) return <div className="error">加载失败：{state.error}</div>;
    if (!state.data) return null;

    return <WrappedComponent {...props} data={state.data} />;
  }

  DataComponent.displayName = `withDataFetching(${WrappedComponent.displayName ?? WrappedComponent.name})`;
  return DataComponent;
}
}

// 使用示例
interface User { id: number; name: string; email: string; }

function UserCard({ data }: { data: User }) {
  return (
    <div className="card">
      <h3>{data.name}</h3>
      <p>{data.email}</p>
    </div>
  );
}

// 注入数据获取逻辑
const UserCardWithData = withDataFetching(
  UserCard,
  () => fetch('/api/user/1').then(r => r.json())
);

function App() {
  return <UserCardWithData />;
}
```

---

## 7. Render Props

组件 prop 接收渲染函数，封装逻辑交 UI 给外部。**已基本被 Hooks 替代**。

### 7.1 基础示例

```tsx
function MouseTracker({ render }: { render: (pos: { x: number; y: number }) => React.ReactNode }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });

  return (
    <div onMouseMove={e => setPos({ x: e.clientX, y: e.clientY })}>
      {render(pos)}
    </div>
  );
}

// 使用
<MouseTracker render={({ x, y }) => <p>X:{x}, Y:{y}</p>} />
```

### 7.2 生产案例：可排序列表

将排序逻辑封装，UI 完全由外部决定：

```tsx
import { useState, useMemo } from 'react';

type SortOrder = 'asc' | 'desc';

interface SortableListProps<T> {
  items: T[];
  sortKey: keyof T;
  render: (sorted: T[], order: SortOrder, toggle: () => void) => React.ReactNode;
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

// 使用：同一数据两种 UI
interface Product { id: number; name: string; price: number; }

const products: Product[] = [
  { id: 1, name: 'MacBook Pro', price: 12999 },
  { id: 2, name: 'iPad Air', price: 4799 },
  { id: 3, name: 'AirPods Pro', price: 1899 },
];

function ProductPage() {
  return (
    <div>
      {/* UI 1：卡片网格 */}
      <SortableList
        items={products}
        sortKey="price"
        render={(sorted, order, toggle) => (
          <>
            <button onClick={toggle}>
              价格 {order === 'asc' ? '↑' : '↓'}
            </button>
            <div style={{ display: 'flex', gap: 12 }}>
              {sorted.map(p => (
                <div key={p.id} className="card">
                  <strong>{p.name}</strong>
                  <span>¥{p.price}</span>
                </div>
              ))}
            </div>
          </>
        )}
      />

      <hr />

      {/* UI 2：表格 */}
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

**现代替代**：改用自定义 Hook `useMousePosition()` / `useSortableList()`（见第2节）。

---

## 8. 性能对比与选型指南

### 8.1 模式性能基准（1000次渲染）

| 模式 | 平均渲染耗时 | 内存占用 | 适用场景 |
|:---|---:|---:|:---|
| 受控组件 | ~15ms | 中 | 需实时反馈的表单 |
| 非受控组件 | ~2ms | 低 | 简单表单、文件上传 |
| 自定义 Hook | ~3ms | 低 | **首选逻辑复用** |
| 复合组件 | ~8ms | 中 | Tabs/Menu/Select |
| Portal | ~5ms | 中 | Modal/Tooltip |
| 错误边界 | ~1ms | 低 | 容错兜底 |
| HOC | ~10ms | 高 | 遗留兼容 |
| Render Props | ~12ms | 高 | **避免使用** |

### 8.2 选型决策树

```
需要复用逻辑？
├─ 只需数据/副作用
│  └─ ✅ 自定义 Hook (首选)
│     优势: 扁平、类型安全、零嵌套
│
├─ 需要包装/拦截渲染
│  ├─ 函数组件 → ✅ 自定义 Hook
│  └─ Class 组件 → ⚠️ HOC (withXxx)
│     场景: 权限、日志、遗留兼容
│
├─ 组件群需协作共享状态
│  └─ ✅ 复合组件 + Context
│     场景: Tabs、Menu、Select、Accordion
│
├─ 捕获子树渲染错误
│  └─ ✅ 错误边界 (Class)
│     配合: react-error-boundary
│
└─ 打破 DOM 层级渲染
   └─ ✅ Portal (createPortal)
      场景: Modal、Tooltip、Dropdown
```

---

## 9. 常见陷阱与调试技巧

### 9.1 陷阱 1：受控组件 value 初始值为 undefined

```tsx
// ❌ 错误：导致"受控变非受控"警告
const [name, setName] = useState<string>();

// ✅ 正确：提供空字符串初始值
const [name, setName] = useState<string>('');
```

### 9.2 陷阱 2：useEffect 依赖数组遗漏

```tsx
// ❌ 错误：闭包陷阱
useEffect(() => {
  console.log(user.id); // 始终为初始值
}, []);

// ✅ 正确：添加依赖或使用 ref
const userRef = useRef(user);
useEffect(() => { userRef.current = user; }, [user]);
```

### 9.3 陷阱 3：Portal 事件冒泡混淆

```tsx
// Portal 内按钮点击会冒泡到父组件
function Parent() {
  return (
    <div onClick={() => console.log('Parent clicked')}>
      <Modal><button>点我</button></Modal>
    </div>
  );
}
// 需要 e.stopPropagation() 阻断
```

### 9.4 调试技巧

**DevTools 配置：**
```tsx
// HOC 设置 displayName
AuthComponent.displayName = `withAuth(${WrappedComponent.name})`;

// 自定义 Hook 添加命名
function useMousePosition() { /* ... */ }
useMousePosition.displayName = 'useMousePosition';
```

**性能分析：**
```tsx
import { useStrictMode } from 'react';

// 开发环境启用严格模式检查
<React.StrictMode>
  <App />
</React.StrictMode>
```

---

## 10. React 18/19 并发特性影响

### 10.1 并发渲染对模式选择影响

| 模式 | React 18 前 | React 18+ |
|:---|:---|:---|
| 受控组件 | 同步更新 | 可被中断 |
| 非受控组件 | 无变化 | 无变化 |
| 自定义 Hook | 需手动防抖 | 可用 useTransition |
| 复合组件 | 全量更新 | 可 Suspense 分组 |

### 10.2 新特性最佳实践

**useTransition 优化表单：**
```tsx
function SearchForm() {
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    startTransition(() => {
      // 搜索逻辑，可被新输入中断
      fetchSearchResults(e.target.value);
    });
  };

  return (
    <input
      value={query}
      onChange={handleChange}
      placeholder="输入搜索..."
    />
    {isPending && <span>搜索中...</span>}
  );
}
```

**React 19 use action 提案：**
```tsx
// 状态更新更原子化
function Form() {
  const action = useAction((data) => {
    // 批量更新状态
    setUser(data.user);
    setPosts(data.posts);
  });
  
  return <form action={action}>...</form>;
}
```

---

## 11. 快速参考表

| 模式 | 用途 | 何时使用 | 何时避免 |
|:---|:---|:---|:---|
| **受控组件** | 表单管理 | 即时校验、联动、格式化 | 仅提交时读值（性能浪费） |
| **非受控组件** | 减少渲染 | 简单表单、文件上传、第三方库 | 需动态交互、复杂校验 |
| **自定义 Hook** | 逻辑复用 | **所有可抽取逻辑（首选）** | 需操作渲染树结构 |
| **复合组件** | 组件群协作 | Tabs/Menu/Select 组件族 | 组件间无共享状态 |
| **Portal** | 跨层级渲染 | Modal/Tooltip/Dropdown | 无需脱离父级 DOM |
| **错误边界** | 捕获错误 | 防止局部崩溃扩散 | 捕获事件/异步（用 try/catch） |
| **HOC** | 组件增强 | 遗留兼容、特定增强场景 | Hook 能解决（Hook 更优） |
| **Render Props** | UI/逻辑分离 | —— | **Hook 全面替代** |

---

## 总结

现代 React 组件设计遵循 **"优先 Hooks，按需组合"** 原则：

1. **日常开发**：自定义 Hook 解决 80% 逻辑复用需求
2. **组件族设计**：复合组件 + Context 构建灵活 API
3. **浮层场景**：Portal 处理脱离文档流的 UI
4. **容错兜底**：错误边界分层布置，防止崩溃扩散
5. **遗留兼容**：HOC 桥接 Hook 给 Class，逐步迁移
6. **性能优先**：简单表单用非受控，复杂交互用受控
7. **并发感知**：React 18+ 用 useTransition 优化交互流畅度

掌握这些模式，能显著提升代码的**可维护性、可测试性与扩展性**，是构建企业级 React 应用的必备基石。
