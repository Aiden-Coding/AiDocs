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

#### 💡 深度剖析：合成事件机制原理与演进

为了提升事件处理性能并优化跨端/跨浏览器体验，React 并没有将事件监听器直接绑定到每个具体的 DOM 元素上，而是采用了一套高度优化的**合成事件机制**。

##### 1. 事件委托节点的重大调整 (React 17+)

- **React 17 之前**：React 会将所有的事件都委托绑定到 HTML 文档的根节点 `document` 上。当事件发生并冒泡到 `document` 时，React 统一进行分发与处理。
- **React 17 及之后**：React 将事件绑定到了 **React 应用的 Root 挂载容器**（通常是 `div#app` 或 `div#root`）上。
- **这一演进解决了什么痛点？**
  1. **多版本 React 共存**：在微前端架构或老旧系统渐进式迁移时，页面上可能同时运行着两个不同版本的 React。若都绑定在 `document` 上，事件处理会发生严重的冲突和重写。绑定到各自应用的 Root 容器后，不同实例的事件处理彻底隔离。
  2. **原生事件与合成事件的阻断直觉**：在以前，如果你用 `document.addEventListener` 绑定了一个原生事件监听器，并在 React 组件中用合成事件的 `e.stopPropagation()` 试图阻止冒泡，原生监听器依然会被执行（因为事件已经冒泡到了 `document` 后 React 才触发停止）。React 17 调整绑定节点后，原生监听器能正确捕获并被 React 合成事件拦截，这种行为表现更符合直觉。

##### 2. 取消事件池机制 (Event Pooling)

- **痛点**：在旧版 React 中，为了节省内存，合成事件对象会被放入一个“事件池”中循环复用。这意味着当事件处理函数执行完毕后，对应的 `SyntheticEvent` 内部的属性（如 `e.target`）会被全部重置为 `null`。如果你想在异步操作（如 `setTimeout` 或 `fetch` 回调）中访问 `e.target.value`，会报 `null` 指针错误，除非手动调用 `e.persist()`。
- **改进**：**React 17 彻底移除了事件池机制**。现在所有的合成事件对象都是现代 JS 引擎快速回收的普通对象，你可以随时在异步回调中直接安全地读取它们。

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

---

## 🧪 State 与事件自检清单

在继续之前，检查以下几点你是否都掌握了：

- [ ] **State vs Props**：能够区分什么时候该用 State，什么时候该用 Props
- [ ] **useState 基本使用**：能够正确声明状态和更新状态
- [ ] **异步更新机制**：理解状态更新的异步性和批处理机制
- [ ] **函数式更新**：知道什么时候需要使用 `setState(prev => ...)` 形式
- [ ] **事件绑定**：能够正确绑定事件处理函数
- [ ] **SyntheticEvent**：理解 React 合成事件与原生事件的区别
- [ ] **状态提升**：知道如何在兄弟组件间共享状态

如果有任何不清楚的地方，建议再读一遍相关章节。

---

## ⚠️ 常见误区与陷阱

### 误区 1：直接修改状态对象

```tsx
// ❌ 错误：直接修改状态对象，React 检测不到变化
function Counter() {
  const [user, setUser] = useState({ name: 'Alice', age: 20 });

  const handleBirthday = () => {
    user.age = user.age + 1; // 虽然修改了，但 React 不会重渲染
    setUser(user);
  };

  return (
    <div>
      <p>{user.name} 今年 {user.age} 岁</p>
      <button onClick={handleBirthday}>过生日</button>
    </div>
  );
}

// ✅ 正确：创建新对象，让 React 检测到变化
function Counter() {
  const [user, setUser] = useState({ name: 'Alice', age: 20 });

  const handleBirthday = () => {
    // 方案 1：使用对象展开符创建新对象
    setUser({ ...user, age: user.age + 1 });
    
    // 或者方案 2：使用函数式更新
    setUser(prevUser => ({ ...prevUser, age: prevUser.age + 1 }));
  };

  return (
    <div>
      <p>{user.name} 今年 {user.age} 岁</p>
      <button onClick={handleBirthday}>过生日</button>
    </div>
  );
}
```

**原因**：React 通过比较新旧对象的引用地址来判断是否发生了变化。直接修改不会改变引用地址，React 就检测不到。

### 误区 2：闭包陷阱：多次 setState 只执行了一次

```tsx
// ❌ 错误：三次 setCount 都使用了同一个旧 count 值
function AddThree() {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    setCount(count + 1);  // count 仍是 0，所以变成 1
    setCount(count + 1);  // count 仍是 0，所以还是 1
    setCount(count + 1);  // count 仍是 0，所以还是 1
    // 最终 count = 1
  };

  return <button onClick={handleClick}>点击 {count}</button>;
}

// ✅ 正确：使用函数式更新，React 会排队执行
function AddThree() {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    setCount(prev => prev + 1);  // 0 + 1 = 1
    setCount(prev => prev + 1);  // 1 + 1 = 2
    setCount(prev => prev + 1);  // 2 + 1 = 3
    // 最终 count = 3
  };

  return <button onClick={handleClick}>点击 {count}</button>;
}
```

