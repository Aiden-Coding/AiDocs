---
sidebar_position: 1
---

# Virtual DOM 与 Diff 算法

Virtual DOM 是 React 高性能的核心基石之一。通过在内存中维护一棵轻量级的 JavaScript 对象树，React 能够高效地计算出最小化的 DOM 变更集，避免昂贵的直接 DOM 操作。

---

## 1. Virtual DOM 的设计动机

### 直接操作 DOM 的性能瓶颈

浏览器的 DOM 是一个非常庞大的对象模型。直接、频繁地操作真实 DOM 节点可能会带来以下性能损耗：
- **重排 (Reflow)**：元素的几何属性（尺寸、边距、布局方式等）改变，浏览器必须重新计算元素的绝对位置。
- **重绘 (Repaint)**：视觉外观（如背景色、字体颜色等）改变，浏览器必须将像素重新涂抹到屏幕上。

### Virtual DOM 的优势

1. **批量更新 (Batching)**：React 在一个事件循环内收集所有的状态修改，只在最后一次性渲染出最新的 DOM。
2. **最小化 Diff**：通过高效的 Diff 算法计算出最小变更集，仅修改被改动的属性或节点。
3. **跨平台抽象**：Virtual DOM 作为中间描述层，可以脱离浏览器渲染到 Native（React Native）、桌面端（Electron）或 Canvas。

---

## 2. React 的 $O(n)$ 复杂度 Diff 策略

在数学理论中，对两棵树进行完全比对以寻找最小编辑距离的通用算法复杂度为 $O(n^3)$。对于拥有 1000 个节点的网页，需要进行多达 10 亿次比较，这是浏览器完全无法承受的。

React 提出了三大假设，成功将 Diff 复杂度降低到了极优的 **$O(n)$**：

### 策略 1：树分层比较 (Tree Level Comparison)

React 只会对新旧两棵树的**同层级节点进行横向比对**，忽略任何跨层级移动节点的比对需求。

```text
  [层级 0]            div                           div
                       │                             │
  [层级 1]            ul                             p
```

- **处理方式**：如果一个节点在 WIP 树中被移动到了其他层级，React 不会尝试复用它，而是直接销毁旧节点及其所有子节点，在新的地方创建全新的 DOM 树。

### 策略 2：组件类型判断 (Component Type Check)

如果两个比对节点的类型（Type）不同，React 会将它们标记为完全不同的子树，直接执行卸载（Unmount）和重新挂载（Mount）流程。

- **处理方式**：当一个组件从 `<Counter>` 变为 `<Info>` 时，即使它们的结构极其相似，React 也会销毁 `<Counter>` 的 DOM 并重新渲染 `<Info>`。

### 策略 3：Key 属性列表比对 (Element Level Diff)

对于处于同一层级、拥有相同类型的一组兄弟元素（如 `<li>` 列表），开发者必须通过提供唯一且稳定的 `key` 属性，来帮助 React 精准识别哪些元素发生了移动、新增或删除。

---

## 3. 单节点 Diff (Single Child Reconciliation)

当新节点树的子代只包含一个元素时，React 会执行单节点 Diff。其主要比对代码逻辑如下：

1. 遍历旧子节点列表，比较 `key`。
2. 如果 `key` 相同，进一步比对 `type`（节点标签名或组件函数）。
   - 如果 `type` 也相同，复用当前旧 Fiber 节点，并销毁剩余未匹配的旧节点。
   - 如果 `type` 不同，说明节点不能复用，标记销毁该节点，继续向下查找（若是多节点变单节点），或者彻底重新创建。
3. 如果 `key` 不同，则直接标记该旧子节点销毁，并继续比对下一个旧子节点。

```tsx
// 💡 模拟单节点 Diff 比对流程
function reconcileSingleElement(returnFiber, currentFirstChild, element) {
  let child = currentFirstChild;
  while (child !== null) {
    if (child.key === element.key) {
      if (child.type === element.type) {
        // key 和 type 都匹配，成功复用！
        deleteRemainingChildren(returnFiber, child.sibling);
        const existing = useFiber(child, element.props);
        existing.return = returnFiber;
        return existing;
      } else {
        // key 相同但 type 不同，此节点不能复用，销毁它且不可能复用后续兄弟节点了
        deleteChild(returnFiber, child);
        break;
      }
    } else {
      // key 不同，销毁单个节点，继续遍历兄弟节点寻找匹配项
      deleteChild(returnFiber, child);
    }
    child = child.sibling;
  }
  // 未匹配到，新建 Fiber 节点
  const created = createFiberFromElement(element);
  created.return = returnFiber;
  return created;
}
```

