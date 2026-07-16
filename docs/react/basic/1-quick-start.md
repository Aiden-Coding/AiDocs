---
sidebar_position: 0
---

# 快速开始：15分钟构建你的第一个 React 应用

欢迎来到 React 的世界！本指南将在 **15 分钟内**带你从零基础搭建环境、写出第一个组件、体验 React 的魔力。

---

## 前置条件

- 已安装 **Node.js 16+** 和 **npm**（或 yarn、pnpm）
- 有一个文本编辑器（推荐 VS Code）
- 基本 JavaScript 知识（变量、函数、数组方法）

### 检查环境

打开终端，运行以下命令验证 Node.js 已安装：

```bash
node --version  # 应输出 v16.0.0 或更高版本
npm --version   # 应输出 8.0.0 或更高版本
```

---

## 步骤 1：创建项目（2 分钟）

使用 Vite 快速创建一个 React + TypeScript 项目：

```bash
npm create vite@latest my-first-react-app -- --template react-ts
cd my-first-react-app
npm install
```

项目结构会是这样的：

```
my-first-react-app/
├── src/
│   ├── App.tsx           # 主应用组件
│   ├── main.tsx          # 应用入口
│   └── ...
├── index.html            # HTML 模板
├── package.json          # 项目配置
└── vite.config.ts        # Vite 配置
```

---

## 步骤 2：启动开发服务器（1 分钟）

```bash
npm run dev
```

你会看到类似的输出：

```
  VITE v5.0.0  ready in 234 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

打开浏览器，访问 `http://localhost:5173`，你应该能看到一个 Vite + React 的欢迎页面。

---

## 步骤 3：编写你的第一个组件（5 分钟）

打开 `src/App.tsx` 文件，清空现有内容，替换为以下代码：

```tsx
import { useState } from 'react';
import './App.css';

function App() {
  // 声明状态：count 是当前值，setCount 是更新函数
  const [count, setCount] = useState(0);

  // 事件处理函数
  const increment = () => setCount(prev => prev + 1);
  const decrement = () => setCount(prev => prev - 1);
  const reset = () => setCount(0);

  return (
    <div className="app-container">
      <header>
        <h1>🎉 欢迎来到 React</h1>
        <p>这是你的第一个 React 应用！</p>
      </header>

      {/* 计数器组件 */}
      <section className="counter-section">
        <h2>计数器演示</h2>
        <div className="counter-display">
          <p className="count-value">{count}</p>
          <p className="count-label">当前计数</p>
        </div>

        <div className="button-group">
          <button onClick={decrement} className="btn btn-danger">
            ➖ 减少
          </button>
          <button onClick={reset} className="btn btn-secondary">
            🔄 重置
          </button>
          <button onClick={increment} className="btn btn-success">
            ➕ 增加
          </button>
        </div>
      </section>

      {/* 条件渲染示例 */}
      <section className="status-section">
        <h3>状态反馈</h3>
        {count > 10 && (
          <p className="alert alert-warning">⚠️ 计数已超过 10</p>
        )}
        {count === 0 && (
          <p className="alert alert-info">ℹ️ 计数已重置为 0</p>
        )}
        {count < 0 && (
          <p className="alert alert-danger">❌ 计数为负数！</p>
        )}
      </section>

      <footer>
        <p>💡 提示：点击按钮改变计数，观察 UI 的实时更新。</p>
      </footer>
    </div>
  );
}

export default App;
```

保存文件后，浏览器会自动热更新（Hot Module Replacement）。你应该能看到你的应用！

---

## 步骤 4：添加样式（3 分钟）

打开 `src/App.css`，替换为以下样式：

