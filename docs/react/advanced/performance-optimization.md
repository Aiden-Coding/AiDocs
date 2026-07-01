---
sidebar_position: 3
---

# 性能优化与 React Compiler

性能优化是构建企业级 React 应用的核心技能。本文将深入剖析 React 19 引入的自动优化编译器、传统优化手段以及性能分析工具的使用。

---

## 1. React Compiler：自动 Memoization 革命

React 19 引入了革命性的 **React Compiler**（曾用代号 React Forget），它能够在编译期自动插入优化代码，彻底解放开发者手动编写 `useMemo` 和 `useCallback` 的负担。

### 编译器的工作原理

React Compiler 会在编译阶段分析组件代码，识别出哪些计算结果可以被缓存，然后自动插入 Memoization 逻辑。

#### 编译前的代码

```tsx
function ExpensiveComponent({ items }) {
  // 每次渲染都会重新计算
  const total = items.reduce((sum, item) => sum + item.price, 0);
  
  // 每次渲染都会创建新函数
  const handleClick = () => {
    console.log('Total:', total);
  };

  return (
    <div>
      <p>总价: {total}</p>
      <button onClick={handleClick}>查看详情</button>
    </div>
  );
}
```

#### 编译后的代码（简化示例）

```tsx
function ExpensiveComponent({ items }) {
  // 编译器自动添加 useMemo
  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price, 0),
    [items]
  );
  
  // 编译器自动添加 useCallback
  const handleClick = useCallback(() => {
    console.log('Total:', total);
  }, [total]);

  return (
    <div>
      <p>总价: {total}</p>
      <button onClick={handleClick}>查看详情</button>
    </div>
  );
}
```

### 启用 React Compiler

React Compiler 目前处于实验阶段，需要通过 Babel 插件启用：

```bash
npm install --save-dev babel-plugin-react-compiler
```

配置 `.babelrc`：

```json
{
  "plugins": [
    ["react-compiler", {
      "target": "19"
    }]
  ]
}
```

### 编译器的局限性

1. **副作用代码**：编译器无法优化包含副作用的代码（如直接修改外部变量）。
2. **动态依赖**：过于复杂的动态依赖关系可能导致编译器放弃优化。
3. **第三方库**：无法优化未经过编译器处理的第三方库代码。

---

## 2. useMemo：昂贵计算的缓存

`useMemo` 用于缓存计算开销大的结果，避免在每次渲染时重复计算。

### useMemo 使用场景

#### ✅ 适合使用 useMemo 的场景

##### 场景 1：复杂的数据转换

```tsx
function DataTable({ rawData }) {
  // 复杂的数据处理，应该缓存
  const processedData = useMemo(() => {
    return rawData
      .filter(item => item.isActive)
      .map(item => ({
        ...item,
        displayName: `${item.firstName} ${item.lastName}`,
        formattedDate: new Date(item.createdAt).toLocaleDateString()
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [rawData]);

  return <Table data={processedData} />;
}
```

##### 场景 2：避免子组件不必要的重渲染

```tsx
function Parent() {
  const [count, setCount] = useState(0);
  
  // 缓存配置对象，避免子组件每次都重渲染
  const config = useMemo(() => ({
    theme: 'dark',
    locale: 'zh-CN'
  }), []);

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
      <Child config={config} />
    </div>
  );
}

const Child = React.memo(function Child({ config }) {
  console.log('Child 渲染');
  return <div>{config.theme}</div>;
});
```

#### ❌ 不应使用 useMemo 的场景

##### 场景 1：简单计算

```tsx
// ❌ 过度优化：简单计算无需缓存
const doubled = useMemo(() => count * 2, [count]);

// ✅ 直接计算即可
const doubled = count * 2;
```

##### 场景 2：创建开销小的对象

```tsx
// ❌ 过度优化：创建简单对象的开销远小于 useMemo 的开销
const style = useMemo(() => ({ color: 'red' }), []);

// ✅ 如果确实需要稳定引用，提取到组件外部
const style = { color: 'red' };
```

### 依赖数组的陷阱

```tsx
function SearchResults({ query, filters }) {
  // ❌ 错误：filters 是对象，引用每次都变化
  const results = useMemo(() => {
    return searchAPI(query, filters);
  }, [query, filters]);

  // ✅ 正确：将对象展开为原始值
  const results = useMemo(() => {
    return searchAPI(query, filters);
  }, [query, filters.category, filters.priceRange]);
  
  // 或使用深比较库
  const results = useMemo(() => {
    return searchAPI(query, filters);
  }, [query, JSON.stringify(filters)]); // 简单场景可用，复杂对象不推荐
}
```

---

## 3. useCallback：函数引用的稳定化