### 误区 3：在渲染过程中调用 setState

```tsx
// ❌ 错误：无限渲染循环
function BadComponent() {
  const [count, setCount] = useState(0);

  setCount(count + 1); // 这行代码在每次渲染时都会执行！
  // 1. 组件首次渲染，count = 0，然后调用 setCount(1)
  // 2. 状态更新，触发重渲染，count = 1，然后调用 setCount(2)
  // 3. 无限循环...

  return <div>{count}</div>;
}

// ✅ 正确：使用 useEffect 隔离副作用
import { useState, useEffect } from 'react';

function GoodComponent() {
  const [count, setCount] = useState(0);

  // useEffect 只在组件挂载时执行一次
  useEffect(() => {
    setCount(1);
  }, []); // 空依赖项数组表示只执行一次

  return <div>{count}</div>;
}
```

### 误区 4：在事件处理函数中调用 setState 后立刻使用新值

```tsx
// ❌ 错误：setState 是异步的，下一行代码执行时还用不到新值
function Form() {
  const [formData, setFormData] = useState({ name: '' });

  const handleSubmit = () => {
    setFormData({ name: 'Alice' });
    console.log(formData); // 输出的还是旧值 { name: '' }，不是 { name: 'Alice' }
    submitToServer(formData);
  };

  return <button onClick={handleSubmit}>提交</button>;
}

// ✅ 正确方案 1：将需要用新值的逻辑放在 useEffect
import { useState, useEffect } from 'react';

function Form() {
  const [formData, setFormData] = useState({ name: '' });

  useEffect(() => {
    // 这个 effect 会在 formData 更新后执行
    if (formData.name) {
      submitToServer(formData);
    }
  }, [formData]);

  const handleSubmit = () => {
    setFormData({ name: 'Alice' });
  };

  return <button onClick={handleSubmit}>提交</button>;
}

// ✅ 正确方案 2：直接使用新值而不依赖 state
function Form() {
  const handleSubmit = () => {
    const newData = { name: 'Alice' };
    submitToServer(newData);
  };

  return <button onClick={handleSubmit}>提交</button>;
}
```

### 误区 5：错误地传递事件处理函数

```tsx
// ❌ 错误 1：立刻调用函数，而不是传递函数引用
function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={setCount(count + 1)}>
      加 1
    </button>
  );
}
// 问题：onClick={setCount(count + 1)} 会在渲染时立刻调用，导致无限更新

// ❌ 错误 2：用字符串表示函数
function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick="setCount(count + 1)">
      加 1
    </button>
  );
}
// 问题：React 会把字符串当作字面量，不会执行其中的代码

// ✅ 正确 1：传递函数引用
function Counter() {
  const [count, setCount] = useState(0);

  const handleClick = () => setCount(count + 1);

  return <button onClick={handleClick}>加 1</button>;
}

// ✅ 正确 2：使用箭头函数包裹
function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(count + 1)}>
      加 1
    </button>
  );
}
```

### 误区 6：直接传递参数到事件处理函数

```tsx
// ❌ 错误：无法传递额外参数
function TodoList({ todos }) {
  const handleDelete = (id) => {
    console.log('删除 ID：', id);
  };

  return (
    <ul>
      {todos.map(todo => (
        <li key={todo.id}>
          {todo.text}
          {/* 这样写无法传递 todo.id 给 handleDelete */}
          <button onClick={handleDelete}>删除</button>
        </li>
      ))}
    </ul>
  );
}

// ✅ 正确 1：使用箭头函数包裹
function TodoList({ todos }) {
  const handleDelete = (id) => {
    console.log('删除 ID：', id);
  };

  return (
    <ul>
      {todos.map(todo => (
        <li key={todo.id}>
          {todo.text}
          <button onClick={() => handleDelete(todo.id)}>删除</button>
        </li>
      ))}
    </ul>
  );
}

// ✅ 正确 2：使用 bind 绑定参数（较少使用）
function TodoList({ todos }) {
  const handleDelete = (id) => {
    console.log('删除 ID：', id);
  };

  return (
    <ul>
      {todos.map(todo => (
        <li key={todo.id}>
          {todo.text}
          <button onClick={handleDelete.bind(null, todo.id)}>删除</button>
        </li>
      ))}
    </ul>
  );
}
```

### 误区 7：状态提升但忘记传递更新回调

```tsx
// ❌ 错误：子组件只收到了数据，但没办法更新它
function Parent() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <Child count={count} />  {/* 只传递了数据，没有回调 */}
    </div>
  );
}

function Child({ count }) {
  return (
    <div>
      <p>计数：{count}</p>
      <button onClick={() => ???}>加 1</button>  {/* 无法更新！ */}
    </div>
  );
}

// ✅ 正确：既传递数据，也传递回调
function Parent() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <Child 
        count={count} 
        onIncrement={() => setCount(c => c + 1)}
      />
    </div>
  );
}

function Child({ count, onIncrement }) {
  return (
    <div>
      <p>计数：{count}</p>
      <button onClick={onIncrement}>加 1</button>
    </div>
  );
}
```

