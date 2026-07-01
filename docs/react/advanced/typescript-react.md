---
sidebar_position: 6
---

# TypeScript 类型体系与泛型约束

TypeScript 与 React 的结合能够构建类型安全的企业级应用。本文将深入剖析 React 组件的类型标注、泛型组件设计、事件处理类型以及高级类型技巧。

---

## 1. 函数组件的类型标注

### React.FC vs 普通函数组件

```tsx
import { ReactNode } from 'react';

// ❌ 不推荐：React.FC 已被社区逐渐弃用
const Component1: React.FC<{ name: string }> = ({ name }) => {
  return <div>{name}</div>;
};

// ✅ 推荐：普通函数组件 + Props 类型
interface GreetingProps {
  name: string;
  age?: number;
}

function Greeting({ name, age }: GreetingProps) {
  return (
    <div>
      {name}, {age ? `${age} 岁` : '年龄未知'}
    </div>
  );
}

// 或使用箭头函数
const Greeting2 = ({ name, age }: GreetingProps) => {
  return <div>{name}</div>;
};
```

### React.FC 的问题

1. **隐式 children**：React 18 之前的 `React.FC` 自动包含 `children` 属性，导致类型不精确。
2. **泛型支持差**：无法很好地支持泛型组件。
3. **返回类型限制**：限制了返回类型，不支持返回字符串或数字等。

### PropsWithChildren 工具类型

```tsx
import { PropsWithChildren } from 'react';

// ✅ 明确需要 children 时使用
interface CardProps {
  title: string;
}

function Card({ title, children }: PropsWithChildren<CardProps>) {
  return (
    <div>
      <h2>{title}</h2>
      <div>{children}</div>
    </div>
  );
}
```

---

## 2. Props 类型设计最佳实践

### 必选 vs 可选 Props

```tsx
interface ButtonProps {
  // 必选
  label: string;
  onClick: () => void;
  
  // 可选
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  icon?: ReactNode;
}

// 使用默认值
function Button({ 
  label, 
  onClick, 
  variant = 'primary',
  disabled = false,
  icon 
}: ButtonProps) {
  return (
    <button 
      className={`btn btn--${variant}`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon && <span className="btn-icon">{icon}</span>}
      {label}
    </button>
  );
}
```

### 联合类型与判别联合

```tsx
// ✅ 判别联合：根据 type 字段判断具体类型
type MessageProps = 
  | { type: 'success'; message: string }
  | { type: 'error'; message: string; errorCode: number }
  | { type: 'loading' };

function Message(props: MessageProps) {
  switch (props.type) {
    case 'success':
      return <div className="success">{props.message}</div>;
    case 'error':
      // TypeScript 知道这里有 errorCode
      return (
        <div className="error">
          {props.message} (错误码: {props.errorCode})
        </div>
      );
    case 'loading':
      return <div className="loading">加载中...</div>;
  }
}

// 使用
<Message type="success" message="操作成功" />
<Message type="error" message="操作失败" errorCode={404} />
<Message type="loading" />
```

### 索引签名与 Record

```tsx
// ✅ 使用 Record 定义对象映射
interface UserMap {
  [userId: string]: User;
}

// 或使用 Record 工具类型
type UserMap2 = Record<string, User>;

// 限制键的类型
type UserRole = 'admin' | 'user' | 'guest';
type RolePermissions = Record<UserRole, string[]>;

const permissions: RolePermissions = {
  admin: ['read', 'write', 'delete'],
  user: ['read', 'write'],
  guest: ['read']
};
```

---

## 3. 泛型组件设计

### 基础泛型组件

```tsx
// 泛型列表组件
interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T) => string | number;
}

function List<T>({ items, renderItem, keyExtractor }: ListProps<T>) {
  return (
    <ul>
      {items.map((item, index) => (
        <li key={keyExtractor(item)}>
          {renderItem(item, index)}
        </li>
      ))}
    </ul>
  );
}

// 使用
interface User {
  id: number;
  name: string;
}

function UserList() {
  const users: User[] = [
    { id: 1, name: '张三' },
    { id: 2, name: '李四' }
  ];

  return (
    <List
      items={users}
      keyExtractor={(user) => user.id}
      renderItem={(user) => <span>{user.name}</span>}
    />
  );
}
```

