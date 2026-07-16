---
sidebar_position: 1
---

# 中级练习：Hooks 与组件设计

完成以下练习题，可以帮助你掌握自定义 Hooks、组件设计模式、性能优化等中级技能。

---

## 练习 1：自定义 Hook - useLocalStorage

**目标**：创建一个自定义 Hook，将状态自动同步到 localStorage。

**要求**：
1. 创建 `useLocalStorage` Hook，接收 key 和初始值
2. 状态变化时自动保存到 localStorage
3. 组件挂载时从 localStorage 读取初始值
4. 处理 JSON 序列化和反序列化

```tsx
function useLocalStorage<T>(key: string, initialValue: T) {
  // 从 localStorage 读取初始值
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return initialValue;
    }
  });

  // 更新 localStorage 的包装函数
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  };

  return [storedValue, setValue] as const;
}

// 使用示例
function ThemeToggle() {
  const [theme, setTheme] = useLocalStorage('theme', 'light');

  return (
    <div>
      <p>当前主题: {theme}</p>
      <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
        切换主题
      </button>
    </div>
  );
}
```

---

## 练习 2：自定义 Hook - useDebounce

**目标**：实现防抖 Hook，优化搜索输入性能。

**要求**：
1. 创建 `useDebounce` Hook，延迟更新值
2. 用户停止输入指定时间后才更新
3. 配合搜索功能减少 API 请求

```tsx
function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // 设置定时器延迟更新
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // 清理函数：如果 value 在 delay 时间内再次变化，取消上一次的定时器
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// 使用示例：搜索组件
function SearchWithDebounce() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 800);
  const [results, setResults] = useState<string[]>([]);

  useEffect(() => {
    if (debouncedSearchTerm) {
      // 这里只有在用户停止输入 800ms 后才会触发
      console.log('执行搜索:', debouncedSearchTerm);
      // 模拟 API 调用
      fetch(`/api/search?q=${debouncedSearchTerm}`)
        .then(res => res.json())
        .then(data => setResults(data));
    }
  }, [debouncedSearchTerm]);

  return (
    <div>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="输入搜索关键词..."
      />
      <p>实时输入: {searchTerm}</p>
      <p>防抖后的值: {debouncedSearchTerm}</p>
      <ul>
        {results.map((item, idx) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 练习 3：React.memo 性能优化

**目标**：理解 React.memo 的使用场景和浅比较机制。

**要求**：
1. 创建父子组件，观察重渲染行为
2. 使用 React.memo 优化子组件
3. 配合 useCallback 稳定函数引用

```tsx
import React, { useState, useCallback, memo } from 'react';

// 未优化的子组件
function ExpensiveChild({ name, onClick }: { name: string; onClick: () => void }) {
  console.log('ExpensiveChild 渲染了:', name);
  // 模拟耗时计算
  const start = Date.now();
  while (Date.now() - start < 100) {} // 阻塞 100ms
  
  return (
    <div>
      <h3>{name}</h3>
      <button onClick={onClick}>点击</button>
    </div>
  );
}

// 使用 React.memo 优化
const MemoizedChild = memo(ExpensiveChild);

function ParentComponent() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState('张三');

  // ❌ 不使用 useCallback：每次渲染都会创建新函数引用
  const handleClickBad = () => {
    console.log('Clicked');
  };

  // ✅ 使用 useCallback：函数引用稳定
  const handleClickGood = useCallback(() => {
    console.log('Clicked');
  }, []);

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>
        触发父组件重渲染 (count: {count})
      </button>
      <input 
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="修改名字"
      />
      
      <hr />
      <h2>对比测试：</h2>
      
      {/* 场景 1：未优化 - 父组件每次渲染，子组件都会重渲染 */}
      <ExpensiveChild name={name} onClick={handleClickBad} />
      
      {/* 场景 2：Memo + 不稳定函数 - 依然会重渲染（onClick 引用变化） */}
      <MemoizedChild name={name} onClick={handleClickBad} />
      
      {/* 场景 3：Memo + useCallback - 只有 name 变化时才重渲染 */}
      <MemoizedChild name={name} onClick={handleClickGood} />
    </div>
  );
}
```

---

## 练习 4：复合组件模式 (Compound Components)

**目标**：实现一个 Tabs 组件，使用复合组件模式。

**要求**：
1. 创建 `Tabs`、`TabList`、`Tab`、`TabPanels`、`TabPanel` 组件
2. 使用 Context 共享激活状态
3. 支持灵活的布局组合

```tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface TabsContextValue {
  activeTab: number;
  setActiveTab: (index: number) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tab components must be used within a Tabs component');
  }
  return context;
}

