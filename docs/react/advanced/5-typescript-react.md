---
sidebar_position: 5
---

# TypeScript 与 React 类型系统

TypeScript 为 React 应用带来了强大的静态类型保障，能够在编写代码时就规避 90% 的低级错误。但在日常开发中，正确声明函数组件、泛型组件、以及管理 Refs 与合成事件的类型，需要掌握一套标准的 React 类型规范。

---

## 1. 声明函数组件：React.FC vs 普通函数

在声明函数组件时，社区中主要有两种流派：

### A. 使用 `React.FC` (React.FunctionComponent)

```tsx
const Card: React.FC<{ title: string }> = ({ title }) => {
  return <div>{title}</div>;
};
```

- **React 18 的重大变更**：在 React 18 之前，`React.FC` 会**隐式注入 `children?: React.ReactNode`** 属性，这导致即使该组件不打算接收 children，编译器也不会报错，是不安全的。
- **React 18 及之后**：官方彻底**移除**了 `React.FC` 中的隐式 children。如果需要 children，必须显式定义，或者使用 `PropsWithChildren` 辅助类型包装。

```tsx
import { PropsWithChildren } from 'react';

interface AlertProps {
  type: 'success' | 'danger';
}

const Alert: React.FC<PropsWithChildren<AlertProps>> = ({ type, children }) => {
  return <div className={`alert-${type}`}>{children}</div>;
};
```

### B. 直接使用原生 JavaScript 函数声明（官方目前推荐）

不使用 `React.FC` 类型包装，而是直接定义参数类型，直接返回 JSX。这种写法的优势在于**完全符合标准 TS 原生函数直觉**，且能完美支持**泛型组件定义**。

```tsx
interface HeaderProps {
  title: string;
}

// 推荐：普通函数组件声明写法
function Header({ title }: HeaderProps): React.JSX.Element {
  return <header><h1>{title}</h1></header>;
}
```

---

## 2. 泛型组件开发实践 (Generic Components)

在设计可复用的容器级组件（如 Select 下拉框、Table 表格、List 列表组件）时，组件所消费的数据结构是由外部传入的，此时必须使用**泛型**来约束类型流动。

```tsx
import React from 'react';

// 1. 声明泛型 Props 接口，数据项类型为 T
interface SelectionListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  onSelect: (item: T) => void;
}

// 2. 编写泛型函数组件
export function SelectionList<T>({ items, renderItem, onSelect }: SelectionListProps<T>) {
  return (
    <ul className="selection-list">
      {items.map((item, index) => (
        <li key={index} onClick={() => onSelect(item)}>
          {renderItem(item)}
        </li>
      ))}
    </ul>
  );
}

// 3. 使用场景：传入强类型的 User 对象，编译器能自动推导出 item 的具体字段
interface User {
  id: number;
  name: string;
}

const mockUsers: User[] = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' }
];

function App() {
  return (
    <SelectionList
      items={mockUsers}
      onSelect={(user) => console.log('选中的用户 ID 为: ', user.id)} // 自动推导 user 为 User 类型
      renderItem={(user) => <span>姓名: {user.name}</span>}
    />
  );
}
```

---

## 3. Refs 的类型声明与防空处理

`useRef` 在不同的初值赋予下，会被 TS 编译器推导为不同的泛型模式，主要有以下两种：

### 场景 A：绑定原生 DOM 节点（只读 DOM Ref）

如果你用 ref 来指向一个原生 DOM，泛型参数写具体的 DOM 元素类型，**初始值必须显式传递 `null`**。这会触发 TS 的函数重载，返回一个 `.current` 为**只读**的 `RefObject`，这正是绑定在 JSX 元素上所需要的类型。

```tsx
import { useRef, useEffect } from 'react';

function AutoFocusInput() {
  // 正确声明：必须传递 null 作为初值，代表这是一个 DOM 引用
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 💡 必须进行安全链防空判断
    inputRef.current?.focus();
  }, []);

  return <input ref={inputRef} type="text" />;
}
```

### 场景 B：保存跨周期变量（可写 Mutable Ref）

如果你用 ref 来保存定时器、数值等持久化可变变量，**不要**将初始值设为 null（或者如果必须要设，不要让其与 DOM 绑定类型发生重叠）。这会返回一个 `MutableRefObject`，其 `.current` 是**可读写**的。

```tsx
import { useRef, useEffect } from 'react';

function Timer() {
  // 返回 MutableRefObject
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    intervalRef.current = window.setInterval(() => {
      console.log('计时中...');
    }, 1000);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return <div>定时器运行中</div>;
}
```

---

## 4. 常用事件处理函数的强类型标注

在绑定事件（如 `onClick`、`onChange`）时，如果是行内箭头函数，TS 会自动推导类型。但如果把事件处理逻辑抽离为组件独立方法，就必须手动为 `event` 参数标注强类型。

```tsx
import React, { useState } from 'react';

function InteractiveForm() {
  const [value, setValue] = useState('');

  // 1. 输入框文本改变事件 (HTMLInputElement 代表触发源)
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value);
  };

  // 2. 键盘按键事件
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      console.log('按下了回车，值是：', event.currentTarget.value);
    }
  };

  // 3. 表单提交事件
  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // 阻止表单默认提交刷新
    console.log('表单被提交了');
  };

  return (
    <form onSubmit={handleFormSubmit}>
      <input 
        type="text" 
        value={value} 
        onChange={handleInputChange} 
        onKeyDown={handleKeyDown} 
      />
      <button type="submit">提交</button>
    </form>
  );
}
```