### 泛型约束

```tsx
// 约束泛型必须包含 id 属性
interface HasId {
  id: string | number;
}

interface SelectProps<T extends HasId> {
  items: T[];
  value: T['id'];
  onChange: (id: T['id']) => void;
  renderOption: (item: T) => ReactNode;
}

function Select<T extends HasId>({
  items,
  value,
  onChange,
  renderOption
}: SelectProps<T>) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {items.map((item) => (
        <option key={item.id} value={item.id}>
          {renderOption(item)}
        </option>
      ))}
    </select>
  );
}
```

### 高级泛型：条件类型

```tsx
// 根据 Props 类型自动推导返回类型
type AsyncData<T, E = Error> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: E };

interface DataFetcherProps<T, E = Error> {
  url: string;
  children: (data: AsyncData<T, E>) => ReactNode;
}

function DataFetcher<T, E = Error>({ url, children }: DataFetcherProps<T, E>) {
  const [state, setState] = useState<AsyncData<T, E>>({ status: 'idle' });

  useEffect(() => {
    setState({ status: 'loading' });
    
    fetch(url)
      .then(r => r.json())
      .then(data => setState({ status: 'success', data }))
      .catch(error => setState({ status: 'error', error }));
  }, [url]);

  return <>{children(state)}</>;
}

// 使用
interface Todo {
  id: number;
  title: string;
}

function TodoList() {
  return (
    <DataFetcher<Todo[]> url="/api/todos">
      {(data) => {
        switch (data.status) {
          case 'loading':
            return <div>加载中...</div>;
          case 'success':
            return (
              <ul>
                {data.data.map(todo => (
                  <li key={todo.id}>{todo.title}</li>
                ))}
              </ul>
            );
          case 'error':
            return <div>错误: {data.error.message}</div>;
          default:
            return null;
        }
      }}
    </DataFetcher>
  );
}
```

---

## 4. Refs 类型标注

### useRef 的三种场景

```tsx
import { useRef, useEffect } from 'react';

function Component() {
  // 场景 1：存储 DOM 元素引用
  const inputRef = useRef<HTMLInputElement>(null);
  
  // 场景 2：存储可变值（不触发重渲染）
  const countRef = useRef<number>(0);
  
  // 场景 3：存储定时器 ID
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 访问 DOM 元素
    inputRef.current?.focus();
    
    // 修改可变值
    countRef.current += 1;
    
    // 存储定时器 ID
    timerRef.current = setInterval(() => {
      console.log('tick');
    }, 1000);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return <input ref={inputRef} type="text" />;
}
```

### forwardRef 类型标注（React 19 已废弃）

```tsx
import { forwardRef, ForwardedRef } from 'react';

interface InputProps {
  placeholder?: string;
}

// React 18 及之前
const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ placeholder }, ref) => {
    return <input ref={ref} placeholder={placeholder} />;
  }
);

// React 19+：直接使用 props.ref
function Input({ placeholder, ref }: InputProps & { ref?: ForwardedRef<HTMLInputElement> }) {
  return <input ref={ref} placeholder={placeholder} />;
}
```

### useImperativeHandle 类型标注

```tsx
import { useRef, useImperativeHandle, forwardRef } from 'react';

// 定义暴露的方法类型
interface VideoPlayerRef {
  play: () => void;
  pause: () => void;
  seekTo: (time: number) => void;
}

interface VideoPlayerProps {
  src: string;
}

const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(
  ({ src }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useImperativeHandle(ref, () => ({
      play: () => videoRef.current?.play(),
      pause: () => videoRef.current?.pause(),
      seekTo: (time: number) => {
        if (videoRef.current) {
          videoRef.current.currentTime = time;
        }
      }
    }));

    return <video ref={videoRef} src={src} />;
  }
);

// 使用
function App() {
  const playerRef = useRef<VideoPlayerRef>(null);

  return (
    <div>
      <VideoPlayer ref={playerRef} src="/video.mp4" />
      <button onClick={() => playerRef.current?.play()}>播放</button>
      <button onClick={() => playerRef.current?.pause()}>暂停</button>
    </div>
  );
}
```

