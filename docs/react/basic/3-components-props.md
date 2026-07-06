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

---

## 🧪 组件与 Props 自检清单

在继续学习之前，检查以下几点你是否都掌握了：

- [ ] **组件命名**：组件名以大写字母开头（PascalCase）
- [ ] **Props 接收**：能够用解构赋值接收 Props 并设置默认值
- [ ] **Props 只读性**：理解 Props 不能被修改，修改需要通过 State
- [ ] **单向数据流**：理解数据从父组件流向子组件，不能反向流动
- [ ] **children 属性**：知道如何使用 `children` 创建容器组件
- [ ] **类型安全**：能够用 TypeScript 接口定义 Props 类型
- [ ] **组件复用**：能够设计可复用的通用组件

如果有任何不清楚的地方，建议再读一遍相关章节。

---

## ⚠️ 常见误区与陷阱

### 误区 1：组件名以小写字母开头

```tsx
// ❌ 错误：小写字母开头，React 会把它当作 HTML 标签处理
function userCard() {
  return <div>用户卡片</div>;
}

function App() {
  return <userCard />; // 渲染时会变成 <usercard /> HTML 标签，不会渲染组件
}

// ✅ 正确：大写字母开头（PascalCase）
function UserCard() {
  return <div>用户卡片</div>;
}

function App() {
  return <UserCard />; // 正确渲染 React 组件
}
```

### 误区 2：直接修改 Props

```tsx
// ❌ 错误：试图修改 Props
function UserProfile(props) {
  props.name = '新名字'; // ❌ 违反了 React 的规则
  props.age = props.age + 1; // ❌ 直接修改不会触发重渲染
  
  return <div>{props.name}</div>;
}

// ✅ 正确方案 1：如果需要修改，通过回调函数通知父组件
function UserProfile({ name, age, onNameChange }) {
  return (
    <div>
      <p>{name}</p>
      <button onClick={() => onNameChange('新名字')}>改名</button>
    </div>
  );
}

// ✅ 正确方案 2：使用 State 存储派生数据
function UserProfile({ initialName }) {
  const [name, setName] = useState(initialName);
  
  return (
    <div>
      <p>{name}</p>
      <button onClick={() => setName('新名字')}>改名</button>
    </div>
  );
}
```

### 误区 3：忘记为列表项设置 key

```tsx
// ❌ 错误：没有给列表项传递 key
function UserList({ users }) {
  return (
    <ul>
      {users.map(user => (
        <li>{user.name}</li>  // 缺少 key，会导致渲染问题
      ))}
    </ul>
  );
}

// ❌ 也是错误：使用索引作为 key
function UserList({ users }) {
  return (
    <ul>
      {users.map((user, index) => (
        <li key={index}>{user.name}</li>  // 使用索引不稳定
      ))}
    </ul>
  );
}

// ✅ 正确：使用唯一稳定的 ID
function UserList({ users }) {
  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>{user.name}</li>  // 使用唯一的业务 ID
      ))}
    </ul>
  );
}
```

### 误区 4：Props 解构时忘记类型注解

```tsx
// ❌ 错误：没有类型检查，容易传入错误的数据
function Button({ label, onClick }) {
  // 如果调用方传入了错误类型，这里会在运行时崩溃
  return <button onClick={onClick}>{label}</button>;
}

// 调用时可能会误传错误数据
<Button label={123} onClick="handleClick" /> // ❌ 类型错误无法提前发现

// ✅ 正确：使用 TypeScript 接口
interface ButtonProps {
  label: string;
  onClick: () => void;
}

function Button({ label, onClick }: ButtonProps) {
  return <button onClick={onClick}>{label}</button>;
}

// 现在 TypeScript 编译器会提前报错
<Button label={123} onClick="handleClick" /> // ❌ 编译错误：类型不匹配
```

### 误区 5：children 的类型注解混乱

