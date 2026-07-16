---
sidebar_position: 12
---

# React 19 全新特性与 API

React 19 带来了并发模型、表单异步交互、全新数据获取范式的重磅重构。它不再仅仅是渲染库，而是在全栈化、异步流程自动化上迈出了里程碑式的一步。本章将对 React 19 引入的革命性新特性进行系统梳理。

---

## 1. 异步 Actions 与 useActionState

在 React 19 之前，管理表单提交等异步网络操作需要手动声明多个 State 来控制 Loading 状态、Error 错误信息以及最新返回的数据：

```tsx
// React 19 之前
const [isPending, setIsPending] = useState(false);
const [error, setError] = useState(null);
const [data, setData] = useState(null);

const handleUpdate = async () => {
  setIsPending(true);
  try {
    const res = await api.update();
    setData(res);
  } catch (err) {
    setError(err);
  } finally {
    setIsPending(false);
  }
};
```

React 19 引入了 **Actions（异步操作）** 概念，并提供了全新的 Hook **`useActionState`**（开发预览阶段曾用名 `useFormState`）来彻底接管这一过程。

### 语法与用法

```tsx
import { useActionState } from 'react';

// 定义 Action 函数：接收前一次的 state 和表单的 formData（或参数）
async function updateUsername(prevState: any, formData: FormData) {
  try {
    const newName = formData.get('username');
    await api.changeName(newName);
    return { success: true, name: newName, error: null };
  } catch (err: any) {
    return { success: false, name: prevState.name, error: err.message };
  }
}

function UsernameForm() {
  // state: 当前的 Action 状态返回值
  // formAction: 绑定的执行函数，会自动传给 <form action={...}>
  // isPending: 是否在 Pending 挂起状态（自动追踪 Action 的异步 Promise）
  const [state, formAction, isPending] = useActionState(updateUsername, {
    success: false,
    name: '',
    error: null,
  });

  return (
    <form action={formAction}>
      <input type="text" name="username" defaultValue={state.name} />
      <button type="submit" disabled={isPending}>
        {isPending ? '正在更新...' : '保存'}
      </button>
      {state.error && <p className="error">{state.error}</p>}
      {state.success && <p className="success">更新成功！</p>}
    </form>
  );
}
```

- **异步自动挂起（Transition Pending）**：当表单提交时，Action 对应的 Promise 处于 resolve 期间，`isPending` 会自动变成 `true`，完成后自动重置为 `false`。

---

## 2. useFormStatus：突破层级的表单状态捕获

当表单深层嵌套了按钮、输入框等子组件时，如果我们想要让这些子组件感知到父级 `<form>` 是否正在提交（以便禁用自身或改变样式）：
- **旧方案**：需要通过全局 Context 逐级透传。
- **React 19**：子组件直接使用 `useFormStatus` 获取表单提交状态。

```tsx
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  // useFormStatus 能够突破组件层级，捕获离其最近的父级 <form> 的 action 状态
  const { pending, data, method, action } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? '发送中...' : '提交'}
    </button>
  );
}
```

> [!NOTE]
> `useFormStatus` 只能在 `<form>` 的**子代组件**内部使用，不能在包含该 `<form>` 的同一级组件中读取自身的表单状态。

---

## 3. use 关键字：动态、条件性解析 Resource 与 Context

在 React 19 中，新增了一个名为 `use` 的全局 API。它允许你在组件中**动态读取 Context** 或者**解析 Promise**。

最颠覆的一点是：**`use` 是唯一可以在条件语句（`if`）和循环（`for`）中调用的 Hook-like API**。

### 解析 Promise

配合 React 的 `<Suspense>` 机制，可以在渲染期间直接解析 Promise，而不需要写在 `useEffect` 里：

```tsx
import { use, Suspense } from 'react';

function WeatherCard({ dataPromise }: { dataPromise: Promise<{ temp: number }> }) {
  // use 会在此处挂起组件渲染，直到 dataPromise resolve
  const weather = use(dataPromise);

  return <div>当前温度: {weather.temp}°C</div>;
}

// 外部使用时包裹 Suspense 提供 fallback UI
function App() {
  const promise = fetchWeatherData(); // 返回一个 Promise
  
  return (
    <Suspense fallback={<div>正在获取天气...</div>}>
      <WeatherCard dataPromise={promise} />
    </Suspense>
  );
}
```

### 条件读取 Context

```tsx
import { use } from 'react';

function InfoPanel({ showDetails }) {
  if (showDetails) {
    // use 可以在条件分支里读取 Context
    const theme = use(ThemeContext);
    return <div className={`panel--${theme}`}>详细信息内容</div>;
  }
  return <div>概览内容</div>;
}
```

---

## 4. useOptimistic：乐观更新 Hook

在处理点赞、发送消息等交互时，我们希望不等服务器接口返回，就立刻更新 UI 告知用户已完成（如果服务器最后报错，再回滚状态）。这叫做**乐观更新 (Optimistic Updates)**。

