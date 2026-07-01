---
sidebar_position: 3
---

# 组件与 Props 数据流

在 React 的世界中，“组件 (Component)”是构建用户界面的基本砖石，而 “Props (属性)”是组件间传递数据的生命线。掌握组件的定义方式与 Props 的单向流动特性，是写出可维护、可复用 React 代码的关键。

---

## 1. 声明 React 组件

在现代 React 中，组件主要以**函数 (Function Component)** 的形式存在。类组件 (Class Component) 已成为历史遗存，新项目应全面拥抱函数组件。

### 什么是函数组件？

函数组件本质上就是一个普通的 JavaScript 函数，它接收一个 `props` 对象，并返回一个 React 元素（通常是用 JSX 编写的）：

```tsx
// 最基础的函数组件
function Welcome() {
  return <h1>你好，欢迎来到 React 的世界！</h1>;
}
```

### 组件的书写规范

1. **命名必须以大写字母开头**（PascalCase）。如果以小写字母开头（如 `welcome`），React 会将其视为普通 HTML 标签（如 `<div>`、`<span>`），从而引发渲染错误。
2. **必须返回 JSX**。如果不需要渲染任何内容，可以显式返回 `null`。

---

## 2. 传递与接收 Props

组件是可以复用的。为了让同一个组件显示不同的内容，我们可以像给 HTML 标签添加属性一样向组件传递数据，这些数据会被 React 打包成一个对象传入组件，这就是 **Props**（Properties 的缩写）。

### 传递 Props

父组件在使用子组件时，通过键值对的形式传递属性：

```tsx
function App() {
  return (
    <div>
      <UserProfile 
        name="张三" 
        age={25} 
        avatarUrl="/images/zhangsan.png" 
        isAdmin={true} 
      />
    </div>
  );
}
```

### 接收与使用 Props

子组件通过函数参数接收 `props` 对象：

```tsx
// 方式 1：直接接收 props 对象
function UserProfile(props) {
  return (
    <div className="user-card">
      <img src={props.avatarUrl} alt={props.name} />
      <h2>{props.name} {props.isAdmin && <span className="admin-tag">管理员</span>}</h2>
      <p>年龄：{props.age}</p>
    </div>
  );
}

// 方式 2：使用解构赋值（推荐，代码更简洁）
function UserProfile({ name, age, avatarUrl, isAdmin = false }) {
  return (
    <div className="user-card">
      <img src={avatarUrl} alt={name} />
      <h2>{name} {isAdmin && <span className="admin-tag">管理员</span>}</h2>
      <p>年龄：{age}</p>
    </div>
  );
}
```

> [!TIP]
> 在接收 Props 时，使用解构赋值可以非常直观地看出该组件依赖哪些数据，并且可以方便地设置默认值（如上面的 `isAdmin = false`）。

---

## 3. Props 的只读性与单向数据流

React 的核心设计哲学之一是**单向数据流 (One-Way Data Flow)**。这意味着：
- 数据总是从父组件流向子组件（通过 Props）。
- 子组件无法获知或修改非其父组件传递的数据。

### 规则：Props 是只读的 (ReadOnly)

> [!IMPORTANT]
> **绝对不要在子组件内部修改接收到的 Props。** 
> 无论是函数还是类，都不能修改自身的 props。React 规定所有组件必须像“纯函数”一样保护它们的 props 不被修改。

```tsx
// ❌ 错误示范：试图修改 props
function UserProfile(props) {
  props.name = '李四'; // 会导致 React 报错或产生不可预测的 bug
  return <h1>{props.name}</h1>;
}
```

如果你需要改变某个数据并让界面跟着刷新，那应该使用 **State（状态）**。如果想在子组件里改变父组件传过来的状态，应当让父组件传递一个**回调函数 (Callback)** 给子组件，子组件通过调用回调函数来通知父组件修改状态。

---

## 4. 特殊的 Prop：`children`

在 HTML 中，我们经常会在标签中嵌套其他标签：
```html
<div class="card">
  <p>这是一段文字</p>
</div>
```

在 React 中，如果我们想在自定义组件内部嵌套其他内容，可以使用特殊的属性：`props.children`。

### 什么是 `children`？

当你在使用一个组件时，在组件的开始标签和结束标签之间夹带的所有 JSX 内容，都会被自动放到该组件的 `props.children` 属性中。

### 容器/布局组件示例

```tsx
// 1. 定义一个 Card 容器组件
function Card({ title, children }) {
  return (
    <div className="card-container">
      <div className="card-header">{title}</div>
      {/* 渲染嵌套进来的子内容 */}
      <div className="card-body">{children}</div>
    </div>
  );
}

// 2. 在其他地方使用 Card 组件，并嵌入不同的子内容
function Dashboard() {
  return (
    <div className="dashboard">
      <Card title="用户统计">
        <p>活跃用户：1,200 人</p>
        <button>查看详情</button>
      </Card>
      
      <Card title="系统通知">
        <div className="alert alert-warning">系统将于今晚 12 点进行维护。</div>
      </Card>
    </div>
  );
}
```

---

## 5. 类型安全与 Props 校验

当项目逐渐变大时，如果随便传入错误的 Props（例如本来需要传入数字，却传入了字符串），可能会导致程序在运行时崩溃。为了提高代码质量，我们需要对 Props 进行类型规范。

在现代开发中，**TypeScript** 是进行类型安全校验的最佳手段：

```tsx
// 1. 定义 Props 的 TypeScript 接口 (Interface)
interface ButtonProps {
  label: string;
  color?: 'primary' | 'secondary'; // 可选属性，限制取值
  onClick: () => void;            // 函数类型
}

// 2. 在组件中应用类型约束
function Button({ label, color = 'primary', onClick }: ButtonProps) {
  return (
    <button className={`btn btn-${color}`} onClick={onClick}>
      {label}
    </button>
  );
}
```

如果不使用 TypeScript，也可以在 React 19 之前项目中使用 `prop-types` 库进行运行时校验，但现代 React 社区已一致推荐直接使用 TypeScript 提升开发体验。
