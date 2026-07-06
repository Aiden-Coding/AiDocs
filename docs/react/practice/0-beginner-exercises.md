---
sidebar_position: 1
---

# 初级练习：核心基础巩固

完成以下练习题，可以帮助你巩固 React 的核心基础知识，包括组件、Props、State、事件处理和基础 Hooks。

---

## 练习 1：个人名片组件

**目标**：创建一个可复用的个人名片组件，掌握 Props 传递和解构。

**要求**：
1. 创建 `ProfileCard` 组件，接收以下 Props：
   - `name`（姓名）
   - `title`（职位）
   - `avatarUrl`（头像地址）
   - `bio`（个人简介，可选）
2. 使用 Props 解构语法
3. 为 `bio` 设置默认值："暂无简介"

**提示代码框架**：

```tsx
interface ProfileCardProps {
  name: string;
  title: string;
  avatarUrl: string;
  bio?: string;
}

function ProfileCard({ name, title, avatarUrl, bio = '暂无简介' }: ProfileCardProps) {
  // 在这里实现你的组件
  return null;
}

// 使用示例
function App() {
  return (
    <div>
      <ProfileCard 
        name="张三" 
        title="前端工程师" 
        avatarUrl="/avatar1.jpg"
        bio="热爱编程，专注于 React 开发"
      />
      <ProfileCard 
        name="李四" 
        title="全栈工程师" 
        avatarUrl="/avatar2.jpg"
      />
    </div>
  );
}
```

---

## 练习 2：计数器增强版

**目标**：掌握 `useState` 和事件处理，理解函数式更新。

**要求**：
1. 创建一个计数器组件
2. 包含三个按钮：加 1、减 1、重置
3. 当计数值为负数时，显示红色；为正数时，显示绿色；为 0 时，显示黑色
4. 使用函数式更新确保状态正确

**提示**：

```tsx
function EnhancedCounter() {
  const [count, setCount] = useState(0);

  // 实现加减和重置逻辑
  const increment = () => {
    // 使用函数式更新
  };

  const decrement = () => {
    // 使用函数式更新
  };

  const reset = () => {
    // 重置为 0
  };

  // 根据 count 值决定颜色
  const color = count > 0 ? 'green' : count < 0 ? 'red' : 'black';

  return (
    <div>
      <h2 style={{ color }}>计数值: {count}</h2>
      {/* 添加三个按钮 */}
    </div>
  );
}
```

---

## 练习 3：待办事项列表 (Todo List)

**目标**：综合运用 State、事件处理、列表渲染和受控组件。

**要求**：
1. 用户可以在输入框中输入待办事项
2. 点击"添加"按钮或按回车键，将事项添加到列表
3. 每个待办事项旁边有"删除"按钮
4. 使用受控组件管理输入框
5. 为列表项添加唯一的 `key` 属性

**核心数据结构**：

```tsx
interface TodoItem {
  id: number;
  text: string;
}

function TodoList() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [inputValue, setInputValue] = useState('');

  const addTodo = () => {
    if (inputValue.trim() === '') return;
    
    const newTodo: TodoItem = {
      id: Date.now(), // 简单的唯一 ID 生成方式
      text: inputValue,
    };
    
    setTodos(prev => [...prev, newTodo]);
    setInputValue(''); // 清空输入框
  };

  const deleteTodo = (id: number) => {
    // 实现删除逻辑
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTodo();
    }
  };

  return (
    <div>
      <h2>我的待办事项</h2>
      <div>
        <input 
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入待办事项..."
        />
        <button onClick={addTodo}>添加</button>
      </div>
      <ul>
        {/* 在这里渲染待办事项列表 */}
      </ul>
    </div>
  );
}
```

---

## 练习 4：温度转换器

**目标**：掌握状态提升和双向数据流。

**要求**：
1. 创建摄氏度和华氏度两个输入框
2. 用户在任一输入框中输入数值，另一个输入框自动计算并显示对应温度
3. 转换公式：
   - 华氏度 = 摄氏度 × 9/5 + 32
   - 摄氏度 = (华氏度 - 32) × 5/9

**提示架构**：

