---
sidebar_position: 2
---

# JSX 语法与规范

JSX（JavaScript XML）是 React 独创的一种语法扩展，它允许我们在 JavaScript 代码中直接编写类似 HTML 的结构。对于刚接触 React 的小白来说，理解 JSX 的本质以及它的书写规范，是迈向 React 开发的第一步。

---

## 1. 什么是 JSX？

在传统的 Web 开发中，HTML（结构）、CSS（样式）和 JavaScript（逻辑）是分离的。而 React 认为，渲染逻辑本质上与其他 UI 逻辑是内在耦合的。因此，React 引入了 JSX，将结构与逻辑合二为一。

> [!IMPORTANT]
> **JSX 不是 HTML，也不是字符串。** 它是一种 JavaScript 的语法扩展，最终会被编译器（如 Babel 或 React Compiler）转换为标准的 JavaScript 函数调用。

### JSX 的编译本质

编写的 JSX 代码：

```tsx
const element = <h1 className="title">Hello React</h1>;
```

在 React 17 及之后，会被编译器转换为：

```javascript
import { jsx as _jsx } from "react/jsx-runtime";

const element = _jsx("h1", { className: "title", children: "Hello React" });
```

因此，JSX 最终在内存中生成的，是一个描述真实 DOM 节点的轻量级 JavaScript 对象（即 Virtual DOM 节点）。

---

## 2. JSX 核心书写规范

为了让编译器正确解析，书写 JSX 必须严格遵循以下四条核心规范：

### 规范 1：必须有且仅有一个根元素

JSX 表达式必须只返回一个根节点。如果需要并列返回多个元素，必须用一个父元素包裹它们：

```tsx
// ❌ 错误：有两个根节点
return (
  <h1>标题</h1>
  <p>内容</p>
);

// 正确：使用 div 包裹
return (
  <div>
    <h1>标题</h1>
    <p>内容</p>
  </div>
);
```

如果你不想在 DOM 中引入额外的无意义 `<div>` 标签，可以使用 **React Fragment**（`<React.Fragment>` 或空标签 `<>`）：

```tsx
// 正确：使用空标签 Fragment 包裹，渲染后不会在 DOM 中生成额外节点
return (
  <>
    <h1>标题</h1>
    <p>内容</p>
  </>
);
```

### 规范 2：所有标签必须闭合

在 HTML 中，有些标签（如 `<img>`、`<input>`、`<br>`）可以不闭合。但在 JSX 中，**任何标签都必须闭合**，单标签必须使用自闭合写法 `/>`。

```tsx
// ❌ 错误
const input = <input type="text">;

// 正确
const input = <input type="text" />;
```

### 规范 3：使用驼峰命名法 (camelCase) 命名属性

由于 JSX 最终会转换为 JavaScript 对象，而属性名会变成对象的键名，因此 JSX 属性应遵循 JavaScript 的命名规范，采用驼峰命名。

- 将 HTML 中的 `class` 属性改为 `className`（因为 `class` 是 JS 的保留字）。
- 将 HTML 中的 `for` 属性改为 `htmlFor`（因为 `for` 是 JS 的保留字）。
- 事件绑定使用驼峰，如 `onclick` 改为 `onClick`，`onchange` 改为 `onChange`。

```tsx
// 正确示例
const element = (
  <div className="card" onClick={handleClick}>
    <label htmlFor="name-input">姓名</label>
    <input id="name-input" type="text" />
  </div>
);
```

### 规范 4：JSX 中的值类型

- **字符串字面量**：用双引号包裹，如 `className="container"`。
- **JavaScript 表达式**：用大括号 `{}` 包裹，如 `src={avatarUrl}`，`onClick={handleClick}`。

---

## 3. 在 JSX 中使用 JavaScript 表达式

大括号 `{}` 是 JSX 的“任意门”，你可以在其中书写任何有效的 JavaScript 表达式（注意：必须是**表达式**，即能求出具体值的代码，不能是 `if` 或 `for` 等语句）。

### 嵌入变量与运算

