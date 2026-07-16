---
sidebar_position: 7
---

# 渲染优化与批量更新

React 18+ 的架构演进在底层对重渲染的合并调度进行了重大升级，核心特征是**全面自动批处理（Automatic Batching）**。掌握这一机制的运行模式以及精巧的架构避坑手法，能让我们的应用在不做底层算法优化的前提下，在重渲染开销上实现大幅瘦身。

---

## 1. 自动批处理 (Automatic Batching)

### 什么是批处理？

当用户点击一个事件，你触发了多个状态的修改，React 不会每一次修改都触发一次 UI 的重渲染，而是将这几个修改**“打包”**起来，只在最后触发**唯一一次** DOM 更新与重渲染。这就像你网购了多件衣服，商家打包寄送一个包裹，而不是分好几个快递寄给你。

### React 18 前后的重大差异

在 **React 18 之前**，React 仅对 **React 事件处理函数**（如 `onClick`、`onChange`）内部的状态修改执行批处理。一旦状态修改位于以下异步场景的内部：
- `Promise.then` 回调中
- `setTimeout` / `setInterval` 宏任务中
- 原生事件监听器（如 `document.addEventListener`）中

React 就会**失效批处理机制**，每一个 `setState` 都会同步且立刻触发一次单独的重渲染，这会造成极大的性能浪费。

在 **React 18 及之后**，由于并发特性的引入，React 实现了**全面自动批处理**。不论状态修改发生在什么异步回调、原生事件或是定时器内部，一律执行打包更新。

```tsx
function BatchingContrast() {
  const [count, setCount] = useState(0);
  const [flag, setFlag] = useState(false);

  const handleClickAsync = () => {
    fetch('/api/data').then(() => {
      // 💡 在 React 18 之后，此处只会触发 1 次重新渲染！
      // 而在旧版 React 中，由于在 Promise 回调内，此处会立即导致 2 次独立的重渲染
      setCount(c => c + 1);
      setFlag(f => !f);
    });
  };

  return <button onClick={handleClickAsync}>异步状态触发</button>;
}
```

---

## 2. 绕过批处理：flushSync

如果有些业务逻辑非常特殊，你**必须在状态修改后，立刻同步读取 DOM 最新的尺寸、高度或属性值**。此时如果你等待 React 异步批处理渲染，会读到旧的数据。

你可以使用 `flushSync` 来强制 React 绕过批处理，立即同步更新 DOM：

```tsx
import { useState } from 'react';
import { flushSync } from 'react-dom';

function FlushSyncDemo() {
  const [text, setText] = useState('初始值');

  const handleUpdate = () => {
    // 强制此更新同步进行
    flushSync(() => {
      setText('最新输入值');
    });
    // 由于 flushSync，下方的 DOM 元素内容已经同步被更改为 '最新输入值'
    const divContent = document.getElementById('demo-div')?.innerText;
    console.log('最新的 DOM 文本：', divContent); // 输出 '最新输入值'
  };

  return (
    <div>
      <div id="demo-div">{text}</div>
      <button onClick={handleUpdate}>同步更新</button>
    </div>
  );
}
```

> [!CAUTION]
> **不要滥用 `flushSync`**。
> 它会严重破坏 React 的更新性能调度，极易触发主线程长时间卡顿，因此它只应该被用于对 DOM 元素尺寸读取有硬性实时性需求的极端微观场景。

---

## 3. 通过“组件拆分与组合”巧妙规避重渲染

很多时候，我们的组件被重新渲染，是因为它跟另外一些“高频更新的状态”塞在了同一个容器里。其实不需要写 `React.memo`，通过合理的架构重构，即可低成本地切断重渲染的传递。

### 手法 A：状态下沉 (State Down)

如果一个复杂的页面组件中，只有一小块区域（如一个展开/折叠面板）依赖某个状态，应当将这个状态和这块区域**打包提取为一个单独的子组件**，让状态留在子组件内部。

```tsx
// ❌ 错误做法：将面板状态留在父组件，每次 toggle 都会导致整个页面大卡顿
function HeavyPage() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setIsOpen(!isOpen)}>切换面板</button>
      {isOpen && <PanelContent />}
      <VeryHeavySubtree /> {/* 每次 toggle，这个昂贵的子树都会被连累重新渲染！ */}
    </div>
  );
}

//  正确做法：将状态下沉到局部组件
function TogglePanel() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button onClick={() => setIsOpen(!isOpen)}>切换面板</button>
      {isOpen && <PanelContent />}
    </>
  );
}

function HealthyPage() {
  return (
    <div>
      <TogglePanel />
      <VeryHeavySubtree /> {/* 状态下沉后，此子树绝对不会因为面板的开合触发重渲染 */}
    </div>
  );
}
```

### 手法 B：内容提取为 Children (Lifting Content Up)

如果状态更改所在的组件确实包含一个极重的内容树，可以将这个极重的内容树提取出来，以 `children` 属性的方式传入，实现重渲染的物理隔离。

```tsx
//  推荐：由于 HeavyTree 是作为 children 从外部传入的，它的引用在渲染时保持稳定，
// React 发现其未改变，会自动跳过 HeavyTree 的渲染，即使 Wrapper 的 state 改变了
function ScrollWrapper({ children }: { children: React.ReactNode }) {
  const [scrollPos, setScrollPos] = useState(0);

  return (
    <div onScroll={(e) => setScrollPos(e.currentTarget.scrollTop)}>
      <p>滑动距离：{scrollPos}px</p>
      {children}
    </div>
  );
}

function Page() {
  return (
    <ScrollWrapper>
      <VeryHeavyTree /> {/* 被成功保护，不跟随滑动高频重渲染 */}
    </ScrollWrapper>
  );
}
```
