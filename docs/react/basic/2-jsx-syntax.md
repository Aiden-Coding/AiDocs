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

---

## 🧪 JSX 书写自检清单

在编写 JSX 代码时，使用这个清单来检查你的代码是否规范：

- [ ] **单一根元素**：JSX 表达式只返回一个根节点（或用 `<>` Fragment 包裹）
- [ ] **标签闭合**：所有标签都正确闭合，单标签使用 `/>` 自闭合
- [ ] **属性命名**：使用驼峰命名，`class` 改为 `className`，`for` 改为 `htmlFor`
- [ ] **事件处理器**：使用驼峰命名，`onclick` 改为 `onClick`
- [ ] **样式对象**：行内样式使用 `{}` 包裹 JavaScript 对象
- [ ] **条件渲染**：正确使用三元操作符、`&&` 或 if-else 逻辑
- [ ] **列表渲染**：每个列表项都指定稳定唯一的 `key`
- [ ] **表达式正确**：大括号内只包含 JavaScript **表达式**，不包含语句

---

## ⚠️ JSX 常见误区与陷阱

### 误区 1：忘记使用大括号嵌入变量

```tsx
// ❌ 错误：直接写变量名，会被当作字符串输出
function Welcome({ name }) {
  return <h1>Hello {name}</h1>;  // 如果省略大括号，会输出 "Hello name"
}

// ✅ 正确
function Welcome({ name }) {
  return <h1>Hello {name}</h1>;  // 输出 "Hello 张三"
}
```

### 误区 2：大括号内写 if-else 语句

```tsx
// ❌ 错误：if-else 是语句，不能在大括号内直接使用
function Status({ isActive }) {
  return <p>{if (isActive) { "活跃中" } else { "离线" }}</p>;
}

// ✅ 正确：使用三元运算符
function Status({ isActive }) {
  return <p>{isActive ? "活跃中" : "离线"}</p>;
}

// 或者：在组件函数体中提前处理
function Status({ isActive }) {
  const status = isActive ? "活跃中" : "离线";
  return <p>{status}</p>;
}
```

### 误区 3：style 属性直接传字符串

```tsx
// ❌ 错误：style 属性期望接收对象，不是字符串
function Card() {
  return (
    <div style="color: red; padding: 20px;">
      卡片
    </div>
  );
}

// ✅ 正确：传递 JavaScript 对象
function Card() {
  return (
    <div style={{ color: 'red', padding: '20px' }}>
      卡片
    </div>
  );
}
```

### 误区 4：忘记 className 驼峰命名

```tsx
// ❌ 错误：使用 HTML 的 class 属性
function Button() {
  return <button class="btn btn-primary">点击</button>;
}

// ✅ 正确：使用 className
function Button() {
  return <button className="btn btn-primary">点击</button>;
}
```

### 误区 5：条件渲染中的 0 陷阱

```tsx
// ❌ 错误：当 count === 0 时，会在页面上显示 "0"
function MessageBadge({ count }) {
  return <div>{count && <span>新消息数：{count}</span>}</div>;
}
// 如果 count = 0，页面上会显示一个孤独的 "0"

// ✅ 正确方案 1：显式比较
function MessageBadge({ count }) {
  return <div>{count > 0 && <span>新消息数：{count}</span>}</div>;
}

// ✅ 正确方案 2：转换为布尔值
function MessageBadge({ count }) {
  return <div>{!!count && <span>新消息数：{count}</span>}</div>;
}
```

### 误区 6：使用索引作为 Key

```tsx
// ❌ 错误：使用索引作为 key，当列表重排时会产生 bug
function TodoList({ todos }) {
  return (
    <ul>
      {todos.map((todo, index) => (
        <li key={index}>{todo.text}</li>  // 危险！
      ))}
    </ul>
  );
}

// 场景：如果用户删除第一条 todo，React 会认为是数据改变了，而不是节点被删除
// 这会导致输入框的状态、焦点、动画等全部混乱

// ✅ 正确：使用唯一稳定的 ID
function TodoList({ todos }) {
  return (
    <ul>
      {todos.map(todo => (
        <li key={todo.id}>{todo.text}</li>  // 安全！
      ))}
    </ul>
  );
}
```

### 误区 7：使用 Math.random() 作为 Key

```tsx
// ❌ 错误：每次渲染都生成新的随机数，导致节点无法复用
function Items({ items }) {
  return (
    <ul>
      {items.map(item => (
        <li key={Math.random()}>{item.name}</li>  // 极端危险！
      ))}
    </ul>
  );
}

// ✅ 正确：使用数据中的唯一 ID
function Items({ items }) {
  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}
```

### 误区 8：多个根元素没有包裹

```tsx
// ❌ 错误：返回多个根元素，会导致编译错误
function UserCard() {
  return (
    <h1>用户信息</h1>
    <p>邮箱：user@example.com</p>
  );
}

// ✅ 正确：使用 div 或 Fragment 包裹
function UserCard() {
  return (
    <div>
      <h1>用户信息</h1>
      <p>邮箱：user@example.com</p>
    </div>
  );
}

// ✅ 更好：使用 Fragment 避免额外 DOM 层级
function UserCard() {
  return (
    <>
      <h1>用户信息</h1>
      <p>邮箱：user@example.com</p>
    </>
  );
}
```