```tsx
function Greeting() {
  const name = "张三";
  const age = 20;

  return (
    <div>
      <p>你好，{name}</p>
      <p>明年你将是 {age + 1} 岁</p>
      <p>大写名称：{name.toUpperCase()}</p>
    </div>
  );
}
```

### 样式处理

在 JSX 中写行内样式（Inline Style）时，`style` 属性接收的必须是一个对象，因此你通常会看到“双大括号”的写法：外层大括号表示“这是一个 JS 表达式”，内层大括号表示“这是一个 JS 对象”。

```tsx
function ColoredBox() {
  return (
    <div 
      style={{ 
        color: 'white', 
        backgroundColor: 'royalblue', 
        padding: '20px',
        borderRadius: '8px'
      }}
    >
      彩色卡片
    </div>
  );
}
```

---

## 4. 条件渲染 (Conditional Rendering)

在 React 中，我们没有类似 `v-if` 的指令，而是完全依赖 JavaScript 原生的条件控制语句来实现组件的条件渲染。

### 方式 1：三元运算符（推荐用于二选一场景）

```tsx
function Welcome({ isLoggedIn }) {
  return (
    <div>
      {isLoggedIn ? <h1>欢迎回来！</h1> : <h1>请先登录。</h1>}
    </div>
  );
}
```

### 方式 2：逻辑与操作符 `&&`（推荐用于“有或无”场景）

当条件为 `true` 时渲染元素，为 `false` 时什么都不渲染：

```tsx
function MessageCenter({ unreadCount }) {
  return (
    <div>
      <h2>消息中心</h2>
      {unreadCount > 0 && <span className="badge">你有 {unreadCount} 条新消息</span>}
    </div>
  );
}
```

> [!WARNING]
> **小心数字 `0` 的陷阱！**
> 如果 `unreadCount` 的值为 `0`，`0 && <span/>` 表达式会被求值为数字 `0`。React 会把数字 `0` 直接渲染到屏幕上，导致 UI 出现一个多余的 `0`。
> 
> **安全写法**：转为布尔值判断 `unreadCount > 0 && ...` 或 `{!!unreadCount && ...}`。

### 方式 3：If-Else 语句（适用于复杂的渲染分支）

大括号内不能直接写 `if-else` 语句，但我们可以在组件函数体中写好逻辑，用变量保存 JSX，或者将逻辑拆分到子函数中。

```tsx
function FeedbackPage({ status }) {
  let content;

  if (status === 'success') {
    content = <p>提交成功！感谢您的反馈。</p>;
  } else if (status === 'error') {
    content = <p>发生错误，请稍后再试。</p>;
  } else {
    content = <p>正在加载中...</p>;
  }

  return (
    <div className="container">
      {content}
    </div>
  );
}
```

---

## 5. 列表渲染与 Key 属性

在 React 中，我们使用原生的 `Array.prototype.map` 方法来遍历数组，并将其映射为一组 JSX 元素。

### 基础列表渲染

```tsx
function UserList() {
  const users = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
    { id: 3, name: 'Charlie' }
  ];

  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

### 为什么必须指定 `key` 属性？

`key` 是一个特殊的属性，用于帮助 React 识别哪些元素发生了改变、被添加或被移除。

1. **Diff 算法性能加速**：当数组更新时，React 通过 `key` 快速定位新旧列表中对应的节点，进行最小化更新，而不是粗暴地重新渲染整个列表。
2. **状态保持**：如果列表项中包含子组件或受控表单输入，没有唯一的 `key` 可能会导致用户输入的状态在重排列表时发生错乱。

> [!IMPORTANT]
> **Key 的最佳实践**：
> - `key` 应该是同级元素中**唯一且稳定**的标识符（通常使用来自数据库的 `id`）。
> - **避免使用数组索引 (index) 作为 key**：如果列表顺序会发生变化（如排序、过滤、插入），使用索引作为 key 会导致严重的渲染性能问题和组件状态混乱。
> - **不要使用随机数 (Math.random()) 作 key**：每次渲染都会生成新的 key，导致 React 无法复用旧节点，彻底废掉 Diff 算法的性能优化。