`useCallback` 用于缓存函数引用，避免子组件因为接收到新的函数引用而重渲染。

### useCallback 使用场景

#### ✅ 适合使用 useCallback 的场景

##### 场景 1：传递给优化过的子组件

```tsx
function TodoList({ todos }) {
  const [filter, setFilter] = useState('all');

  // 缓存函数引用，避免 TodoItem 重渲染
  const handleToggle = useCallback((id) => {
    toggleTodo(id);
  }, []);

  return (
    <ul>
      {todos.map(todo => (
        <TodoItem 
          key={todo.id} 
          todo={todo} 
          onToggle={handleToggle} 
        />
      ))}
    </ul>
  );
}

// 使用 React.memo 优化
const TodoItem = React.memo(function TodoItem({ todo, onToggle }) {
  return (
    <li>
      <input 
        type="checkbox" 
        checked={todo.completed}
        onChange={() => onToggle(todo.id)}
      />
      {todo.text}
    </li>
  );
});
```

##### 场景 2：作为 useEffect 的依赖

```tsx
function DataFetcher({ userId }) {
  const [data, setData] = useState(null);

  // 缓存函数引用，避免 useEffect 重复执行
  const fetchData = useCallback(async () => {
    const response = await fetch(`/api/users/${userId}`);
    const json = await response.json();
    setData(json);
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return <div>{data?.name}</div>;
}
```

#### ❌ 不应使用 useCallback 的场景

##### 场景 1：子组件未使用 React.memo 优化

```tsx
// ❌ 过度优化：Child 未使用 React.memo，缓存无意义
function Parent() {
  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []);

  return <Child onClick={handleClick} />;
}

function Child({ onClick }) {
  return <button onClick={onClick}>点击</button>;
}
```

##### 场景 2：函数不会被传递或用作依赖

```tsx
// ❌ 过度优化：函数仅在组件内部使用
function Component() {
  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []);

  return <button onClick={handleClick}>点击</button>;
}

// ✅ 直接定义即可
function Component() {
  const handleClick = () => {
    console.log('clicked');
  };

  return <button onClick={handleClick}>点击</button>;
}
```

---

## 4. React.memo：组件级别的浅比较优化

`React.memo` 是一个高阶组件，用于对组件的 Props 进行浅比较，如果 Props 未变化则跳过重渲染。

### 基础使用

```tsx
const ExpensiveComponent = React.memo(function ExpensiveComponent({ data }) {
  console.log('渲染 ExpensiveComponent');
  return <div>{data.name}</div>;
});

function Parent() {
  const [count, setCount] = useState(0);
  const data = { name: '张三' }; // 每次渲染都是新对象

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
      {/* 每次都会重渲染，因为 data 引用变化了 */}
      <ExpensiveComponent data={data} />
    </div>
  );
}
```

### 自定义比较函数

```tsx
const UserCard = React.memo(
  function UserCard({ user }) {
    return <div>{user.name}</div>;
  },
  // 自定义比较函数：只比较 user.id
  (prevProps, nextProps) => {
    return prevProps.user.id === nextProps.user.id;
  }
);
```

### React.memo 的陷阱

#### 1. 浅比较的局限性

```tsx
// ❌ 陷阱：对象属性变化无法检测到
const data = { name: '张三', age: 25 };

// 即使使用 React.memo，修改对象属性也会被忽略
data.age = 26; // React.memo 无法检测到变化
```

#### 2. 过度使用的性能损耗

```tsx
// ❌ 不推荐：简单组件使用 React.memo 反而降低性能
const SimpleText = React.memo(function SimpleText({ text }) {
  return <p>{text}</p>;
});

// ✅ 简单组件直接渲染即可
function SimpleText({ text }) {
  return <p>{text}</p>;
}
```

---

## 5. 代码分割与懒加载

### React.lazy 动态导入

```tsx
import { lazy, Suspense } from 'react';

// 动态导入组件
const HeavyComponent = lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <HeavyComponent />
    </Suspense>
  );
}
```

### 路由级别的代码分割

```tsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div>页面加载中...</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

### 预加载优化

```tsx
import { lazy } from 'react';

const Dashboard = lazy(() => import('./Dashboard'));

// 预加载函数
const preloadDashboard = () => {
  import('./Dashboard');
};

function App() {
  return (
    <div>
      {/* 鼠标悬停时预加载 */}
      <button onMouseEnter={preloadDashboard}>
        前往仪表盘
      </button>
    </div>
  );
}
```

---

## 6. 虚拟列表优化

对于长列表渲染，使用虚拟列表技术只渲染可见区域的元素。

### 使用 react-window

```bash
npm install react-window
```

```tsx
import { FixedSizeList } from 'react-window';