---

## 5. 多态组件类型设计 (Polymorphic Components)

在通用组件库（如 Radix UI、Chakra UI）中，**多态组件**是最高频的设计模式。它允许组件通过 `as` prop 动态渲染为任意原生 HTML 标签或第三方 React 组件，同时保持对应元素原生属性的强类型安全与代码补全：

```tsx
import React from 'react';

// 1. 定义多态组件的基础类型工具
type AsProp<C extends React.ElementType> = {
  as?: C;
};

// 2. 结合目标元素的原生 HTML 属性，排除同名冲突
type PropsWithAs<C extends React.ElementType, P = {}> = P &
  AsProp<C> &
  Omit<React.ComponentPropsWithoutRef<C>, keyof (AsProp<C> & P)>;

// 3. 通用 Button 组件 Props
interface ButtonBaseProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

// 4. 实现多态 Button 组件
export function Button<C extends React.ElementType = 'button'>({
  as,
  variant = 'primary',
  size = 'md',
  children,
  ...restProps
}: PropsWithAs<C, ButtonBaseProps>) {
  const Component = as || 'button';

  return (
    <Component className={`btn btn--${variant} btn--${size}`} {...restProps}>
      {children}
    </Component>
  );
}

// 5. 使用验证：类型系统自动推断
function Usage() {
  return (
    <div>
      {/* 默认渲染为 button，支持 onClick 等属性 */}
      <Button onClick={() => alert('点击')}>标准按钮</Button>

      {/* as="a" 时，TS 会自动要求并提示 href 属性，且类型正确 */}
      <Button as="a" href="https://example.com" target="_blank">
        链接样式按钮
      </Button>
    </div>
  );
}
```

---

## 6. 原生 HTML 属性继承与 Ref 处理

在编写封装通用输入框或按钮时，应尽可能复用 React 导出的 HTML 原生属性类型，避免手写冗余字段：

```tsx
import React from 'react';

// ComponentPropsWithRef 会自动包含原生标签支持的所有属性以及 ref 类型
export type TextInputProps = React.ComponentPropsWithRef<'input'> & {
  label: string;
  error?: string;
};

export function TextInput({ label, error, className, id, ref, ...restInputProps }: TextInputProps) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="input-group">
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        ref={ref}
        className={`input-field ${error ? 'input--error' : ''} ${className || ''}`}
        {...restInputProps}
      />
      {error && <span className="error-message">{error}</span>}
    </div>
  );
}
```

---

## 7. 可辨识联合类型设计互斥 Props

在实际业务组件中，某些 Props 是相互排斥的。例如：警告框组件可以支持“纯文本模式”或“带操作按钮模式”，但不能同时指定互相矛盾的配置。使用 **可辨识联合类型 (Discriminated Unions)** 可以让类型系统在编译期阻止非法传参：

```tsx
import React from 'react';

// 模式 A：可关闭的信息卡片
interface DismissibleAlertProps {
  dismissible: true;
  onDismiss: () => void;
}

// 模式 B：常驻信息卡片，不可关闭
interface StaticAlertProps {
  dismissible?: false;
  onDismiss?: never; // 明确标明不可传入此回调
}

type AlertProps = (DismissibleAlertProps | StaticAlertProps) & {
  title: string;
  children: React.ReactNode;
};

export function Alert(props: AlertProps) {
  return (
    <div className="alert-card">
      <h4>{props.title}</h4>
      <div>{props.children}</div>
      {props.dismissible && (
        <button onClick={props.onDismiss}>关闭</button>
      )}
    </div>
  );
}

// 合法用法：
// <Alert title="提示" dismissible onDismiss={() => {}}>成功</Alert>
// <Alert title="提示">成功</Alert>

// ❌ 编译报错：dismissible 为 false 时传入了 onDismiss
// <Alert title="提示" dismissible={false} onDismiss={() => {}}>报错</Alert>
```

---

## 8. 类型安全的 Context 工厂函数 (createSafeContext)

在 React 原生 `createContext` 中，如果未提供默认值通常会填 `null`，导致每个 `useContext` 消费处都必须写 `if (!context) throw ...` 或断言，非常啰嗦。封装一个通用的安全 Context 工厂：

```tsx
import React, { createContext, useContext } from 'react';

export function createSafeContext<T>(errorMessage: string = 'useSafeContext 必须在 Provider 内部使用') {
  const Context = createContext<T | undefined>(undefined);

  function useSafeContext(): T {
    const value = useContext(Context);
    if (value === undefined) {
      throw new Error(errorMessage);
    }
    return value;
  }

  return [Context.Provider, useSafeContext] as const;
}

// 使用示例：
interface AuthContextValue {
  user: { id: string; name: string };
  logout: () => void;
}

const [AuthProvider, useAuth] = createSafeContext<AuthContextValue>(
  'useAuth 必须包裹在 AuthProvider 中使用'
);

export { AuthProvider, useAuth };