```tsx
type TemperatureScale = 'celsius' | 'fahrenheit';

function TemperatureConverter() {
  const [temperature, setTemperature] = useState('');
  const [scale, setScale] = useState<TemperatureScale>('celsius');

  const handleCelsiusChange = (value: string) => {
    setTemperature(value);
    setScale('celsius');
  };

  const handleFahrenheitChange = (value: string) => {
    setTemperature(value);
    setScale('fahrenheit');
  };

  // 计算摄氏度值
  const celsius = scale === 'fahrenheit' 
    ? ((parseFloat(temperature) - 32) * 5 / 9).toFixed(2)
    : temperature;

  // 计算华氏度值
  const fahrenheit = scale === 'celsius'
    ? (parseFloat(temperature) * 9 / 5 + 32).toFixed(2)
    : temperature;

  return (
    <div>
      <TemperatureInput 
        scale="celsius" 
        temperature={celsius}
        onChange={handleCelsiusChange}
      />
      <TemperatureInput 
        scale="fahrenheit" 
        temperature={fahrenheit}
        onChange={handleFahrenheitChange}
      />
    </div>
  );
}

function TemperatureInput({ 
  scale, 
  temperature, 
  onChange 
}: { 
  scale: TemperatureScale; 
  temperature: string;
  onChange: (value: string) => void;
}) {
  const scaleNames = {
    celsius: '摄氏度 (°C)',
    fahrenheit: '华氏度 (°F)',
  };

  return (
    <fieldset>
      <legend>{scaleNames[scale]}</legend>
      <input 
        type="number"
        value={temperature}
        onChange={(e) => onChange(e.target.value)}
      />
    </fieldset>
  );
}
```

---

## 练习 5：useEffect 实战 - 文档标题更新

**目标**：掌握 `useEffect` 的基本使用和清理函数。

**要求**：
1. 创建一个计数器组件
2. 使用 `useEffect` 在每次 count 变化时，更新浏览器标签页的标题为 "Count: X"
3. 组件卸载时，恢复标题为原始值

```tsx
function DocumentTitleCounter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // 保存原始标题
    const originalTitle = document.title;
    
    // 更新标题
    document.title = `Count: ${count}`;

    // 清理函数：组件卸载时恢复原标题
    return () => {
      document.title = originalTitle;
    };
  }, [count]); // 依赖项：当 count 变化时重新执行

  return (
    <div>
      <p>当前计数: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>增加</button>
    </div>
  );
}
```

---

## 练习 6：useRef 实战 - 自动聚焦

**目标**：掌握 `useRef` 操作 DOM 元素。

**要求**：
1. 创建一个包含输入框和按钮的搜索组件
2. 组件挂载时，输入框自动获得焦点
3. 点击"重新聚焦"按钮时，输入框再次获得焦点

```tsx
function AutoFocusSearch() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    // 组件挂载时自动聚焦
    inputRef.current?.focus();
  }, []);

  const handleRefocus = () => {
    // 手动聚焦
    inputRef.current?.focus();
  };

  return (
    <div>
      <input 
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜索..."
      />
      <button onClick={handleRefocus}>重新聚焦</button>
      <p>搜索内容: {query}</p>
    </div>
  );
}
```

---

## 挑战练习：表单验证

**目标**：综合运用多个 State、事件处理和条件渲染。

**要求**：
1. 创建注册表单，包含用户名、邮箱、密码三个字段
2. 实时验证规则：
   - 用户名：至少 3 个字符
   - 邮箱：必须包含 @
   - 密码：至少 6 个字符
3. 只有所有字段通过验证，"提交"按钮才可点击
4. 显示实时错误提示

```tsx
interface FormData {
  username: string;
  email: string;
  password: string;
}

interface FormErrors {
  username?: string;
  email?: string;
  password?: string;
}

function RegistrationForm() {
  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const validateField = (name: keyof FormData, value: string): string | undefined => {
    switch (name) {
      case 'username':
        return value.length < 3 ? '用户名至少 3 个字符' : undefined;
      case 'email':
        return !value.includes('@') ? '邮箱格式不正确' : undefined;
      case 'password':
        return value.length < 6 ? '密码至少 6 个字符' : undefined;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // 实时验证
    const error = validateField(name as keyof FormData, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const isFormValid = () => {
    return (
      formData.username.length >= 3 &&
      formData.email.includes('@') &&
      formData.password.length >= 6 &&
      Object.values(errors).every(err => !err)
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormValid()) {
      alert('注册成功！');
      console.log('表单数据:', formData);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>用户名:</label>
        <input 
          type="text"
          name="username"
          value={formData.username}
          onChange={handleChange}
        />
        {errors.username && <span style={{ color: 'red' }}>{errors.username}</span>}
      </div>
      
      <div>
        <label>邮箱:</label>
        <input 
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
        />
        {errors.email && <span style={{ color: 'red' }}>{errors.email}</span>}
      </div>
      
      <div>
        <label>密码:</label>
        <input 
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
        />
        {errors.password && <span style={{ color: 'red' }}>{errors.password}</span>}
      </div>
      
      <button type="submit" disabled={!isFormValid()}>
        注册
      </button>
    </form>
  );
}
```

---

## 学习建议