```css
:root {
  --primary: #3b82f6;
  --success: #10b981;
  --danger: #ef4444;
  --warning: #f59e0b;
  --secondary: #6b7280;
  --light-bg: #f3f4f6;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.app-container {
  background: white;
  border-radius: 12px;
  padding: 40px;
  max-width: 600px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideIn 0.5s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

header {
  text-align: center;
  margin-bottom: 40px;
}

header h1 {
  font-size: 32px;
  color: #1f2937;
  margin-bottom: 10px;
}

header p {
  color: #6b7280;
  font-size: 16px;
}

/* 计数器样式 */
.counter-section {
  background: var(--light-bg);
  padding: 30px;
  border-radius: 8px;
  margin-bottom: 30px;
}

.counter-section h2 {
  color: #1f2937;
  margin-bottom: 20px;
  font-size: 20px;
}

.counter-display {
  background: white;
  padding: 30px;
  border-radius: 8px;
  text-align: center;
  margin-bottom: 20px;
  border: 3px dashed var(--primary);
}

.count-value {
  font-size: 64px;
  font-weight: bold;
  color: var(--primary);
  margin: 0;
}

.count-label {
  color: #6b7280;
  font-size: 14px;
  margin-top: 10px;
}

/* 按钮组 */
.button-group {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

.btn {
  flex: 1;
  min-width: 100px;
  padding: 12px 20px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.btn:active {
  transform: translateY(0);
}

.btn-success {
  background: var(--success);
  color: white;
}

.btn-success:hover {
  background: #059669;
}

.btn-danger {
  background: var(--danger);
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
}

.btn-secondary {
  background: var(--secondary);
  color: white;
}

.btn-secondary:hover {
  background: #4b5563;
}

/* 状态反馈 */
.status-section {
  margin-bottom: 30px;
}

.status-section h3 {
  color: #1f2937;
  margin-bottom: 15px;
  font-size: 18px;
}

.alert {
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 10px;
  font-size: 14px;
  animation: slideIn 0.3s ease-out;
}

.alert-info {
  background: #dbeafe;
  color: #0c4a6e;
  border-left: 4px solid #3b82f6;
}

.alert-warning {
  background: #fef3c7;
  color: #92400e;
  border-left: 4px solid #f59e0b;
}

.alert-danger {
  background: #fee2e2;
  color: #7f1d1d;
  border-left: 4px solid #ef4444;
}

footer {
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
  color: #6b7280;
  font-size: 14px;
}
```

现在你的应用应该看起来很漂亮了！

---

## 🎯 理解发生了什么

### 1. **状态声明**
```tsx
const [count, setCount] = useState(0);
```
- `count`：当前状态值（初始值为 0）
- `setCount`：更新状态的函数
- 每次调用 `setCount` 后，组件会重新渲染，`count` 变量会拿到最新值

### 2. **事件绑定**
```tsx
<button onClick={increment}>➕ 增加</button>
```
- `onClick` 属性绑定事件处理函数
- 用户点击按钮时，React 会调用 `increment` 函数

### 3. **条件渲染**
```tsx
{count > 10 && <p>计数已超过 10</p>}
```
- 使用 `&&` 操作符进行条件渲染
- 只有当条件为真时，才会渲染后面的 JSX

### 4. **热更新**
- 修改代码后，浏览器会自动刷新应用（Fast Refresh）
- 你可以持续改进应用而无需手动刷新

---

## 🧪 尝试修改代码

现在试试这些改动，加深对 React 的理解：

### 挑战 1：改变初始值
修改这一行：
```tsx
const [count, setCount] = useState(0);  // 改成 10
```

### 挑战 2：添加新按钮
在 `.button-group` 中添加一个新按钮：
```tsx
<button onClick={() => setCount(count + 10)} className="btn btn-primary">
  ➕➕ 加 10
</button>
```

### 挑战 3：添加更多条件反馈
在 `.status-section` 中添加：
```tsx
{count % 2 === 0 && (
  <p className="alert alert-success">✅ 当前是偶数！</p>
)}
```

---

## 📚 下一步学习

完成这个快速开始后，建议按以下顺序继续学习：

1. **[React 核心哲学](0-philosophy.md)**：理解 React 设计的本质
2. **[JSX 语法与规范](2-jsx-syntax.md)**：掌握 JSX 的规则与最佳实践
3. **[组件与 Props](3-components-props.md)**：学习组件间的数据传递
4. **[State 与事件处理](4-state-events.md)**：深入理解状态管理

---

## 💡 常见问题

### Q: 为什么修改代码后浏览器自动刷新了？
**A:** 这叫 Hot Module Replacement (HMR)。Vite 的一个强大特性，可以在保留应用状态的情况下实时更新代码。

### Q: useState 的 `count + 1` 为什么有时候只增加 1？
**A:** 这是一个常见的陷阱。如果你在一个事件处理函数中多次调用 `setCount(count + 1)`，React 会将多个状态更新合并（批处理）。详见 [State 与事件处理](4-state-events.md)。

### Q: 如何构建生产版本？
**A:** 运行 `npm run build`，产物会在 `dist/` 目录下。

### Q: 如何部署我的应用？
**A:** 你可以将 `dist/` 目录部署到任何静态服务（如 Netlify、Vercel、GitHub Pages）。

---

## 🎉 恭喜！

你已经完成了 React 的快速开始！你现在已经理解了：
- ✅ 如何创建 React 项目
- ✅ 如何编写组件与使用 JSX
- ✅ 如何用 `useState` 管理状态
- ✅ 如何处理事件与条件渲染
- ✅ 如何添加样式让应用更美观

现在你可以开始深入学习各个概念，或者尝试扩展这个应用，添加更多功能。加油！ 🚀