```tsx
// ❌ 错误：children 类型不清晰
function Card({ children }) {
  // children 可能是什么类型都不知道
  return <div className="card">{children}</div>;
}

// ✅ 正确：明确 children 的类型
import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode; // children 可以是任何可渲染的内容
}

function Card({ children }: CardProps) {
  return <div className="card">{children}</div>;
}

// 或者更严格的类型
interface CardProps {
  children: React.ReactNode;
  title: string;
}

function Card({ title, children }: CardProps) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <div className="content">{children}</div>
    </div>
  );
}
```

### 误区 6：过度依赖 Props 导致组件庞大

```tsx
// ❌ 错误：组件接收了太多 Props，职责不清
function ComplexForm({
  name,
  email,
  password,
  phone,
  address,
  city,
  country,
  zipCode,
  onNameChange,
  onEmailChange,
  onPasswordChange,
  onPhoneChange,
  onAddressChange,
  onCityChange,
  onCountryChange,
  onZipCodeChange,
  onSubmit,
  // ... 还有更多
}) {
  // 500 行代码...
}

// ✅ 正确：拆分成多个小组件
interface FormData {
  name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  zipCode: string;
}

interface ComplexFormProps {
  data: FormData;
  onChange: (field: keyof FormData, value: string) => void;
  onSubmit: () => void;
}

function ComplexForm({ data, onChange, onSubmit }: ComplexFormProps) {
  return (
    <form onSubmit={onSubmit}>
      <BasicInfoSection 
        data={{ name: data.name, email: data.email, password: data.password }}
        onChange={onChange}
      />
      <ContactSection 
        data={{ phone: data.phone, address: data.address }}
        onChange={onChange}
      />
      <AddressSection 
        data={{ city: data.city, country: data.country, zipCode: data.zipCode }}
        onChange={onChange}
      />
      <button type="submit">提交</button>
    </form>
  );
}
```

### 误区 7：Props 默认值设置不当

```tsx
// ❌ 错误：在每次渲染时创建新对象作为默认值
function UserCard({ user = { name: '匿名', age: 0 } }) {
  // 每次渲染都会创建新对象，导致子组件不必要的重渲染
  return <div>{user.name} - {user.age}</div>;
}

// ✅ 正确 1：在组件外部定义默认值
const DEFAULT_USER = { name: '匿名', age: 0 };

function UserCard({ user = DEFAULT_USER }) {
  return <div>{user.name} - {user.age}</div>;
}

// ✅ 正确 2：对基本类型使用解构默认值
function UserCard({ name = '匿名', age = 0 }: { name?: string; age?: number }) {
  return <div>{name} - {age}</div>;
}
```

### 误区 8：Props 对象结构过深导致访问混乱

```tsx
// ❌ 错误：Props 结构嵌套过深
function UserProfile(props) {
  return (
    <div>
      <h1>{props.user.profile.personal.name}</h1>
      <p>{props.user.profile.personal.bio}</p>
      <img src={props.user.profile.personal.avatar.url} />
    </div>
  );
}

// ✅ 正确 1：在使用时进行解构
function UserProfile({ user: { profile: { personal: { name, bio, avatar } } } }) {
  return (
    <div>
      <h1>{name}</h1>
      <p>{bio}</p>
      <img src={avatar.url} />
    </div>
  );
}

// ✅ 正确 2：通过类型定义明确结构
interface UserProfileProps {
  name: string;
  bio: string;
  avatarUrl: string;
}

function UserProfile({ name, bio, avatarUrl }: UserProfileProps) {
  return (
    <div>
      <h1>{name}</h1>
      <p>{bio}</p>
      <img src={avatarUrl} />
    </div>
  );
}
```

### 误区 9：忘记传递必需的 Props

```tsx
// ❌ 错误：组件要求 Props，但使用时没有传
interface ButtonProps {
  label: string;
  onClick: () => void;
}

function Button({ label, onClick }: ButtonProps) {
  return <button onClick={onClick}>{label}</button>;
}

// 使用时忘记传递 Props
<Button /> // ❌ TypeScript 编译错误：缺少必需的 Props

// ✅ 正确：传递所有必需的 Props
<Button label="提交" onClick={() => handleSubmit()} />
```