1. **逐题实现**：不要急于查看答案，先尝试自己实现
2. **类型安全**：在真实项目中使用 TypeScript 确保类型安全
3. **代码复用**：思考如何将重复的逻辑提取为自定义组件或 Hook
4. **调试技巧**：善用 `console.log` 和 React DevTools 观察状态变化
5. **性能意识**：即使在初级阶段，也要思考是否有不必要的重渲染

完成这些练习后，你将具备扎实的 React 基础，可以开始挑战中级练习和真实项目！

---

## 📋 完整参考解答

### 练习 1：个人名片组件 - 完整解答

```tsx
interface ProfileCardProps {
  name: string;
  title: string;
  avatarUrl: string;
  bio?: string;
}

function ProfileCard({ name, title, avatarUrl, bio = '暂无简介' }: ProfileCardProps) {
  return (
    <div style={styles.card}>
      <img src={avatarUrl} alt={name} style={styles.avatar} />
      <h3 style={styles.name}>{name}</h3>
      <p style={styles.title}>{title}</p>
      <p style={styles.bio}>{bio}</p>
    </div>
  );
}

const styles = {
  card: {
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center' as const,
    maxWidth: '300px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  avatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    objectFit: 'cover' as const,
    marginBottom: '10px',
  },
  name: {
    margin: '10px 0',
    fontSize: '18px',
  },
  title: {
    color: '#666',
    fontSize: '14px',
    margin: '5px 0',
  },
  bio: {
    color: '#999',
    fontSize: '13px',
    fontStyle: 'italic',
  },
};

export default ProfileCard;
```

### 练习 2：计数器增强版 - 完整解答

```tsx
import { useState } from 'react';

function EnhancedCounter() {
  const [count, setCount] = useState(0);

  const increment = () => {
    setCount(prev => prev + 1);
  };

  const decrement = () => {
    setCount(prev => prev - 1);
  };

  const reset = () => {
    setCount(0);
  };

  const getColor = (value: number): string => {
    if (value > 0) return 'green';
    if (value < 0) return 'red';
    return 'black';
  };

  const color = getColor(count);

  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <h1 style={{ color, fontSize: '48px' }}>{count}</h1>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button onClick={decrement} style={buttonStyle}>减 1</button>
        <button onClick={reset} style={buttonStyle}>重置</button>
        <button onClick={increment} style={buttonStyle}>加 1</button>
      </div>
      <p style={{ marginTop: '20px', color: '#666' }}>
        当前状态：
        {count > 0 ? '✨ 正数' : count < 0 ? '❄️ 负数' : '😐 零'}
      </p>
    </div>
  );
}

const buttonStyle = {
  padding: '10px 20px',
  fontSize: '16px',
  cursor: 'pointer',
  borderRadius: '4px',
  border: 'none',
  backgroundColor: '#3b82f6',
  color: 'white',
};

export default EnhancedCounter;
```

### 练习 3：待办事项列表 - 完整解答

```tsx
import { useState } from 'react';

interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
}

function TodoList() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [inputValue, setInputValue] = useState('');

  const addTodo = () => {
    if (inputValue.trim() === '') {
      alert('请输入待办事项');
      return;
    }

    const newTodo: TodoItem = {
      id: Date.now(),
      text: inputValue,
      completed: false,
    };

    setTodos(prev => [...prev, newTodo]);
    setInputValue('');
  };

  const deleteTodo = (id: number) => {
    setTodos(prev => prev.filter(todo => todo.id !== id));
  };

  const toggleTodo = (id: number) => {
    setTodos(prev =>
      prev.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTodo();
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px' }}>
      <h2>📝 我的待办事项</h2>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入待办事项..."
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid #ddd',
          }}
        />
        <button
          onClick={addTodo}
          style={{
            padding: '10px 20px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          添加
        </button>
      </div>

      {todos.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#999' }}>暂无待办事项</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {todos.map(todo => (
            <li
              key={todo.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px',
                borderBottom: '1px solid #eee',
              }}
            >
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => toggleTodo(todo.id)}
                style={{ marginRight: '10px', cursor: 'pointer' }}
              />
              <span
                style={{
                  flex: 1,
                  textDecoration: todo.completed ? 'line-through' : 'none',
                  color: todo.completed ? '#999' : '#333',
                }}
              >
                {todo.text}
              </span>
              <button
                onClick={() => deleteTodo(todo.id)}
                style={{
                  padding: '5px 10px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                删除
              </button>
            </li>
          ))}
        </ul>
      )}

      <p style={{ marginTop: '20px', color: '#666', fontSize: '14px' }}>
        总计：{todos.length} 项 | 已完成：{todos.filter(t => t.completed).length} 项
      </p>
    </div>
  );
}

export default TodoList;
```

### 练习 4：温度转换器 - 完整解答

