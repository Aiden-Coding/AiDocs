---
sidebar_position: 2
---

# 高级练习：架构设计与性能优化

完成以下练习题，可以帮助你掌握高级架构设计、性能优化、复杂状态管理等专家级技能。

---

## 练习 1：实现虚拟滚动 (Virtual Scrolling)

**目标**：从零实现虚拟滚动列表，只渲染可视区域内的元素。

**要求**：
1. 支持数万条数据的流畅滚动
2. 动态计算可视区域内的元素索引
3. 支持可变高度的列表项（进阶）

```tsx
import { useState, useRef, useEffect, CSSProperties } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number; // 额外渲染的缓冲区项数
}

function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 3,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // 计算总高度
  const totalHeight = items.length * itemHeight;

  // 计算可视区域内的起始和结束索引
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  // 获取可视区域内的元素
  const visibleItems = items.slice(startIndex, endIndex + 1);

  // 监听滚动事件
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative',
      }}
    >
      {/* 占位容器，撑开总高度 */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* 只渲染可视区域内的元素 */}
        {visibleItems.map((item, i) => {
          const actualIndex = startIndex + i;
          return (
            <div
              key={actualIndex}
              style={{
                position: 'absolute',
                top: actualIndex * itemHeight,
                height: itemHeight,
                width: '100%',
              }}
            >
              {renderItem(item, actualIndex)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 使用示例
function App() {
  // 生成 10000 条数据
  const items = Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
    description: `Description for item ${i}`,
  }));

  return (
    <div>
      <h1>虚拟滚动列表（10000 条数据）</h1>
      <VirtualList
        items={items}
        itemHeight={60}
        containerHeight={600}
        overscan={5}
        renderItem={(item, index) => (
          <div
            style={{
              padding: '10px',
              borderBottom: '1px solid #eee',
              background: index % 2 === 0 ? '#f9f9f9' : 'white',
            }}
          >
            <h4>{item.name}</h4>
            <p style={{ margin: 0, color: '#666' }}>{item.description}</p>
          </div>
        )}
      />
    </div>
  );
}
```

**进阶挑战**：支持可变高度的列表项

```tsx
interface DynamicVirtualListProps<T> {
  items: T[];
  containerHeight: number;
  estimatedItemHeight: number; // 预估高度
  renderItem: (item: T, index: number) => React.ReactNode;
}

function DynamicVirtualList<T>({
  items,
  containerHeight,
  estimatedItemHeight,
  renderItem,
}: DynamicVirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [measuredHeights, setMeasuredHeights] = useState<Map<number, number>>(
    new Map()
  );
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // 测量实际高度
  useEffect(() => {
    const newHeights = new Map(measuredHeights);
    let hasChanges = false;

    itemRefs.current.forEach((element, index) => {
      const height = element.getBoundingClientRect().height;
      if (measuredHeights.get(index) !== height) {
        newHeights.set(index, height);
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setMeasuredHeights(newHeights);
    }
  });

  // 计算每个元素的位置和总高度
  const itemPositions: number[] = [];
  let totalHeight = 0;

  for (let i = 0; i < items.length; i++) {
    itemPositions.push(totalHeight);
    const height = measuredHeights.get(i) ?? estimatedItemHeight;
    totalHeight += height;
  }

  // 二分查找可视区域的起始索引
  const findStartIndex = () => {
    let left = 0;
    let right = items.length - 1;
    
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (itemPositions[mid] < scrollTop) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    
    return Math.max(0, left - 1);
  };

  const startIndex = findStartIndex();
  
  // 找到结束索引
  let endIndex = startIndex;
  let currentHeight = itemPositions[startIndex];
  
  while (
    endIndex < items.length &&
    currentHeight < scrollTop + containerHeight
  ) {
    currentHeight += measuredHeights.get(endIndex) ?? estimatedItemHeight;
    endIndex++;
  }

  const visibleItems = items.slice(startIndex, endIndex + 1);

  return (
    <div
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      style={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative',
      }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map((item, i) => {
          const actualIndex = startIndex + i;
          return (
            <div
              key={actualIndex}
              ref={(el) => {
                if (el) itemRefs.current.set(actualIndex, el);
              }}
              style={{
                position: 'absolute',
                top: itemPositions[actualIndex],
                width: '100%',
              }}
            >
              {renderItem(item, actualIndex)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## 练习 2：实现时间切片任务调度器

**目标**：使用 `requestIdleCallback` 实现大量计算任务的时间切片。

**要求**：
1. 将大任务拆分为小任务
2. 利用浏览器空闲时间执行
3. 不阻塞主线程，保持 UI 流畅

```tsx
interface Task {
  id: number;
  execute: () => void;
}

