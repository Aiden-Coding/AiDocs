---
sidebar_position: 1
---

# React 核心哲学

## 1. 声明式 UI 与组件化

React 的核心哲学在于**声明式编程 (Declarative Programming)** 和**组件化驱动 (Component-Driven)**。

- **指令式 (Imperative)**: 告诉计算机*怎么做* (如直接操作 DOM API `document.createElement`)。
- **声明式 (Declarative)**: 告诉计算机*想要什么* (如提供目标的 UI 状态，框架来负责怎么将其推送到 DOM `<div>React</div>`)。

## 2. 单向数据流 (One-Way Data Flow)

在 React 中，数据永远只能由父组件流向子组件 (通过 Props)。子组件绝不能直接修改父组件的 Props，而是通过父组件传递下来的 Callback 回调函数来触发状态改变。

## 3. UI 状态机的映射公式

React 的底层思维可以用一个简单的数学公式来表示:

$$
UI = f(state)
$$

只要**状态 (state)** 确立，**视图 (UI)** 就是确定的。开发者不再需要手工管理冗杂复杂的 DOM 状态，只需要维护干净的 JSON / 对象状态即可。
