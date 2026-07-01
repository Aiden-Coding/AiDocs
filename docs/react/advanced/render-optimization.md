---
sidebar_position: 4
---

# 批量更新与渲染优化策略

在 React 中，渲染优化不只是加缓存，而是构建一种“只渲染必要部分”的工程习惯。本文介绍 React 渲染优化的核心策略，包括自动批处理、`flushSync`、组件拆分、Pure Component 模式，以及避免常见的性能反模式。

---

## 1. 自动批处理 (Automatic Batching)

React 18 之后，React 能够自动合并同一事件处理程序中的多次状态更新为一次渲染。

```tsx
function Counter() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState('张三');

  const handleClick = () => {
    setCount(c => c + 1);
    setName('李四');
  };

  return <button onClick={handleClick}>点击</button>;
}
```

在 React 18 中，这两次状态更新会被自动批处理，避免触发两次渲染。

### 1.1 何时需要 `flushSync`

`flushSync` 用于在需要立即提交更新时强制同步渲染，例如在事件处理程序外部或与第三方库交互时：

```tsx
import { flushSync } from 'react-dom';

function InputWrapper() {
  const [value, setValue] = useState('');

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    flushSync(() => {
      setValue(event.target.value);
    });
    // 此时 value 会立即在下一次渲染中生效
  };

  return <input value={value} onChange={handleChange} />;
}
```

> 仅在确实需要立即同步结果时使用 `flushSync`，否则会破坏 React 的调度与性能优势。

---

## 2. 组件拆分与避免大组件重渲染

### 2.1 拆分大组件

将一个复杂组件拆分成更小、更单一职责的组件，可以让 React 更容易复用子树，减少不必要的渲染。

```tsx
function Dashboard({ user, stats }) {
  return (
    <div>
      <UserCard user={user} />
      <StatsPanel stats={stats} />
    </div>
  );
}
```

如果 `user` 不变，`StatsPanel` 也不会重新渲染，除非其 props 变化。

### 2.2 `React.memo` 与纯组件模式

`React.memo` 可以缓存组件输出，并仅在 props 发生浅比较变化时重新渲染。

```tsx
const UserCard = React.memo(function UserCard({ user }) {
  return <div>{user.name}</div>;
});
```

> 注意：只适用于 props 是可稳定比较的情况，避免无效 memo 导致复杂度上升。

---

## 3. 传递 props 时避免创建新引用

在渲染函数中创建对象或函数会导致子组件接收到新引用，从而触发无意义渲染。

### 3.1 避免内联对象

```tsx
function Parent({ config }) {
  return <Child style={{ color: 'red' }} />;
}
```

改为：

```tsx
const RED_STYLE = { color: 'red' };

function Parent({ config }) {
  return <Child style={RED_STYLE} />;
}
```

### 3.2 使用 `useMemo` 缓存复杂 props

```tsx
function Parent({ filters }) {
  const memoizedOptions = useMemo(() => ({ filters }), [filters]);
  return <Child options={memoizedOptions} />;
}
```

---

## 4. `useMemo` / `useCallback` 的正确边界

### 4.1 适合使用的场景

- `useMemo`：缓存昂贵计算结果，例如排序、过滤、汇总等。
- `useCallback`：为子组件提供稳定函数引用，避免触发依赖于函数的渲染。

### 4.2 不要过度使用

简单值计算或轻量对象通常不需要缓存，反而会增加维护成本。

```tsx
// 不建议
const doubled = useMemo(() => count * 2, [count]);
```

---

## 5. 事件处理与状态提升

### 5.1 将状态提升到最小共享范围

仅在必要时将状态提升到父组件，避免整个树都因局部状态变化而重渲染。

### 5.2 使用稳定事件回调

如果函数反复创建，可通过 `useCallback` 或自定义 Hook 将其稳定化。

---

## 6. 列表渲染与 Key 优化

- 使用稳定的唯一 `key`，避免 `index` 作为 `key`。
- 列表按业务 ID 而非位置匹配。
- 对于大型列表，优先使用虚拟列表（`react-window`、`react-virtualized`）。

---

## 7. 性能分析工具

- React DevTools Profiler：查找渲染热点与不必要的重渲染。
- Chrome Performance：分析 JS 执行、布局与绘制。
- Lighthouse：整体性能评分与建议。

优化不是一次性任务，而是持续观察与迭代的过程。