### 误区 10：Props 作为直接的 HTML 属性使用

```tsx
// ❌ 错误：直接将 Props 中的对象传给 HTML 属性
function Card({ style }) {
  return <div {...style}>卡片</div>; // 如果 style 不是有效的 HTML 属性对象会出错
}

// ✅ 正确：明确 Props 中哪些可以直接传给 HTML
interface CardProps {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

function Card({ className = '', style, children }: CardProps) {
  return (
    <div className={`card ${className}`} style={style}>
      {children}
    </div>
  );
}
```

---

## 📖 进阶思考

### 组件设计的黄金法则

1. **单一职责**：一个组件应该只做一件事
2. **高内聚低耦合**：组件内部逻辑紧凑，与外部依赖松散
3. **易于组合**：组件应该能够与其他组件灵活组合
4. **易于测试**：Props 清晰的组件更容易进行单元测试

### 什么时候应该拆分组件？

- 代码行数超过 200-300 行
- 组件承担了多个独立的职责
- 组件的逻辑过于复杂，难以理解
- 组件中有明显的"子结构"可以独立复用

---

## 🎯 实战练习

### 练习 1：设计一个通用 Button 组件

需求：
- 支持不同的颜色（primary、secondary、danger）
- 支持不同的大小（small、medium、large）
- 支持禁用状态
- 支持 loading 状态
- 可以嵌入子元素（icon + text）

<details>
<summary>参考答案</summary>

```tsx
import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

function Button({
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  onClick,
  children,
}: ButtonProps) {
  const className = `btn btn-${variant} btn-${size} ${disabled ? 'disabled' : ''}`;

  return (
    <button
      className={className}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? '加载中...' : children}
    </button>
  );
}

export default Button;
```

</details>

### 练习 2：创建一个可复用的 Card 容器组件

需求：
- 支持标题、副标题、footer
- 支持自定义 className
- 支持自定义样式
- children 可以是任何可渲染内容

<details>
<summary>参考答案</summary>

```tsx
import React from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  footer?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

function Card({
  title,
  subtitle,
  footer,
  className = '',
  style,
  children,
}: CardProps) {
  return (
    <div className={`card ${className}`} style={style}>
      {title && (
        <div className="card-header">
          <h3>{title}</h3>
          {subtitle && <p className="subtitle">{subtitle}</p>}
        </div>
      )}
      <div className="card-body">{children}</div>
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
}

export default Card;
```

</details>

---

## 📚 关键概念总结表

| 概念 | 说明 | 例子 |
|-----|------|------|
| **组件** | React 的基本构建单位，一个函数返回 JSX | `function MyComponent() { return <div/>; }` |
| **Props** | 父组件传递给子组件的数据 | `<Component name="Alice" age={25} />` |
| **Props 解构** | 从 Props 对象中提取属性 | `function C({ name, age }) { ... }` |
| **Props 只读** | Props 不能被子组件修改 | 必须通过回调函数向父组件通知 |
| **children** | 特殊的 Props，代表组件内嵌入的子内容 | `<Card>这是 children</Card>` |
| **TypeScript 类型** | 对 Props 进行类型检查 | `interface Props { name: string; }` |
| **默认值** | 为 Props 设置默认值 | `function C({ size = 'medium' }) { ... }` |
| **组件组合** | 通过组合小组件构建复杂 UI | 使用 children 和 Props 灵活组合 |

---

## 🔗 下一步

掌握了组件与 Props 后，你已经可以构建可复用的组件库了。建议继续学习：
1. [State 与事件处理](4-state-events.md)：给组件添加交互能力
2. [常用 Hooks 深度解析](5-hooks.md)：学习如何在组件中管理状态
3. [组件设计模式](6-component-patterns.md)：设计企业级可复用组件