### 误区 8：忘记为表单受控组件设置 value

```tsx
// ❌ 错误：只设置了 onChange，但没有设置 value
function TextInput() {
  const [text, setText] = useState('');

  return (
    <input
      onChange={(e) => setText(e.target.value)}
      // 缺少 value 属性！
    />
  );
}
// 问题：输入框会显示浏览器的默认行为，用户输入不会被 React 控制

// ✅ 正确：受控组件需要同时设置 value 和 onChange
function TextInput() {
  const [text, setText] = useState('');

  return (
    <input
      value={text}
      onChange={(e) => setText(e.target.value)}
    />
  );
}
```

---

## 📖 进阶思考

### 为什么 React 设计成状态更新是异步的？

1. **性能优化**：批量处理多个状态更新，只触发一次渲染，而不是每次都重新渲染
2. **可预测性**：避免中间状态被暴露给用户，只呈现完整一致的最终状态
3. **并发特性**：为 React 18+ 的 Concurrent Mode 打好基础，支持任务优先级调度

### State 可以存储什么类型的数据？

理论上 State 可以存储任何 JavaScript 类型的数据：
- **基本类型**：数字、字符串、布尔值、null、undefined
- **对象和数组**：非常常见，但更新时需要创建新引用
- **函数引用**：虽然技术上可行，但通常不推荐

最佳实践是：**State 应该只存储影响 UI 的数据**。不影响 UI 的数据（如计时器 ID、网络请求的 AbortController）应该存储在 `useRef` 中。

---

## 🎯 实战练习

### 练习 1：构建一个受控表单

需求：
- 包含文本输入框、下拉菜单、复选框
- 用 State 管理所有表单数据
- 点击提交时打印表单数据

<details>
<summary>参考答案</summary>

```tsx
import { useState } from 'react';

interface FormData {
  name: string;
  category: string;
  subscribed: boolean;
}

function ControlledForm() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    category: 'technology',
    subscribed: false
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: val
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('提交的表单数据：', formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        name="name"
        value={formData.name}
        onChange={handleChange}
        placeholder="输入名称"
      />
      
      <select name="category" value={formData.category} onChange={handleChange}>
        <option value="technology">技术</option>
        <option value="sports">体育</option>
        <option value="entertainment">娱乐</option>
      </select>
      
      <label>
        <input
          type="checkbox"
          name="subscribed"
          checked={formData.subscribed}
          onChange={handleChange}
        />
        订阅我们的邮件
      </label>
      
      <button type="submit">提交</button>
    </form>
  );
}
```

</details>

### 练习 2：修复状态提升中的 Bug

以下代码有问题，找出并修复：

```tsx
function Parent() {
  const [items, setItems] = useState(['apple', 'banana']);

  const handleAddItem = (item) => {
    items.push(item); // Bug 1
    setItems(items);  // Bug 2
  };

  return (
    <div>
      <ItemList items={items} />
      <AddItemButton onAdd={handleAddItem} />
    </div>
  );
}
```

<details>
<summary>参考答案</summary>

问题：
1. **Bug 1**：直接修改数组，React 检测不到引用变化
2. **Bug 2**：即使调用了 setItems，由于引用相同，也不会触发重渲染

修正代码：

```tsx
function Parent() {
  const [items, setItems] = useState(['apple', 'banana']);

  const handleAddItem = (item) => {
    // 正确：创建新数组
    setItems(prevItems => [...prevItems, item]);
  };

  return (
    <div>
      <ItemList items={items} />
      <AddItemButton onAdd={handleAddItem} />
    </div>
  );
}
```

</details>

---

## 📚 关键概念总结表

| 概念 | 说明 | 例子 |
| ----- | ------ | ------ |
| **State** | 组件内部可变的状态数据 | `const [count, setCount] = useState(0)` |
| **setState** | 更新状态的函数 | `setCount(count + 1)` |
| **异步更新** | 状态更新不会立刻生效 | setState 后的下一行无法使用新值 |
| **批处理** | 多个 setState 合并为一次渲染 | 事件处理中的三个 setState 只触发一次渲染 |
| **函数式更新** | 向 setState 传入函数获取最新状态 | `setCount(prev => prev + 1)` |
| **事件对象** | React 的合成事件 | `(e: React.ChangeEvent<HTMLInputElement>)` |
| **受控组件** | 表单值由 State 完全控制 | `<input value={text} onChange={...} />` |
| **状态提升** | 将状态移到父组件以共享 | 兄弟组件通过父组件通信 |

---

## 🔗 下一步

掌握了 State 和事件处理后，你已经可以构建有交互的 React 应用了。建议继续学习：
1. [常用 Hooks 深度解析](5-hooks.md)：学习 useEffect、useRef 等核心 Hooks
2. [组件设计模式](6-component-patterns.md)：设计可复用的高级组件
3. [初级练习题](../practice/0-beginner-exercises.md)：通过实战强化理解