// 主容器组件
export function Tabs({ 
  children, 
  defaultTab = 0 
}: { 
  children: ReactNode; 
  defaultTab?: number;
}) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

// 标签列表容器
Tabs.TabList = function TabList({ children }: { children: ReactNode }) {
  return <div className="tab-list">{children}</div>;
};

// 单个标签
Tabs.Tab = function Tab({ 
  index, 
  children 
}: { 
  index: number; 
  children: ReactNode;
}) {
  const { activeTab, setActiveTab } = useTabs();
  const isActive = activeTab === index;

  return (
    <button
      className={`tab ${isActive ? 'active' : ''}`}
      onClick={() => setActiveTab(index)}
    >
      {children}
    </button>
  );
};

// 面板容器
Tabs.TabPanels = function TabPanels({ children }: { children: ReactNode }) {
  return <div className="tab-panels">{children}</div>;
};

// 单个面板
Tabs.TabPanel = function TabPanel({ 
  index, 
  children 
}: { 
  index: number; 
  children: ReactNode;
}) {
  const { activeTab } = useTabs();
  
  if (activeTab !== index) return null;
  
  return <div className="tab-panel">{children}</div>;
};

// 使用示例
function App() {
  return (
    <Tabs defaultTab={0}>
      <Tabs.TabList>
        <Tabs.Tab index={0}>个人信息</Tabs.Tab>
        <Tabs.Tab index={1}>账号设置</Tabs.Tab>
        <Tabs.Tab index={2}>通知管理</Tabs.Tab>
      </Tabs.TabList>

      <Tabs.TabPanels>
        <Tabs.TabPanel index={0}>
          <h2>个人信息</h2>
          <p>姓名、邮箱、头像等信息</p>
        </Tabs.TabPanel>
        <Tabs.TabPanel index={1}>
          <h2>账号设置</h2>
          <p>修改密码、绑定手机号</p>
        </Tabs.TabPanel>
        <Tabs.TabPanel index={2}>
          <h2>通知管理</h2>
          <p>邮件通知、推送设置</p>
        </Tabs.TabPanel>
      </Tabs.TabPanels>
    </Tabs>
  );
}
```

---

## 练习 5：自定义 Hook - useFetch

**目标**：封装数据请求逻辑，处理加载、错误、重试状态。

**要求**：
1. 创建 `useFetch` Hook
2. 自动管理 loading、error、data 状态
3. 支持重新请求功能
4. 组件卸载时取消请求

```tsx
interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

function useFetch<T>(url: string): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const json = await response.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    let isMounted = true;

    fetchData().then(() => {
      // 确保组件仍然挂载
      if (!isMounted) {
        console.log('Component unmounted, ignoring fetch result');
      }
    });

    // 清理函数
    return () => {
      isMounted = false;
    };
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// 使用示例
interface User {
  id: number;
  name: string;
  email: string;
}

