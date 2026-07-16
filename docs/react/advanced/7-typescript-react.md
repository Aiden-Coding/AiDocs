---
sidebar_position: 8
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