---

## 4. 多节点 Diff (Multiple Children Reconciliation)

当新子节点树包含多个元素时，由于列表项可能发生新增、移动、修改、删除，React 采用两轮遍历算法来完成 Diff。

### 第一轮遍历：寻找按顺序能直接复用的节点

- 从头开始，按索引 `i` 同时遍历新旧子节点列表。
- 比较相同索引位置处的 `key`：
  - 如果 `key` 相同，则复用该节点，继续向右比对。
  - 如果 `key` 不同，说明可能发生了节点移动，**立即跳出第一轮遍历**，保留当前比对位置。

### 第二轮遍历：处理移动、新增或删除

如果第一轮遍历因 `key` 不匹配而提早结束，React 会将剩余的旧节点全部存入一个以 `key` 为键的 Map 结构中：

```tsx
// 💡 模拟第二轮遍历（利用 Map 匹配移动节点）
function reconcileChildrenArray(returnFiber, currentFirstChild, newChildren) {
  let resultingFirstChild = null;
  let previousNewFiber = null;
  let oldFiber = currentFirstChild;
  let lastPlacedIndex = 0; // 追踪已复用节点在旧列表里的最大索引值，用于识别移动
  let newIdx = 0;

  // 1. 第一轮遍历：从左向右顺序比对
  for (; oldFiber !== null && newIdx < newChildren.length; newIdx++) {
    if (oldFiber.index > newIdx) {
      // 索引错位，说明第一轮结束
      break;
    }
    const newFiber = updateSlot(returnFiber, oldFiber, newChildren[newIdx]);
    if (newFiber === null) {
      break; // key 不匹配，跳出循环
    }
    lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
    if (resultingFirstChild === null) {
      resultingFirstChild = newFiber;
    } else {
      previousNewFiber.sibling = newFiber;
    }
    previousNewFiber = newFiber;
    oldFiber = oldFiber.sibling;
  }

  // 2. 第二轮遍历准备：将剩余所有未复用的旧子节点放入 Map 中
  const existingChildren = mapRemainingChildren(returnFiber, oldFiber);

  // 3. 遍历剩余的新节点，并在 Map 中寻找复用机会
  for (; newIdx < newChildren.length; newIdx++) {
    const newFiber = updateFromMap(existingChildren, returnFiber, newIdx, newChildren[newIdx]);
    if (newFiber !== null) {
      // 标记是否发生移动
      lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
      if (resultingFirstChild === null) {
        resultingFirstChild = newFiber;
      } else {
        previousNewFiber.sibling = newFiber;
      }
      previousNewFiber = newFiber;
    }
  }

  // 4. 清理阶段：将 Map 中依然残存、没有被复用到的旧节点全部标记为 Deletion（删除）
  existingChildren.forEach(child => deleteChild(returnFiber, child));

  return resultingFirstChild;
}

// 辅助函数：判断节点是否需要移动
function placeChild(newFiber, lastPlacedIndex, newIndex) {
  newFiber.index = newIndex;
  const current = newFiber.alternate;
  if (current !== null) {
    const oldIndex = current.index;
    if (oldIndex < lastPlacedIndex) {
      // 旧索引小于最大复用索引，说明该节点向右移动了，标记 Placement (DOM 移动)
      newFiber.flags |= Placement;
      return lastPlacedIndex;
    } else {
      // 旧索引大于等于最大复用索引，不需要移动该节点
      return oldIndex;
    }
  } else {
    // 新增节点，直接标记 Placement (DOM 插入)
    newFiber.flags |= Placement;
    return lastPlacedIndex;
  }
}
```

---

## 5. Key 的最佳实践

基于 Diff 算法的设计，我们可以推导出 `key` 属性的铁律：
- **同级中唯一**：同一个父级元素下的兄弟节点，`key` 必须保证绝对唯一。
- **稳定性**：`key` 在组件的整个生命周期内不能发生变化。
- **反模式 1 —— 使用 Index 作为 Key**：当发生列表排序、头部插入数据时，会直接造成错位复用，导致非受控状态错乱和严重的重渲染卡顿。
- **反模式 2 —— 使用随机数（如 Math.random()）作为 Key**：这会导致列表中的每一个节点在每次重渲染时都会被完全卸载并重新创建，彻底废除 React 的 Diff 优化，还会导致表单输入框失去焦点。