class TaskScheduler {
  private tasks: Task[] = [];
  private isRunning = false;

  addTask(task: Task) {
    this.tasks.push(task);
    if (!this.isRunning) {
      this.scheduleWork();
    }
  }

  private scheduleWork() {
    if (this.tasks.length === 0) {
      this.isRunning = false;
      return;
    }

    this.isRunning = true;

    // 使用 requestIdleCallback 在浏览器空闲时执行任务
    requestIdleCallback((deadline) => {
      // 当还有剩余时间且有任务时，继续执行
      while (deadline.timeRemaining() > 0 && this.tasks.length > 0) {
        const task = this.tasks.shift();
        if (task) {
          task.execute();
        }
      }

      // 继续调度剩余任务
      this.scheduleWork();
    });
  }
}

// 使用示例：大数据渲染
function HeavyComputationDemo() {
  const [items, setItems] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const schedulerRef = useRef(new TaskScheduler());

  const processLargeDataset = () => {
    setIsProcessing(true);
    setItems([]);

    const totalItems = 10000;
    const chunkSize = 100;
    const chunks = Math.ceil(totalItems / chunkSize);

    for (let i = 0; i < chunks; i++) {
      schedulerRef.current.addTask({
        id: i,
        execute: () => {
          const start = i * chunkSize;
          const end = Math.min(start + chunkSize, totalItems);
          const newItems = Array.from(
            { length: end - start },
            (_, j) => start + j
          );

          setItems((prev) => [...prev, ...newItems]);

          // 最后一个任务
          if (i === chunks - 1) {
            setIsProcessing(false);
          }
        },
      });
    }
  };

  return (
    <div>
      <h1>时间切片任务调度</h1>
      <button onClick={processLargeDataset} disabled={isProcessing}>
        {isProcessing ? '处理中...' : '处理 10000 条数据'}
      </button>
      <p>已处理: {items.length} / 10000</p>
      
      {/* 在处理过程中，UI 依然流畅可交互 */}
      <input type="text" placeholder="测试输入流畅度" />
      
      <div style={{ maxHeight: '400px', overflow: 'auto' }}>
        {items.map((item) => (
          <div key={item} style={{ padding: '5px', borderBottom: '1px solid #eee' }}>
            Item {item}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 练习 3：实现 Redux-like 状态管理

**目标**：从零实现一个轻量级的全局状态管理库。

**要求**：
1. 支持 dispatch action 更新状态
2. 支持 middleware 中间件
3. 支持 React 组件订阅状态变化

```tsx
type Listener = () => void;
type Middleware<S> = (store: Store<S>) => (next: Dispatch) => Dispatch;
type Dispatch = (action: Action) => void;

interface Action {
  type: string;
  payload?: any;
}

interface Store<S> {
  getState: () => S;
  dispatch: Dispatch;
  subscribe: (listener: Listener) => () => void;
}

// 创建 Store
function createStore<S>(
  reducer: (state: S, action: Action) => S,
  initialState: S,
  middlewares: Middleware<S>[] = []
): Store<S> {
  let state = initialState;
  const listeners: Set<Listener> = new Set();

  const getState = () => state;

  const subscribe = (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  // 基础 dispatch
  let dispatch: Dispatch = (action: Action) => {
    state = reducer(state, action);
    listeners.forEach((listener) => listener());
  };

  // 应用中间件
  middlewares.forEach((middleware) => {
    dispatch = middleware({ getState, dispatch, subscribe })(dispatch);
  });

  return { getState, dispatch, subscribe };
}

// Logger 中间件
const loggerMiddleware: Middleware<any> = (store) => (next) => (action) => {
  console.log('Dispatching:', action);
  console.log('Previous State:', store.getState());
  next(action);
  console.log('Next State:', store.getState());
};

// Thunk 中间件（支持异步 action）
const thunkMiddleware: Middleware<any> = (store) => (next) => (action) => {
  if (typeof action === 'function') {
    return action(store.dispatch, store.getState);
  }
  return next(action);
};

// React Hook 集成
function createContext<S>(store: Store<S>) {
  const StoreContext = React.createContext<Store<S> | null>(null);

  function Provider({ children }: { children: React.ReactNode }) {
    return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
  }

  function useStore() {
    const store = React.useContext(StoreContext);
    if (!store) {
      throw new Error('useStore must be used within a Provider');
    }
    return store;
  }

  function useSelector<T>(selector: (state: S) => T): T {
    const store = useStore();
    const [selectedState, setSelectedState] = useState(() =>
      selector(store.getState())
    );

    useEffect(() => {
      const handleChange = () => {
        const newState = selector(store.getState());
        setSelectedState(newState);
      };

      return store.subscribe(handleChange);
    }, [store, selector]);

    return selectedState;
  }

  function useDispatch() {
    const store = useStore();
    return store.dispatch;
  }

  return { Provider, useStore, useSelector, useDispatch };
}

// 使用示例
interface CounterState {
  count: number;
  loading: boolean;
}

type CounterAction =
  | { type: 'INCREMENT' }
  | { type: 'DECREMENT' }
  | { type: 'SET_LOADING'; payload: boolean };

function counterReducer(
  state: CounterState,
  action: CounterAction
): CounterState {
  switch (action.type) {
    case 'INCREMENT':
      return { ...state, count: state.count + 1 };
    case 'DECREMENT':
      return { ...state, count: state.count - 1 };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

const initialState: CounterState = { count: 0, loading: false };
const store = createStore(counterReducer, initialState, [
  loggerMiddleware,
  thunkMiddleware,
]);

const { Provider, useSelector, useDispatch } = createContext(store);

// 异步 Action Creator
function incrementAsync() {
  return (dispatch: Dispatch) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    setTimeout(() => {
      dispatch({ type: 'INCREMENT' });
      dispatch({ type: 'SET_LOADING', payload: false });
    }, 1000);
  };
}

function Counter() {
  const count = useSelector((state) => state.count);
  const loading = useSelector((state) => state.loading);
  const dispatch = useDispatch();

  return (
    <div>
      <h2>Count: {count}</h2>
      {loading && <p>Loading...</p>}
      <button onClick={() => dispatch({ type: 'INCREMENT' })}>同步 +1</button>
      <button onClick={() => dispatch({ type: 'DECREMENT' })}>同步 -1</button>
      <button onClick={() => dispatch(incrementAsync() as any)}>
        异步 +1
      </button>
    </div>
  );
}

function App() {
  return (
    <Provider>
      <Counter />
    </Provider>
  );
}
```

---

## 练习 4：实现 Suspense 数据加载

**目标**：使用 React 18+ 的 Suspense 机制实现优雅的数据加载。

**要求**：
1. 创建可以被 Suspense 捕获的 Resource
2. 支持并行数据请求
3. 实现错误边界处理

```tsx
type Status = 'pending' | 'success' | 'error';

interface Resource<T> {
  read(): T;
}

function wrapPromise<T>(promise: Promise<T>): Resource<T> {
  let status: Status = 'pending';
  let result: T;
  let error: any;

  const suspender = promise.then(
    (data) => {
      status = 'success';
      result = data;
    },
    (err) => {
      status = 'error';
      error = err;
    }
  );

  return {
    read() {
      if (status === 'pending') {
        throw suspender; // Suspense 会捕获这个 Promise
      } else if (status === 'error') {
        throw error; // ErrorBoundary 会捕获这个错误
      }
      return result;
    },
  };
}

// 模拟 API 请求
function fetchUser(id: number): Promise<{ id: number; name: string }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ id, name: `User ${id}` });
    }, 2000);
  });
}

function fetchPosts(userId: number): Promise<Array<{ id: number; title: string }>> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { id: 1, title: 'Post 1' },
        { id: 2, title: 'Post 2' },
      ]);
    }, 1500);
  });
}

// 创建 Resource
function createUserResource(id: number) {
  return {
    user: wrapPromise(fetchUser(id)),
    posts: wrapPromise(fetchPosts(id)),
  };
}

// 使用 Resource 的组件
function UserProfile({ resource }: { resource: ReturnType<typeof createUserResource> }) {
  // read() 会在数据未就绪时抛出 Promise，Suspense 会捕获
  const user = resource.user.read();

  return (
    <div>
      <h2>{user.name}</h2>
      <Suspense fallback={<div>加载文章列表...</div>}>
        <UserPosts resource={resource} />
      </Suspense>
    </div>
  );
}

function UserPosts({ resource }: { resource: ReturnType<typeof createUserResource> }) {
  const posts = resource.posts.read();

  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}

// 错误边界
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// 主应用
function App() {
  const [resource, setResource] = useState(() => createUserResource(1));

  const handleRefresh = () => {
    setResource(createUserResource(Math.floor(Math.random() * 100)));
  };

  return (
    <div>
      <h1>Suspense 数据加载示例</h1>
      <button onClick={handleRefresh}>刷新</button>

      <ErrorBoundary fallback={<div>加载失败，请重试</div>}>
        <Suspense fallback={<div>加载用户信息...</div>}>
          <UserProfile resource={resource} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
```

---

## 练习 5：实现拖拽排序列表

**目标**：使用原生 HTML5 Drag & Drop API 实现可拖拽排序的列表。

**要求**：
1. 支持拖拽重新排序
2. 显示拖拽预览和插入位置
3. 平滑动画过渡

```tsx
interface DraggableItem {
  id: number;
  content: string;
}

function DraggableSortableList() {
  const [items, setItems] = useState<DraggableItem[]>([
    { id: 1, content: 'Item 1' },
    { id: 2, content: 'Item 2' },
    { id: 3, content: 'Item 3' },
    { id: 4, content: 'Item 4' },
    { id: 5, content: 'Item 5' },
  ]);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
  };

  const handleDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedIndex !== null && draggedIndex !== index) {
      setDropTargetIndex(index);
    }
  };

  const handleDrop = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === index) return;

    const newItems = [...items];
    const [removed] = newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, removed);

    setItems(newItems);
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto' }}>
      <h2>拖拽排序列表</h2>
      {items.map((item, index) => (
        <div
          key={item.id}
          draggable
          onDragStart={handleDragStart(index)}
          onDragOver={handleDragOver(index)}
          onDrop={handleDrop(index)}
          onDragEnd={handleDragEnd}
          style={{
            padding: '15px',
            margin: '5px 0',
            backgroundColor:
              draggedIndex === index
                ? '#e3f2fd'
                : dropTargetIndex === index
                ? '#fff3e0'
                : 'white',
            border: '2px solid',
            borderColor:
              dropTargetIndex === index ? '#ff9800' : '#ddd',
            borderRadius: '4px',
            cursor: 'move',
            opacity: draggedIndex === index ? 0.5 : 1,
            transition: 'all 0.2s ease',
            transform:
              dropTargetIndex === index ? 'scale(1.02)' : 'scale(1)',
          }}
        >
          <strong>{item.content}</strong>
        </div>
      ))}
    </div>
  );
}
```

---

## 挑战练习：实现代码分割与懒加载路由

**目标**：实现一个简单的路由系统，支持代码分割和懒加载。

**要求**：
1. 实现基础路由匹配和导航
2. 支持 React.lazy 懒加载组件
3. 使用 Suspense 处理加载状态
4. 支持嵌套路由和路由参数

```tsx
import { createContext, useContext, useState, useEffect, lazy, Suspense } from 'react';

interface RouteConfig {
  path: string;
  component: React.ComponentType<any>;
  children?: RouteConfig[];
}

interface RouterContextValue {
  currentPath: string;
  navigate: (path: string) => void;
  params: Record<string, string>;
}

const RouterContext = createContext<RouterContextValue | null>(null);

// 路径匹配函数
function matchPath(pattern: string, path: string): { match: boolean; params: Record<string, string> } {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);

  if (patternParts.length !== pathParts.length) {
    return { match: false, params: {} };
  }

  const params: Record<string, string> = {};

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const pathPart = pathParts[i];

    if (patternPart.startsWith(':')) {
      // 动态参数
      params[patternPart.slice(1)] = pathPart;
    } else if (patternPart !== pathPart) {
      return { match: false, params: {} };
    }
  }

  return { match: true, params };
}

function Router({ routes, children }: { routes: RouteConfig[]; children?: React.ReactNode }) {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [params, setParams] = useState<Record<string, string>>({});

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  // 查找匹配的路由
  const findMatchingRoute = (routes: RouteConfig[], path: string): { route: RouteConfig | null; params: Record<string, string> } => {
    for (const route of routes) {
      const { match, params } = matchPath(route.path, path);
      if (match) {
        return { route, params };
      }
    }
    return { route: null, params: {} };
  };

  const { route, params: routeParams } = findMatchingRoute(routes, currentPath);

  useEffect(() => {
    setParams(routeParams);
  }, [routeParams]);

  return (
    <RouterContext.Provider value={{ currentPath, navigate, params }}>
      {route ? <route.component /> : <div>404 - Page Not Found</div>}
      {children}
    </RouterContext.Provider>
  );
}

function useRouter() {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a Router');
  }
  return context;
}

function Link({ to, children }: { to: string; children: React.ReactNode }) {
  const { navigate } = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(to);
  };

  return (
    <a href={to} onClick={handleClick}>
      {children}
    </a>
  );
}

// 懒加载页面组件
const HomePage = lazy(() => import('./pages/Home'));
const AboutPage = lazy(() => import('./pages/About'));
const UserPage = lazy(() => import('./pages/User'));

const routes: RouteConfig[] = [
  { path: '/', component: HomePage },
  { path: '/about', component: AboutPage },
  { path: '/user/:id', component: UserPage },
];

function App() {
  return (
    <Router routes={routes}>
      <nav>
        <Link to="/">首页</Link> | <Link to="/about">关于</Link> |{' '}
        <Link to="/user/123">用户</Link>
      </nav>

      <Suspense fallback={<div>加载页面中...</div>}>
        <div style={{ padding: '20px' }}>
          {/* 路由组件会在这里渲染 */}
        </div>
      </Suspense>
    </Router>
  );
}

// 示例页面组件
// pages/User.tsx
function UserPage() {
  const { params } = useRouter();
  
  return (
    <div>
      <h1>用户页面</h1>
      <p>用户 ID: {params.id}</p>
    </div>
  );
}
```

---

## 学习建议

1. **深入理解原理**：这些练习涉及 React 的核心机制，务必理解每一行代码
2. **性能分析**：使用 Chrome DevTools Performance 标签页分析性能瓶颈
3. **源码学习**：对照 React 源码，理解官方实现的设计思路
4. **生产实践**：将这些技术应用到实际项目中，观察效果
5. **持续优化**：性能优化是持续的过程，建立性能监控体系

完成这些练习后，你将具备高级 React 架构师的能力，可以设计和实现复杂的企业级应用！