```tsx
import { useState } from 'react';

type TemperatureScale = 'celsius' | 'fahrenheit';

function TemperatureConverter() {
  const [temperature, setTemperature] = useState('');
  const [scale, setScale] = useState<TemperatureScale>('celsius');

  const handleCelsiusChange = (value: string) => {
    setTemperature(value);
    setScale('celsius');
  };

  const handleFahrenheitChange = (value: string) => {
    setTemperature(value);
    setScale('fahrenheit');
  };

  const celsius =
    scale === 'fahrenheit'
      ? ((parseFloat(temperature) - 32) * (5 / 9)).toFixed(2)
      : temperature;

  const fahrenheit =
    scale === 'celsius'
      ? (parseFloat(temperature) * (9 / 5) + 32).toFixed(2)
      : temperature;

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '20px' }}>
      <h2>🌡️ 温度转换器</h2>
      
      <TemperatureInput
        scale="celsius"
        label="摄氏度 (°C)"
        value={celsius}
        onChange={handleCelsiusChange}
      />
      
      <p style={{ textAlign: 'center', margin: '20px 0' }}>⇅</p>
      
      <TemperatureInput
        scale="fahrenheit"
        label="华氏度 (°F)"
        value={fahrenheit}
        onChange={handleFahrenheitChange}
      />

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f0f9ff', borderRadius: '4px' }}>
        <p><strong>转换公式：</strong></p>
        <p>°F = °C × 9/5 + 32</p>
        <p>°C = (°F - 32) × 5/9</p>
      </div>
    </div>
  );
}

function TemperatureInput({
  scale,
  label,
  value,
  onChange,
}: {
  scale: TemperatureScale;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '10px',
          borderRadius: '4px',
          border: '1px solid #ddd',
          fontSize: '16px',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

export default TemperatureConverter;
```

### 练习 5：useEffect 实战 - 完整解答

```tsx
import { useState, useEffect } from 'react';

function DocumentTitleCounter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // 保存原始标题
    const originalTitle = document.title;

    // 更新标题
    document.title = `Count: ${count} - React App`;

    // 清理函数：组件卸载时恢复原标题
    return () => {
      document.title = originalTitle;
    };
  }, [count]); // 依赖项：当 count 变化时重新执行

  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <h2>📊 文档标题计数器</h2>
      <p style={{ fontSize: '24px', margin: '20px 0' }}>当前计数: {count}</p>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button
          onClick={() => setCount(c => c + 1)}
          style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
        >
          增加
        </button>
        <button
          onClick={() => setCount(c => c - 1)}
          style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
        >
          减少
        </button>
        <button
          onClick={() => setCount(0)}
          style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
        >
          重置
        </button>
      </div>
      <p style={{ marginTop: '20px', color: '#666', fontSize: '14px' }}>
        💡 提示：查看浏览器标签页标题，它会随着计数变化
      </p>
    </div>
  );
}

export default DocumentTitleCounter;
```

### 练习 6：useRef 实战 - 完整解答

```tsx
import { useState, useRef, useEffect } from 'react';

function AutoFocusSearch() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);

  // 组件挂载时自动聚焦
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = () => {
    if (query.trim()) {
      // 模拟搜索结果
      const mockResults = [
        `搜索结果 1: "${query}"`,
        `搜索结果 2: "${query}"`,
        `搜索结果 3: "${query}"`,
      ];
      setSearchResults(mockResults);
    }
  };

  const handleRefocus = () => {
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '20px' }}>
      <h2>🔍 自动聚焦搜索</h2>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="搜索..."
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid #ddd',
          }}
        />
        <button
          onClick={handleSearch}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          搜索
        </button>
      </div>

      <button
        onClick={handleRefocus}
        style={{
          padding: '8px 16px',
          backgroundColor: '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginBottom: '20px',
        }}
      >
        重新聚焦输入框
      </button>

      {searchResults.length > 0 && (
        <div>
          <h3>搜索结果：</h3>
          <ul>
            {searchResults.map((result, index) => (
              <li key={index}>{result}</li>
            ))}
          </ul>
        </div>
      )}

      <p style={{ marginTop: '20px', color: '#666', fontSize: '14px' }}>
        💡 提示：组件加载时输入框会自动获得焦点
      </p>
    </div>
  );
}

export default AutoFocusSearch;
```

---

## 🎯 练习完成检查清单

完成每个练习后，检查以下几点：

- [ ] 代码能正常运行，没有 console 错误
- [ ] 使用了 TypeScript 类型注解
- [ ] Props 通过解构获取
- [ ] State 使用函数式更新
- [ ] 列表渲染使用了唯一的 key
- [ ] 事件处理器正确绑定
- [ ] 受控组件同时有 value 和 onChange
- [ ] useEffect 有依赖项数组
- [ ] useRef 正确操作 DOM

---

## 学习建议
