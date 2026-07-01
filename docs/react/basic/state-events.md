---
sidebar_position: 4
---

# State 状态与事件绑定

在 React 中，如果说 Props 决定了组件的“先天长相”，那么 State（状态）就是组件的“后天心跳”与“记忆力”。状态是随着用户的交互可以发生改变的数据。当状态改变时，React 会自动帮我们重新渲染组件（Re-render），把最新的数据呈现到屏幕上。

---

## 1. State 与 Props 的本质区别

开始学习状态之前，必须厘清这两个极其核心的概念：

| 特性 | Props (属性) | State (状态) |
| :--- | :--- | :--- |
| **定义者** | 由父组件（外部）传入 | 在组件内部自己声明和管理 |
| **可变性** | **只读**，子组件不能直接修改 | **可变**，只能通过特定的修改函数更新 |
| **用途** | 组件间的通信通道，传递数据或配置 | 存储组件自身的私有交互状态 |

---

## 2. useState：在函数组件中声明状态

在函数组件中，我们使用 React 提供的 `useState` 钩子 (Hook) 来声明和使用状态。

### 基本语法

```tsx
import { useState } from 'react';

const [state, setState] = useState(initialValue);
```

- **参数 `initialValue`**：状态的初始值（可以是数字、字符串、布尔值、对象、数组等）。
- **返回值 `state`**：当前状态的最新值。
- **返回值 `setState`**：一个专门用来更新该状态的函数。

### 实战示例：计数器

```tsx
import { useState } from 'react';

function Counter() {
  // 声明一个名为 count 的状态，初始值为 0
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>当前计数值: {count}</p>
      {/* 点击按钮时调用 setCount 更新 count 的值 */}
      <button onClick={() => setCount(count + 1)}>加 1</button>
    </div>
  );
}
```

---

## 3. 状态更新的两个重要特性

`useState` 的更新并不是简单地给变量赋值，它背后有 React 的调度机制。

### 特性 1：状态更新是异步的且会批量处理 (Batching)

为了优化渲染性能，React 不会每执行一次 `setState` 就立刻触发一次渲染。它会将多次状态更新“打包合并（Batching）”，然后仅在最后进行一次统一渲染。

```tsx
function AddThree() {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    setCount(count + 1);
    setCount(count + 1);
    setCount(count + 1);
    // 猜猜点击后 count 增加了多少？
    // 答案是只增加了 1！因为三次调用中拿到的 count 都是当前渲染周期下的旧值 0。
  };

  return <button onClick={handleClick}>点击: {count}</button>;
}
```

### 特性 2：使用“函数式更新”解决旧状态依赖

如果新状态依赖于前一个状态，为了确保拿到的是最新且没有被合并掉的状态，应该向 `setState` 传入一个**回调函数**。该回调函数的参数是 React 保证最新的前一次状态（通常命名为 `prev` 或 `pending`）。

```tsx
function AddThreeCorrect() {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    // 传入函数：React 会排队执行这些函数，依次累加
    setCount(prevCount => prevCount + 1); // prevCount 0 -> 1
    setCount(prevCount => prevCount + 1); // prevCount 1 -> 2
    setCount(prevCount => prevCount + 1); // prevCount 2 -> 3
    // 点击后，count 会正确地增加 3
  };

  return <button onClick={handleClick}>点击: {count}</button>;
}
```

---

## 4. 事件绑定与事件对象

React 事件绑定与原生的 HTML DOM 事件非常相似，但有两个关键区别：
- 采用驼峰命名法（如 `onClick`、`onChange`、`onSubmit`）。
- 传入的必须是**函数引用**，而不是字符串。

### 基础事件处理

```tsx
function ActionButton() {
  // 定义事件处理函数
  function handleButtonClick(event) {
    console.log('按钮被点击了！', event);
  }

  return (
    // ❌ 错误写法：会立刻执行该函数并在渲染时报错
    // <button onClick={handleButtonClick()}>点击</button>

    // 正确写法：传递函数引用
    <button onClick={handleButtonClick}>点击</button>
  );
}
```

### 访问事件对象 (SyntheticEvent)

React 中的事件对象不是原生的浏览器事件对象，而是 React 封装的**合成事件对象 (SyntheticEvent)**。它抹平了不同浏览器的差异，拥有与原生事件相同的接口，如 `preventDefault()` 和 `stopPropagation()`。

```tsx
function SearchForm() {
  const [keyword, setKeyword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // 阻止表单默认的刷新页面行为
    console.log('提交搜索关键字：', keyword);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="text" 
        value={keyword} 
        onChange={(e) => setKeyword(e.target.value)} // 获取用户输入的最新文本
      />
      <button type="submit">搜索</button>
    </form>
  );
}
```

---

## 5. 组件通信：状态提升 (Lifting State Up)

在 React 的单向数据流中，**兄弟组件之间是无法直接传递数据的**。如果两个组件需要共享同一份数据，最佳实践是：**将这个状态提升到它们最近的共同父组件中管理**。

父组件维护这个状态，并将状态值以及修改状态的回调函数，以 Props 的形式分别传给子组件。

```tsx
// 父组件：状态中心
function TemperatureController() {
  const [temperature, setTemperature] = useState(20);

  return (
    <div className="controller">
      <h2>当前温度：{temperature}°C</h2>
      {/* 传递状态给显示子组件 */}
      <TemperatureDisplay temp={temperature} />
      {/* 传递回调函数给操作子组件 */}
      <TemperatureButton onIncrement={() => setTemperature(t => t + 1)} />
    </div>
  );
}

// 子组件 A：负责展示
function TemperatureDisplay({ temp }) {
  const color = temp > 25 ? 'red' : 'blue';
  return <p style={{ color }}>状态显示：温度目前处于 {color} 区间</p>;
}

// 子组件 B：负责修改
function TemperatureButton({ onIncrement }) {
  return <button onClick={onIncrement}>加热 +1°C</button>;
}
```

通过这种单向流动的控制链条，组件之间的关系变得异常清晰，极易于调试和维护。