---

## 5. 事件处理类型

### 常用事件类型

```tsx
import { ChangeEvent, MouseEvent, FormEvent, KeyboardEvent } from 'react';

function FormComponent() {
  // 输入框变化
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    console.log(e.target.value);
  };

  // 按钮点击
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    console.log(e.currentTarget.textContent);
  };

  // 表单提交
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
  };

  // 键盘事件
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      console.log('按下了回车键');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="text" 
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      <button onClick={handleClick}>提交</button>
    </form>
  );
}
```

### 事件处理函数的类型推导

```tsx
// ✅ 推荐：内联事件处理，自动推导类型
<input onChange={(e) => console.log(e.target.value)} />

// ✅ 推荐：提取函数并明确标注类型
const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
  console.log(e.target.value);
};
<input onChange={handleChange} />

// ❌ 避免：使用 any 类型
const handleChange = (e: any) => {
  console.log(e.target.value);
};
```

### 自定义事件处理器类型

```tsx
// 定义回调函数类型
type OnSelectCallback<T> = (item: T, index: number) => void;

interface SelectableListProps<T> {
  items: T[];
  onSelect: OnSelectCallback<T>;
  renderItem: (item: T) => ReactNode;
}

function SelectableList<T>({ items, onSelect, renderItem }: SelectableListProps<T>) {
  return (
    <ul>
      {items.map((item, index) => (
        <li key={index} onClick={() => onSelect(item, index)}>
          {renderItem(item)}
        </li>
      ))}
    </ul>
  );
}
```

---

## 6. 自定义 Hooks 类型推导

### 基础自定义 Hook

```tsx
import { useState, useEffect } from 'react';

// 自动推导返回类型
function useCounter(initialValue: number = 0) {
  const [count, setCount] = useState(initialValue);
  
  const increment = () => setCount(c => c + 1);
  const decrement = () => setCount(c => c - 1);
  const reset = () => setCount(initialValue);
  
  return { count, increment, decrement, reset };
}

// TypeScript 自动推导返回类型为：
// { count: number; increment: () => void; decrement: () => void; reset: () => void }
```

### 泛型自定义 Hook

```tsx
// 通用数据获取 Hook
function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    
    fetch(url)
      .then(r => r.json())
      .then((data: T) => {
        setData(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err);
        setLoading(false);
      });
  }, [url]);

  return { data, loading, error };
}

// 使用
interface User {
  id: number;
  name: string;
}

function UserProfile({ userId }: { userId: number }) {
  const { data, loading, error } = useFetch<User>(`/api/users/${userId}`);

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error.message}</div>;
  if (!data) return null;

  return <div>{data.name}</div>;
}
```

### 复杂返回类型的 Hook

```tsx
// 使用元组返回多个值
function useToggle(initialValue: boolean = false): [boolean, () => void] {
  const [value, setValue] = useState(initialValue);
  const toggle = () => setValue(v => !v);
  
  return [value, toggle];
}

// 使用对象返回多个值（推荐，可读性更好）
function useToggle2(initialValue: boolean = false) {
  const [value, setValue] = useState(initialValue);
  const toggle = () => setValue(v => !v);
  const setTrue = () => setValue(true);
  const setFalse = () => setValue(false);
  
  return { value, toggle, setTrue, setFalse };
}

// 使用
const { value: isOpen, toggle, setTrue: open, setFalse: close } = useToggle2();
```

---

## 7. 高级类型技巧

### Utility Types 在 React 中的应用

