---
sidebar_position: 6
---

# 状态管理库选型与实践

在中大型 React 项目开发中，当内置的 Context API 无法满足超高频的数据读写性能要求，或者状态流转错综复杂时，选择一个合适的外部**状态管理库**是架构设计的重中之重。本章我们将对主流的三大状态库方案进行多维度对比，并提供完整的工程化配置代码。

---

## 1. 主流状态管理库设计理念对比

目前 React 社区形成了三大阵营：

### A. Flux 经典阵营（如 Redux Toolkit - RTK）

- **核心思想**：全局单实例 Store、单向数据流（Action -> Reducer -> Store -> View）。
- **心智模型**：高度规范化、强调行为（Actions）的可回溯性与可调试性。
- **缺点**：样板代码依然相对繁琐。

### B. 现代化轻量阵营（如 Zustand）

- **核心思想**：基于发布订阅模式的外部 Store，无 Provider 包裹需求，通过 Selector 进行高细粒度订阅。
- **心智模型**：极简、对开发者心智负担极低，契合 Hook 直觉。

### C. 原子状态阵营（如 Jotai / Recoil）

- **核心思想**：底层的原子状态（Atoms）相互依赖、自下而上组合出复杂的应用状态网。
- **心智模型**：特别适合高频局部重绘、复杂画布应用或看板系统。

| 维度 | Redux Toolkit | Zustand | Jotai |
| :--- | :--- | :--- | :--- |
| **状态流模型** | 全局单一大状态树 | 模块化多 Store | 散落的 Atom 原子树 |
| **Provider 依赖** | 必须 (React Redux Provider) | 不需要 | 可选 |
| **性能机制** | Selector 浅比较过滤 | Selector 浅比较过滤 | 依赖树图依赖自动收集 |
| **学习曲线** | 陡峭 | 平缓 | 中等 |

---

## 2. Redux Toolkit (RTK) 工程化实践

RTK 是 Redux 官方推荐的编写标准，它大幅消除了传统 Redux 的样板代码。

### 1. 定义 Slice (状态与 Reducers 合集)

```tsx
import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';

interface UserState {
  info: { name: string; email: string } | null;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  info: null,
  loading: false,
  error: null,
};

// 异步 Thunk Action
export const fetchUserById = createAsyncThunk(
  'user/fetchById',
  async (userId: string) => {
    const response = await fetch(`/api/user/${userId}`);
    return (await response.json()) as { name: string; email: string };
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    logout: (state) => {
      state.info = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserById.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchUserById.fulfilled, (state, action) => {
        state.loading = false;
        state.info = action.payload;
      })
      .addCase(fetchUserById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取失败';
      });
  },
});

export const { logout } = userSlice.actions;
export default userSlice.reducer;
```

### 2. 配置 Store 并绑定 React App

```tsx
import { configureStore } from '@reduxjs/toolkit';
import { Provider, useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import userReducer from './userSlice';

export const store = configureStore({
  reducer: {
    user: userReducer,
  },
});

// 导出强类型 Hooks 防止类型丢失
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

---

## 3. Zustand 现代化轻量选型实践

Zustand 是近年社区的热门选择，其不依赖 Context 的发布订阅架构，拥有极佳的运行性能。

### 1. 创建 Zustand Store

```tsx
import { create } from 'zustand';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

interface TodoState {
  todos: Todo[];
  loading: boolean;
  // 同步 action
  addTodo: (text: string) => void;
  toggleTodo: (id: number) => void;
  // 异步 action
  fetchTodos: () => Promise<void>;
}

