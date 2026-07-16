---
sidebar_position: 6
---

# 性能优化与 React Compiler

性能优化是衡量一个 React 开发者专业深度分水岭。React 19 带来了革命性的 **React Compiler（编译器）**，宣告了手动 `useMemo` 与 `useCallback` 时代的落幕。但在现阶段，理解自动编译机制与传统的运行时优化技术依然是应对各类极限性能场景的必备技能。

---

## 1. 自动Memoization时代：React Compiler

在以前，为了防止父组件重新渲染导致昂贵的子组件树无意义重渲染，我们不得不手动编写大量晦涩的代码进行缓存优化：

```tsx
// React 19 之前：不得不写大量依赖项
const memoizedValue = useMemo(() => computeExpensiveValue(a, b), [a, b]);
const memoizedCallback = useCallback(() => handleClick(c), [c]);
```

### React Compiler 的工作原理

React Compiler 是一款**构建期（Build-time）编译器**。它在项目打包阶段静态分析你的 JS/TS 代码，并自动插入类似缓存的优化节点（称为“记忆槽”）。

- **基本原理**：编译器会自动检测组件的依赖关系，一旦检测到组件的输入值（Props/State）未发生改变，就会自动在底层直接复用上一次渲染的返回值，避免执行函数体。
- **无需改动代码**：开发者可以像写原生 JS 一样心无杂念地编写普通 React 代码，编译器会默默在后台帮你应用极限性能优化。

### 编译器友好契约（非常重要）

React Compiler 并不是魔法，如果你的代码违反了 React 的基本开发规范，编译器可能会放弃优化。你必须遵守：
- **组件纯净性**：绝对不要在渲染逻辑中直接修改任何传入的 Props。
- **不要突变引用对象**：如果某个变量在多处共享，不要直接执行 `obj.x = 1`，而是使用 `{...obj, x: 1}` 生成新引用，这样编译器才能安全进行浅比较。

---

## 2. 传统优化利器：useMemo 与 useCallback 的正确姿势

在没有使用 React Compiler 的旧版本或未启用编译器的模块中，理解运行时的优化手法依然重要。

### useMemo：缓存计算结果

用于缓存高计算开销的复杂数据加工结果。如果依赖项没有发生改变，在下一次渲染中会直接从缓存中取出上一次的结果，避免重新计算。

```tsx
const sortedList = useMemo(() => {
  return list.sort((a, b) => b.score - a.score);
}, [list]); // 只有 list 改变时，才重新排序
```

### useCallback：缓存函数引用

在 React 中，每次重新渲染都会生成一个全新的匿名函数实例。如果把这个匿名函数传给子组件，由于子组件收到的 prop 引用变化了，子组件会被迫跟着重新渲染。`useCallback` 用于锁定函数指针的稳定性。

> [!WARNING]
> **滥用 `useCallback` 适得其反！**
> 如果子组件没有被 `React.memo` 包裹（不进行 Props 的浅比较），那么缓存父组件的函数指针是没有任何意义的。因为父组件渲染时，子组件依然会无条件跟着重新渲染，反而白白增加了 `useCallback` 自身声明的额外内存开销。

---

## 3. 虚拟列表 (Virtual List)：处理海量数据渲染

如果一个列表包含数万条数据，一次性渲染出对应的真实 DOM 节点会导致浏览器内存暴涨、滑动卡顿。**虚拟列表（Virtual List）**的核心原理是：**只渲染当前可视区域（Viewport）内的那一小撮 DOM 节点**，随着用户的滑动动态替换内容与相对位移。

### 基于 react-window 的实战配置

```tsx
import { FixedSizeList as List } from 'react-window';

const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
  // style 属性包含了 react-window 计算好的 absolute 定位和高度偏移量，必须正确传递
  <div style={style} className={index % 2 === 0 ? 'Row-even' : 'Row-odd'}>
    商品详情 #{index}
  </div>
);

export function VirtualizedList() {
  return (
    <List
      height={400}        // 容器视口高度
      itemCount={10000}    // 列表总条数（1万条）
      itemSize={35}       // 单个列表项高度
      width={300}         // 容器视口宽度
    >
      {Row}
    </List>
  );
}
```

---

## 4. 代码分割与惰性加载 (Code Splitting)

大包体包（Bundle Size）是导致首屏加载缓慢和 TTI（可交互时间）变长的元凶。React 提供了 `React.lazy` 与 `Suspense` 来实现**路由级或组件级**的异步惰性加载。

```tsx
import React, { Suspense, useState } from 'react';

// 1. 异步动态加载组件
const ExpensiveChart = React.lazy(() => import('./ExpensiveChart'));

export function LazyLoadingApp() {
  const [showChart, setShowChart] = useState(false);

  return (
    <div>
      <button onClick={() => setShowChart(true)}>展示数据图表</button>
      
      {/* 2. 配合 Suspense 提供加载中的 Fallback UI */}
      {showChart && (
        <Suspense fallback={<div>图表库组件正在急速下载...</div>}>
          <ExpensiveChart />
        </Suspense>
      )}
    </div>
  );
}
```

---

## 5. React DevTools Profiler 调优实战

当你怀疑页面出现性能卡顿时，不要盲目去套用 Memo。正确的排查方法是使用 **React DevTools** 的 **Profiler** 标签页：

1. 打开 Chrome 开发者工具，切换到 **Profiler** 标签。
2. 点击左上角的 **Record (小圆点)** 开始录制。
3. 在页面上进行可能产生卡顿的交互操作（如输入、拖拽）。
4. 再次点击录制按钮停止录制。
5. **分析火焰图（Flamegraph Chart）**：
   - 柱子高度越高、颜色越偏向黄色，代表该组件在此次更新中占用的 CPU 渲染时间越长。
   - 双击变黄的组件，在右侧面板中，React Profiler 会清晰地告诉你：**“Why did this render? (为什么该组件会在此刻渲染？)”**，例如 `Props changed: [onClick]`，此时你就可以精准地去优化 `onClick` 的引用稳定性。