```tsx
import { ComponentProps, ComponentPropsWithoutRef } from 'react';

// 1. 提取组件的 Props 类型
type ButtonProps = ComponentProps<'button'>;
type InputProps = ComponentProps<'input'>;

// 2. 扩展原生元素 Props
interface CustomButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: 'primary' | 'secondary';
  loading?: boolean;
}

function CustomButton({ variant = 'primary', loading, ...props }: CustomButtonProps) {
  return (
    <button 
      {...props} 
      className={`btn btn--${variant}`}
      disabled={loading || props.disabled}
    >
      {loading ? '加载中...' : props.children}
    </button>
  );
}

// 3. Pick 和 Omit
interface User {
  id: number;
  name: string;
  email: string;
  password: string;
}

// 只选择部分字段
type UserPublicInfo = Pick<User, 'id' | 'name'>;

// 排除敏感字段
type UserSafeInfo = Omit<User, 'password'>;

// 4. Partial 和 Required
type PartialUser = Partial<User>; // 所有字段可选
type RequiredUser = Required<User>; // 所有字段必选

// 5. Readonly
type ImmutableUser = Readonly<User>; // 所有字段只读
```

### 条件类型与映射类型

```tsx
// 根据条件动态生成类型
type IsString<T> = T extends string ? true : false;

type A = IsString<string>; // true
type B = IsString<number>; // false

// 实际应用：AsyncState
type AsyncState<T, E = Error> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: E };

// 映射类型：将所有字段变为可选
type Optional<T> = {
  [K in keyof T]?: T[K];
};

// 映射类型：将所有字段变为 Promise
type Promisify<T> = {
  [K in keyof T]: Promise<T[K]>;
};
```

### 类型守卫

```tsx
// 类型谓词
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function processValue(value: string | number) {
  if (isString(value)) {
    // TypeScript 知道这里 value 是 string
    console.log(value.toUpperCase());
  } else {
    // TypeScript 知道这里 value 是 number
    console.log(value.toFixed(2));
  }
}

// 判别联合的类型守卫
type Shape = 
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; sideLength: number };

function getArea(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2;
    case 'square':
      return shape.sideLength ** 2;
  }
}
```

---

## 8. 常见类型错误与解决方案

### 错误 1：隐式 any 类型

```tsx
// ❌ 错误
function handleClick(e) {
  console.log(e.target.value);
}

// ✅ 正确
function handleClick(e: MouseEvent<HTMLButtonElement>) {
  console.log(e.currentTarget.textContent);
}
```

### 错误 2：对象可能为 null

```tsx
// ❌ 错误
const inputRef = useRef<HTMLInputElement>(null);
inputRef.current.focus(); // 错误：对象可能为 null

// ✅ 正确：使用可选链
inputRef.current?.focus();

// ✅ 正确：类型守卫
if (inputRef.current) {
  inputRef.current.focus();
}
```

### 错误 3：类型断言滥用

```tsx
// ❌ 不推荐：使用 as any
const data = fetchData() as any;

// ✅ 推荐：明确类型
interface User {
  id: number;
  name: string;
}

const data = fetchData() as User;

// ✅ 更推荐：运行时验证
function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj
  );
}

const data = fetchData();
if (isUser(data)) {
  console.log(data.name);
}
```

---

## 9. tsconfig.json 推荐配置

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "bundler",
    
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitReturns": true,
    
    "esModuleInterop": true,
    "skipLibCheck": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    
    "resolveJsonModule": true,
    "isolatedModules": true,
    "incremental": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "build", "dist"]
}
```

---

## 总结

| 场景 | 推荐做法 |
| ------ | --------- |
| 函数组件 | 普通函数 + Props 接口，避免 React.FC |
| 泛型组件 | 使用泛型约束，确保类型安全 |
| Refs | 明确标注 DOM 元素类型，使用可选链 |
| 事件处理 | 使用具体的事件类型，避免 any |
| 自定义 Hooks | 善用类型推导，必要时使用泛型 |
| 类型复用 | 使用 Utility Types，避免重复定义 |

TypeScript 与 React 的完美结合，能够在编译期发现大量潜在错误，极大提升代码的健壮性与可维护性。