function VirtualList({ items }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      {items[index].name}
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={50}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

### 动态高度列表

```tsx
import { VariableSizeList } from 'react-window';

function DynamicList({ items }) {
  const getItemSize = (index) => {
    // 根据内容动态计算高度
    return items[index].content.length > 100 ? 120 : 60;
  };

  const Row = ({ index, style }) => (
    <div style={style}>
      {items[index].content}
    </div>
  );

  return (
    <VariableSizeList
      height={600}
      itemCount={items.length}
      itemSize={getItemSize}
      width="100%"
    >
      {Row}
    </VariableSizeList>
  );
}
```

---

## 7. React DevTools Profiler：性能分析神器

### 使用 Profiler 组件

```tsx
import { Profiler } from 'react';

function onRenderCallback(
  id,                 // 发生渲染的 Profiler 树的 ID
  phase,              // "mount" 或 "update"
  actualDuration,     // 本次更新花费的时间
  baseDuration,       // 不使用 memoization 的情况下渲染整棵子树需要的时间
  startTime,          // 本次更新开始渲染的时间
  commitTime,         // 本次更新提交的时间
  interactions        // 本次更新的 interactions 集合
) {
  console.log(`${id} 渲染耗时: ${actualDuration}ms`);
}

function App() {
  return (
    <Profiler id="App" onRender={onRenderCallback}>
      <Dashboard />
    </Profiler>
  );
}
```

### 使用浏览器扩展进行性能分析

1. 安装 React DevTools 浏览器扩展
2. 打开 DevTools，切换到 Profiler 标签页
3. 点击录制按钮，执行操作，停止录制
4. 分析火焰图 (Flame Graph)：
   - **黄色区域**：渲染时间较长的组件
   - **灰色区域**：未重渲染的组件
   - **点击组件**：查看详细的渲染时间和原因

---

## 8. 批量更新与 flushSync

### 自动批处理 (Automatic Batching)

React 18+ 默认启用自动批处理，多个状态更新会被合并为一次渲染。

```tsx
function Component() {
  const [count, setCount] = useState(0);
  const [flag, setFlag] = useState(false);

  function handleClick() {
    // React 18+：自动批处理，只触发一次渲染
    setCount(c => c + 1);
    setFlag(f => !f);
    
    // React 17：在 setTimeout 中不会批处理，触发两次渲染
    setTimeout(() => {
      setCount(c => c + 1);
      setFlag(f => !f);
    }, 0);
  }

  console.log('渲染');
  return <button onClick={handleClick}>点击</button>;
}
```

### flushSync：强制同步渲染

```tsx
import { flushSync } from 'react-dom';

function Component() {
  const [count, setCount] = useState(0);
  const listRef = useRef(null);

  function handleClick() {
    flushSync(() => {
      setCount(c => c + 1);
    });
    
    // 此时 DOM 已经更新完毕，可以立即读取
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }

  return (
    <div>
      <button onClick={handleClick}>添加项目</button>
      <div ref={listRef}>
        {Array.from({ length: count }, (_, i) => (
          <div key={i}>Item {i}</div>
        ))}
      </div>
    </div>
  );
}
```

**注意**：`flushSync` 会打破批处理，降低性能，仅在必要时使用（如需要立即读取 DOM 状态）。

---

## 9. 性能优化清单

| 优化手段 | 适用场景 | 注意事项 |
| ---------- | ---------- | ---------- |
| React Compiler | 所有组件（React 19+） | 实验阶段，需要配置 |
| useMemo | 复杂计算、避免子组件重渲染 | 不要过度使用 |
| useCallback | 传给优化组件的函数、useEffect 依赖 | 配合 React.memo 使用 |
| React.memo | 渲染开销大的组件 | 浅比较，注意引用类型 |
| React.lazy | 路由级别、大组件 | 配合 Suspense 使用 |
| 虚拟列表 | 长列表渲染（>100 项） | 使用 react-window |
| 代码分割 | 按路由、按功能模块 | 控制 chunk 大小 |
| 批量更新 | 默认启用（React 18+） | 避免使用 flushSync |

---

## 10. 性能优化的黄金法则

1. **先测量，再优化**：使用 React DevTools Profiler 找出真正的性能瓶颈。
2. **避免过早优化**：不要在没有性能问题时盲目添加 `useMemo` 和 `useCallback`。
3. **组件拆分优先**：合理的组件拆分比 Memoization 更有效。
4. **状态下沉**：将状态放在尽可能低的层级，减少影响范围。
5. **拥抱 React Compiler**：React 19+ 项目优先启用编译器自动优化。

通过深入理解 React 的渲染机制和合理使用优化手段，可以构建出性能卓越的大型企业级应用。
