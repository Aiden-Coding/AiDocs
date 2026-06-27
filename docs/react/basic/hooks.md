---
sidebar_position: 2
---

# Hooks 与函数式组件

## 1. 为什么是 Hooks？

在 React 16.8 之前，具备自身状态和生命周期的组件必须以**类 (Class)** 的形式编写，导致了：
- `this` 绑定地狱。
- 高阶组件 (HOC) 嵌套过深带来的 "Wrapper Hell"。
- 复杂组件内部各个生命周期逻辑非常分散。

Hooks 的诞生让函数组件终于有了持久的心跳。

## 2. 核心 Hooks 解析

### 1) useState

构建函数组件最基础的心跳：负责触发 React 调度更新的核心接口。

```tsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <button onClick={() => setCount(prev => prev + 1)}>
      Clicked {count} times
    </button>
  );
}
```

### 2) useEffect

专门用来将组件与**外部系统** (API 请求，DOM 订阅，非 React 环境的实例) 同步的副作用工具。

> **防空设计提示**: 在通过 Docusaurus 等 SSG 框架进行预渲染时，`useEffect` 绝不会在 Node.js 编译期被触发，适合将使用了 `window` 或 `localStorage` 的逻辑封装在其中。