### 误区 9：JSX 属性中忘记大括号

```tsx
// ❌ 错误：事件处理器直接传入，会被当作字符串
function Button() {
  return <button onClick="handleClick()">点击</button>;
}

// ✅ 正确：用大括号传入函数引用
function Button() {
  const handleClick = () => console.log('被点击了');
  return <button onClick={handleClick}>点击</button>;
}

// ✅ 也可以直接传入箭头函数
function Button() {
  return <button onClick={() => console.log('被点击了')}>点击</button>;
}
```

### 误区 10：双重大括号的困惑

```tsx
// ❌ 理解错误：不知道为什么要两个大括号
function StyledDiv() {
  return <div style={{ color: 'red' }}>文本</div>;
}

// ✅ 理解正确：外层大括号表示 JSX 表达式，内层大括号表示 JavaScript 对象
// 等价于：
function StyledDiv() {
  const styleObj = { color: 'red' };
  return <div style={styleObj}>文本</div>;
}
```

---

## 📖 进阶：JSX 编译原理深度理解

### React 17 之前的编译方式

```tsx
// 源代码
const element = <h1 className="title">Hello</h1>;

// 编译后（React 17 之前）
const element = React.createElement('h1', { className: 'title' }, 'Hello');
```

需要在文件顶部导入 `React`，即使代码中没有显式使用它。

### React 17+ 的新编译方式

```tsx
// 源代码
const element = <h1 className="title">Hello</h1>;

// 编译后（React 17+ 使用 jsx transform）
import { jsx as _jsx } from 'react/jsx-runtime';

const element = _jsx('h1', { className: 'title', children: 'Hello' });
```

不需要手动导入 `React`，编译器会自动引入 `jsx` 函数。

---

## 🎯 实战练习

### 练习 1：构建一个产品列表组件

需求：
- 展示商品列表，每项包含名称、价格、库存
- 如果库存为 0，显示"缺货"
- 使用条件渲染和列表渲染

<details>
<summary>参考答案</summary>

```tsx
interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
}

function ProductList({ products }: { products: Product[] }) {
  return (
    <div className="product-list">
      {products.length === 0 ? (
        <p>暂无商品</p>
      ) : (
        <ul>
          {products.map(product => (
            <li key={product.id} className="product-item">
              <h3>{product.name}</h3>
              <p>¥{product.price}</p>
              {product.stock > 0 ? (
                <span className="in-stock">库存：{product.stock}</span>
              ) : (
                <span className="out-of-stock">缺货</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

</details>

### 练习 2：修复 JSX 代码中的错误

以下代码有 5 个错误，找出并改正它们：

```tsx
function BuggyComponent({ items }) {
  return (
    <section>
      <h1>Item List</h1>
      {items.length > 0 && items.map(item => (
        <div key={item.index} class="item" style="color: blue">
          {item.name}
          {item.active ? <span>Active</span> else <span>Inactive</span>}
        </div>
      ))}
    </section>
  );
}
```

<details>
<summary>参考答案</summary>

错误与修正：

1. `key={item.index}` → `key={item.id}`（使用唯一 ID，不用索引）
2. `class=` → `className=`（驼峰命名）
3. `style="color: blue"` → `style={{ color: 'blue' }}`（style 接收对象）
4. `? <span>Active</span> else` → `? <span>Active</span> :`（三元运算符语法）
5. 条件表达式缺少另一个根元素包裹

正确代码：

```tsx
function BuggyComponent({ items }) {
  return (
    <section>
      <h1>Item List</h1>
      {items.length > 0 && (
        <div>
          {items.map(item => (
            <div key={item.id} className="item" style={{ color: 'blue' }}>
              {item.name}
              {item.active ? <span>Active</span> : <span>Inactive</span>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
```

</details>

---

## 📚 关键概念总结表

| 概念 | 说明 | 示例 |
|-----|------|------|
| **JSX** | HTML 与 JavaScript 的融合语法 | `<div>{name}</div>` |
| **大括号** | 在 JSX 中嵌入 JavaScript 表达式 | `{count + 1}` |
| **className** | 替代 HTML 的 `class` 属性 | `<div className="active">` |
| **style** | 接收 JavaScript 对象的样式 | `style={{ color: 'red' }}` |
| **Fragment** | 无约束的根元素包裹器 | `<>...</>` |
| **条件渲染** | 根据条件展示或隐藏 JSX | `{isShow && <div/>}` |
| **列表渲染** | 使用 `.map()` 遍历数组 | `{items.map(item => ...)}` |
| **Key** | 帮助 React 识别列表元素 | `<li key={item.id}>` |

---

## 🔗 下一步

掌握了 JSX 的语法与规范后，你已经可以开始编写简单的 React 组件了。建议继续学习：
1. [组件与 Props](3-components-props.md)：学习如何创建可复用的组件
2. [State 与事件处理](4-state-events.md)：给你的组件添加交互
