---
sidebar_position: 5
---

# Context API 与 useReducer 模式

在构建复杂的业务场景时，跨组件的状态共享和状态机的规范管理是核心痛点。React 提供了原生的 **Context API** 与 **useReducer**，组合这两者即可在不引入任何外部第三方库的前提下，构建出可预测、类型安全的轻量级全局状态管理系统。

---

## 1. Context API 的工作机制与渲染陷阱

Context 提供了一种无需通过 props 逐层手动透传，即可在组件树中传递数据的方案。然而，很多开发者在享受便利的同时，也陷入了严重的**非必要重渲染陷阱**。

### 渲染陷阱的本质

当一个 Context Provider 的 `value` 发生变化时，**所有消费该 Context 的子代组件，都会被迫触发一次重新渲染（Re-render）**，不论它们只消费了 value 中的哪一个子字段。

```tsx
// ❌ 存在严重性能隐患的写法
const UserConfigContext = createContext<{ theme: string; lang: string } | null>(null);

function Provider({ children }) {
  const [theme, setTheme] = useState('light');
  const [lang, setLang] = useState('zh');

  // 每次 theme 改变，都会产生一个全新的对象引用 { theme, lang }
  // 导致所有消费 UserConfigContext 的组件重新渲染，即使它们只关心 lang
  return (
    <UserConfigContext.Provider value={{ theme, lang }}>
      {children}
    </UserConfigContext.Provider>
  );
}
```

---

## 2. Context 性能优化的三大黄金策略

为了规避上述渲染陷阱，我们可以采用以下三种优化方案：

### 方案 1：拆分 Context（推荐）

根据业务维度，将一个庞大臃肿的 Context 拆分为多个相互独立的小 Context，实现职责分离与按需订阅。

```tsx
// 将 Theme 与 Language 彻底拆分
const ThemeContext = createContext<string>('light');
const LanguageContext = createContext<string>('zh');

function OptimizedProvider({ children }) {
  const [theme, setTheme] = useState('light');
  const [lang, setLang] = useState('zh');

  return (
    <ThemeContext.Provider value={theme}>
      <LanguageContext.Provider value={lang}>
        {children}
      </LanguageContext.Provider>
    </ThemeContext.Provider>
  );
}
```

### 方案 2：利用 `children` 属性进行性能隔离

如果你有一个经常更新的 Provider 组件，为了防止它的子组件树跟着重渲染，可以利用 `children` 占位来让 React 复用原有的 WIP Fiber 节点，从而中断向下重渲染。

```tsx
//  推荐：将业务状态维护在独立的 Wrapper 中，并将子树作为 children 传入
function StateWrapper({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);

  return (
    <CountContext.Provider value={count}>
      {/* 因为 children 的引用在外面是稳定的，React 能够直接复用 WIP 树，不会重新渲染 children 内部的子组件 */}
      {children}
    </CountContext.Provider>
  );
}
```

### 方案 3：使用 `useMemo` 缓存 Provider 的 Value

如果 value 的属性较多，应当保证传入 value 对象的引用稳定性，避免因父组件更新重新生成对象：

```tsx
function MemoizedProvider({ children }) {
  const [theme, setTheme] = useState('light');
  const [lang, setLang] = useState('zh');

  // 仅当 theme 或 lang 真正改变时，才生成新的 value 引用
  const contextValue = useMemo(() => ({ theme, lang }), [theme, lang]);

  return (
    <UserConfigContext.Provider value={contextValue}>
      {children}
    </UserConfigContext.Provider>
  );
}
```

---

## 3. useReducer：管理复杂的状态状态机

对于结构复杂、包含多种业务动作的状态（例如：购物车、多步骤表单），使用简单的 `useState` 会导致代码中充满散乱的修改逻辑。`useReducer` 允许我们以类似 Redux 的单向数据流思想管理状态。

### 核心要素

- **State**：状态机的当前只读快照。
- **Action**：描述“发生了什么操作”的普通 JavaScript 对象。
- **Reducer**：一个纯函数，接收 `state` 和 `action`，并根据 action 的类型计算出并返回一个全新的 `state`。

### 代码实战：购物车状态机

```tsx
import { useReducer } from 'react';

interface CartItem {
  id: number;
  name: string;
  quantity: number;
}

type CartState = CartItem[];

type CartAction =
  | { type: 'ADD_ITEM'; payload: { id: number; name: string } }
  | { type: 'REMOVE_ITEM'; payload: number }
  | { type: 'INCREMENT_QTY'; payload: number }
  | { type: 'DECREMENT_QTY'; payload: number };

// Reducer 必须是一个不含副作用的纯函数
function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.find(item => item.id === action.payload.id);
      if (existing) {
        return state.map(item =>
          item.id === action.payload.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...state, { ...action.payload, quantity: 1 }];
    }
    case 'REMOVE_ITEM':
      return state.filter(item => item.id !== action.payload);
    case 'INCREMENT_QTY':
      return state.map(item =>
        item.id === action.payload ? { ...item, quantity: item.quantity + 1 } : item
      );
    case 'DECREMENT_QTY':
      return state.map(item =>
        item.id === action.payload && item.quantity > 1
          ? { ...item, quantity: item.quantity - 1 }
          : item
      );
    default:
      return state;
  }
}

export function ShoppingCart() {
  const [state, dispatch] = useReducer(cartReducer, []);

  return (
    <div className="cart">
      <h2>我的购物车</h2>
      {state.map(item => (
        <div key={item.id} className="cart-item">
          <span>{item.name} (数量: {item.quantity})</span>
          <button onClick={() => dispatch({ type: 'INCREMENT_QTY', payload: item.id })}>+</button>
          <button onClick={() => dispatch({ type: 'DECREMENT_QTY', payload: item.id })}>-</button>
          <button onClick={() => dispatch({ type: 'REMOVE_ITEM', payload: item.id })}>删除</button>
        </div>
      ))}
      <button onClick={() => dispatch({ type: 'ADD_ITEM', payload: { id: 1, name: 'iPad Pro' } })}>
        添加 iPad
      </button>
    </div>
  );
}
```

---

## 4. 终极组合：Context + useReducer 打造全局数据流

我们可以通过将 `state` 与 `dispatch` 双重注入 Context 中，构建一个完全可以媲美 Redux 且零包体积开销的轻量全局状态管理器。

```tsx
import React, { createContext, useContext, useReducer } from 'react';

// 1. 创建共享上下文
const CartStateContext = createContext<CartState | null>(null);
const CartDispatchContext = createContext<React.Dispatch<CartAction> | null>(null);

// 2. 编写全局 Provider 包装器
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, []);

  return (
    <CartStateContext.Provider value={state}>
      <CartDispatchContext.Provider value={dispatch}>
        {children}
      </CartDispatchContext.Provider>
    </CartStateContext.Provider>
  );
}

// 3. 自定义 Hooks 提升消费体验，添加防空安全校验
export function useCartState() {
  const context = useContext(CartStateContext);
  if (!context) throw new Error('useCartState 必须在 CartProvider 内使用');
  return context;
}

export function useCartDispatch() {
  const context = useContext(CartDispatchContext);
  if (!context) throw new Error('useCartDispatch 必须在 CartProvider 内使用');
  return context;
}
```