export const useTodoStore = create<TodoState>((set, get) => ({
  todos: [],
  loading: false,
  
  addTodo: (text) => set((state) => ({
    todos: [...state.todos, { id: Date.now(), text, completed: false }]
  })),

  toggleTodo: (id) => set((state) => ({
    todos: state.todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
  })),

  fetchTodos: async () => {
    set({ loading: true });
    try {
      const response = await fetch('/api/todos');
      const data = await response.json();
      set({ todos: data, loading: false });
    } catch (err) {
      set({ loading: false });
    }
  }
}));
```

### 2. 组件中按需高精订阅

```tsx
function TodoListApp() {
  // 💡 最佳实践：使用特定 Selector 仅提取需要的字段，避免大对象解构带来的额外更新
  const todos = useTodoStore((state) => state.todos);
  const loading = useTodoStore((state) => state.loading);
  const toggleTodo = useTodoStore((state) => state.toggleTodo);

  if (loading) return <p>正在加载列表...</p>;

  return (
    <ul>
      {todos.map(todo => (
        <li 
          key={todo.id} 
          onClick={() => toggleTodo(todo.id)}
          style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}
        >
          {todo.text}
        </li>
      ))}
    </ul>
  );
}
```

---

## 4. 服务端状态管理：TanStack Query (React Query)

在传统 React 架构中，开发者常把从后端接口获取的数据（如用户信息、商品列表）强行存入 Redux 或 Zustand 等客户端 Store。这会导致手动维护加载状态、缓存失效、重复请求打爆服务器等繁琐代码。

**服务端状态（Server State）** 具有异步性、远程存储、易变性（可能被其他终端修改）等特点。**TanStack Query**（原 React Query）是现代 React 专门处理服务端状态/缓存/同步的标准库。

### 4.1 核心概念与优势

- **自动缓存与后台更新**：数据处于 `stale`（陈旧）状态时，在触发组件挂载、窗口聚焦（Window Focus）或网络恢复时自动重新获取。
- **开箱即用的异步状态**：声明式获得 `data`, `isLoading`, `isError`, `error` 状态。
- **乐观更新（Optimistic Updates）**：在提交修改请求时立即更改本地 UI，若服务器报错则自动回滚。

### 4.2 基础使用：`useQuery` 与 `useMutation`

```tsx
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

// 获取 Todo 列表
async function fetchTodos(): Promise<Todo[]> {
  const res = await fetch('/api/todos');
  if (!res.ok) throw new Error('网络请求错误');
  return res.json();
}

// 新增 Todo
async function addTodo(newTodo: { title: string }): Promise<Todo> {
  const res = await fetch('/api/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newTodo),
  });
  return res.json();
}

export function TodoAppWithReactQuery() {
  const queryClient = useQueryClient();

  // 1. 查询数据
  const { data: todos, isLoading, isError, error } = useQuery<Todo[]>({
    queryKey: ['todos'],
    queryFn: fetchTodos,
    staleTime: 1000 * 60 * 5, // 5 分钟内认为数据新鲜，不重复触发网络请求
  });

  // 2. 变更数据 (Mutation)
  const mutation = useMutation({
    mutationFn: addTodo,
    onSuccess: () => {
      // 提交成功后使缓存失效，促使列表自动重新拉取最新数据
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  if (isLoading) return <div>数据加载中...</div>;
  if (isError) return <div>加载失败: {(error as Error).message}</div>;

  return (
    <div>
      <button onClick={() => mutation.mutate({ title: '学习 React Query' })}>
        新增任务
      </button>
      <ul>
        {todos?.map((todo) => (
          <li key={todo.id}>{todo.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 5. 架构选型建议

1. **选择 RTK 的场景**：
   - 团队拥有浓厚的经典 Redux 背景，推崇规范的代码一致性。
   - 包含超大型前端应用开发，拥有非常多需要通过中间件（Middleware）拦截、打印或撤销状态流转日志的架构需求。
   - 需要使用 RTK Query 强大的网络缓存与轮询体系。
2. **选择 Zustand 的场景**：
   - 追求轻量化，希望快速构建敏捷的中小型项目，杜绝冗长的样板配置代码。
   - 需要在非 React 环境（如纯 vanilla JS、三维可视化 Three.js 事件循环）中随时读写和监听 Store 数据。
3. **选择 Jotai 的场景**：
   - 应用包含复杂的交互编辑器、多选框拖拽、可视化数据画布（如 Figma 类似的前端结构）。此时传统单 Store 会因一个节点变化导致大范围 Diff 卡顿，使用散落的 Atom 原子直接订阅能精准更新对应 DOM 节点。
4. **选择 TanStack Query / SWR 的场景**：
   - 几乎所有现代 React 项目！**强烈推荐**将客户端 UI 状态（如弹窗开关、主题切换存入 Zustand/Context）与服务端 API 数据（存入 React Query）彻底解耦，能大幅减少 60% 以上的模板代码。