function UserProfile({ userId }: { userId: number }) {
  const { data, loading, error, refetch } = useFetch<User>(
    `/api/users/${userId}`
  );

  if (loading) return <div>加载中...</div>;
  if (error) return (
    <div>
      <p>错误: {error.message}</p>
      <button onClick={refetch}>重试</button>
    </div>
  );
  if (!data) return <div>没有数据</div>;

  return (
    <div>
      <h2>{data.name}</h2>
      <p>邮箱: {data.email}</p>
      <button onClick={refetch}>刷新</button>
    </div>
  );
}
```

---

## 练习 6：Portal 与模态框

**目标**：使用 React Portal 实现模态框组件。

**要求**：
1. 使用 `createPortal` 将模态框渲染到 body
2. 支持打开/关闭动画
3. 点击遮罩层关闭模态框
4. 按 ESC 键关闭

```tsx
import { createPortal } from 'react-dom';
import { useEffect, ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

function Modal({ isOpen, onClose, children, title }: ModalProps) {
  // 监听 ESC 键
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // 防止背景滚动
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()} // 阻止点击内容时关闭
        style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          maxWidth: '500px',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
      >
        {title && (
          <div className="modal-header">
            <h2>{title}</h2>
            <button onClick={onClose}>✕</button>
          </div>
        )}
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body
  );
}

// 使用示例
function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div>
      <button onClick={() => setIsModalOpen(true)}>打开模态框</button>
      
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="用户信息"
      >
        <p>这是模态框内容</p>
        <p>点击遮罩层或按 ESC 键关闭</p>
        <button onClick={() => setIsModalOpen(false)}>确定</button>
      </Modal>
    </div>
  );
}
```

---

## 挑战练习：无限滚动列表

**目标**：实现无限滚动加载功能，使用 Intersection Observer API。

**要求**：
1. 当滚动到底部时自动加载更多数据
2. 显示加载状态
3. 处理加载失败和无更多数据的情况
4. 使用自定义 Hook 封装逻辑

```tsx
import { useState, useEffect, useRef, useCallback } from 'react';

interface UseInfiniteScrollOptions {
  initialPage?: number;
  threshold?: number;
}

function useInfiniteScroll<T>(
  fetchFunction: (page: number) => Promise<T[]>,
  options: UseInfiniteScrollOptions = {}
) {
  const { initialPage = 1, threshold = 0.8 } = options;
  
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);

    try {
      const newItems = await fetchFunction(page);
      
      if (newItems.length === 0) {
        setHasMore(false);
      } else {
        setItems(prev => [...prev, ...newItems]);
        setPage(prev => prev + 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load'));
    } finally {
      setLoading(false);
    }
  }, [page, loading, hasMore, fetchFunction]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting) {
          loadMore();
        }
      },
      { threshold }
    );

    observerRef.current = observer;

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [loadMore, threshold]);

  return { items, loading, hasMore, error, loadMoreRef };
}

// 使用示例
interface Post {
  id: number;
  title: string;
  content: string;
}

// 模拟 API 请求
async function fetchPosts(page: number): Promise<Post[]> {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 模拟 10 页数据
  if (page > 10) return [];
  
  return Array.from({ length: 20 }, (_, i) => ({
    id: (page - 1) * 20 + i + 1,
    title: `Post ${(page - 1) * 20 + i + 1}`,
    content: `This is the content of post ${(page - 1) * 20 + i + 1}`,
  }));
}

function InfiniteScrollList() {
  const { items, loading, hasMore, error, loadMoreRef } = useInfiniteScroll<Post>(
    fetchPosts,
    { threshold: 0.9 }
  );

  return (
    <div>
      <h1>无限滚动列表</h1>
      
      <div className="posts">
        {items.map(post => (
          <div key={post.id} className="post">
            <h3>{post.title}</h3>
            <p>{post.content}</p>
          </div>
        ))}
      </div>

      {/* 监听元素 */}
      <div ref={loadMoreRef} style={{ height: '20px' }} />

      {loading && <div className="loading">加载中...</div>}
      {error && <div className="error">加载失败: {error.message}</div>}
      {!hasMore && <div className="no-more">没有更多数据了</div>}
    </div>
  );
}
```

---

## 学习建议

1. **理解原理**：每个练习都涉及重要的设计模式或性能优化技巧
2. **扩展功能**：尝试为这些组件添加更多功能（如 useFetch 支持 POST 请求）
3. **TypeScript**：强化类型定义，提升代码质量
4. **测试驱动**：尝试为这些自定义 Hook 编写单元测试
5. **性能分析**：使用 React DevTools Profiler 观察优化效果

完成这些练习后，你将具备中级 React 开发能力，可以开始学习高级主题和架构设计！