React 19 提供了 `useOptimistic` 来简化这一逻辑：

```tsx
import { useOptimistic, startTransition } from 'react';

function MessageList({ messages, sendMessage }) {
  // 声明一个乐观状态，当没有 action 挂起时，直接使用 messages 数据
  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    messages,
    // 更新函数：接收当前状态和新传入的乐观值，返回组合后的状态
    (state, newMessage: string) => [...state, { text: newMessage, sending: true }]
  );

  const handleSend = async (formData: FormData) => {
    const text = formData.get('message') as string;
    
    // 必须在 Transition (action) 中使用
    startTransition(async () => {
      // 1. 立即触发乐观更新，UI 瞬间展示出新消息（显示发送中）
      addOptimisticMessage(text);
      
      // 2. 发送网络请求
      await sendMessage(text);
    });
  };

  return (
    <div>
      {optimisticMessages.map((msg, i) => (
        <p key={i}>
          {msg.text} {msg.sending && <small>(发送中...)</small>}
        </p>
      ))}
      <form action={handleSend}>
        <input type="text" name="message" />
        <button type="submit">发送</button>
      </form>
    </div>
  );
}
```

---

## 5. 易用性重大改进

React 19 在开发者体验上做出了大量痛点改进：

### 1) 告别 `forwardRef`：`ref` 直接作为 Prop

在 React 19 之前，如果你想把 `ref` 传递给子组件的底层 DOM，必须使用繁琐的 `forwardRef` 包装子组件。
在 React 19 中，**`ref` 会像普通的 prop 一样直接传递**，不再需要 `forwardRef`。

```tsx
// React 19 写法：直接接收 ref
function CustomInput({ label, ref }: { label: string; ref: React.Ref<HTMLInputElement> }) {
  return (
    <label>
      {label}
      <input ref={ref} type="text" />
    </label>
  );
}
```

### 2) 文档元数据支持 (Document Metadata)

React 19 原生支持在组件树的任何地方使用 `<title>`、`<meta>` 和 `<link>` 标签，React 会自动将它们**提升 (Hoist)** 到 HTML 文档的 `<head>` 中。这使得无需再使用 `react-helmet` 库。

```tsx
function BlogPost({ post }) {
  return (
    <article>
      {/* 自动提升至 head */}
      <title>{post.title}</title>
      <meta name="description" content={post.summary} />
      
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </article>
  );
}
```

### 3) 样式表加载与预加载支持

React 19 增强了对样式表资源加载周期的管理。支持通过 `<link rel="stylesheet">` 进行声明，React 会根据 `precedence`（优先级）在 head 中对它们进行排序并去重，并在渲染该样式表所对应的组件之前，挂起渲染直到样式表加载完成。

```tsx
function Component() {
  return (
    <div>
      {/* 声明优先级，React 会自动处理加载与插入 head */}
      <link rel="stylesheet" href="path/to/styles.css" precedence="default" />
      <div className="styled-box">受样式影响的组件</div>
    </div>
  );
}

### 4) 自定义元素 (Custom Elements / Web Components) 的完美支持

在 React 19 之前，React 与原生 Web Components 的结合一直存在痛点：
1.  **Properties 与 Attributes 的路由混乱**：React 会把绑定在自定义元素上的所有 Props 统一通过 `setAttribute` 设置为 HTML Attribute。对于那些只能通过 Property 接收的非字符串复杂对象（如 arrays 或 objects），这会导致绑定失效。
2.  **自定义事件监听困难**：无法像订阅普通事件那样通过 `onEventName` 来订阅自定义元素派发的 Custom Event，必须手动通过 `useRef` 在 DOM 上调用 `addEventListener`。

**React 19 彻底通过了 [Custom Elements Everywhere](https://custom-elements-everywhere.com/) 测试，实现 100% 兼容**：
*   **智能绑定**：React 19 会在运行时自动检测：如果对应的 Key 存在于自定义元素的 DOM Property 中，则将其直接绑定为 Property；否则，才回退到 `setAttribute`。
*   **原生事件代理支持**：现在可以直接在 JSX 中以 `onEvent` 形式监听 Custom Elements 发出的原生自定义事件。

```tsx
// 1. 假设注册了一个 Web Component 自定义元素
// class MyUserCard extends HTMLElement { ... }
// customElements.define('my-user-card', MyUserCard);

// 2. React 19 中可以直接开箱即用：
function App() {
  const handleUserClick = (e: Event) => {
    // 捕获自定义元素派发的 CustomEvent
    console.log('捕获到自定义卡片点击事件：', (e as CustomEvent).detail);
  };

  return (
    <div>
      {/* 1. info 直接通过 Property 传给自定义元素，而非 attribute */}
      {/* 2. 直接使用 onUserClick 绑定自定义事件 */}
      <my-user-card 
        info={{ name: '李四', role: '工程师' }} 
        onUserClick={handleUserClick} 
      />
    </div>
  );
}
```
```
