---
name: check-mermaid
description: "Check and validate Mermaid diagram syntax in Markdown/MDX files for accuracy and Docusaurus/MDX rendering compatibility. Use when: validating mermaid code blocks, fixing mermaid syntax errors, troubleshooting unrendered mermaid diagrams, or checking for MDX curly brace/bracket conflicts inside mermaid blocks."
argument-hint: '[file-path]'
user-invocable: true
disable-model-invocation: false
---

# Mermaid 图表语法与 MDX 兼容性校验指南

本 Skill 旨在提供一套标准化的 Markdown / MDX 中 Mermaid 架构图表格式与语法校验流程，确保图表正常渲染且不触发 Docusaurus / MDX 编译崩溃。

## 常见 Mermaid 语法错误与修复方案

### 1. 节点文本特殊字符未加双引号

- **规则**：当节点文本中包含圆括号 `()`、方括号 `[]`、花括号 `{}`、中文标点或特殊符号时，节点文本必须使用双引号 `"` 包裹。
- **修复示例**：

  ```markdown
  <!-- 错误：括号导致语法解析失败 -->
  A[处理数据 (步骤一)] --> B{检查状态 (是否有效)}

  <!-- 正确 -->
  A["处理数据 (步骤一)"] --> B{"检查状态 (是否有效)"}
  ```

### 2. MDX 表达式冲突 (大括号与尖括号)

- **规则**：在 Docusaurus MDX 环境中，未加引号的花括号 `{}` 会被解析为 JS 表达式，尖括号 `<>` 会被解析为 JSX 标签。在 Mermaid 节点文本中必须使用双引号包裹，或使用 HTML 实体（如 `&lt;` 与 `&gt;`）。
- **修复示例**：

  ```markdown
  <!-- 错误：MDX 将 {key: value} 解析为 JS 语法导致编译报错 -->
  A[Payload {id: 101}] --> B[List<User>]

  <!-- 正确：双引号包裹 -->
  A["Payload {id: 101}"] --> B["List<User>"]
  ```

### 3. 时序图 (sequenceDiagram) 箭头语法错误

- **规则**：时序图中的箭头语法与流程图不同。时序图合法箭头为 `->>`、`-->>`、`->`、`-->`、`-x`、`--x`，不能混用流程图的 `==>` 或 `--|text|-->`。
- **修复示例**：

  ```markdown
  <!-- 错误：时序图使用了流程图箭头 -->
  sequenceDiagram
      Client==>Server: Request
      Server--|200 OK|-->Client: Response

  <!-- 正确 -->
  sequenceDiagram
      Client->>Server: Request
      Server-->>Client: 200 OK
  ```

### 4. 缺少 end 闭合标签

- **规则**：流程图中的 `subgraph` 以及时序图中的 `rect`、`alt`、`opt`、`loop` 必须有对应的 `end` 匹配闭合。
- **修复示例**：

  ```markdown
  <!-- 错误：subgraph 缺少 end -->
  subgraph 数据库集群
      A[(MySQL Primary)]
      B[(MySQL Secondary)]

  <!-- 正确 -->
  subgraph 数据库集群
      A[(MySQL Primary)]
      B[(MySQL Secondary)]
  end
  ```

### 5. 代码块前后空行与语言标识 (MD031 规范)

- **规则**：Mermaid 代码块前后必须留有且仅有一个空行，且必须显式声明编程语言标识 ```mermaid。
- **修复示例**：

  ````markdown
  <!-- 错误：前后紧挨文本 -->
  前文说明
  ```mermaid
  graph TD
      A --> B
  ```
  后文说明

  <!-- 正确 -->
  前文说明

  ```mermaid
  graph TD
      A --> B
  ```

  后文说明
  ````

---

## 检查与修复流程

当需要检查某个 Markdown / MDX 文件中的 Mermaid 图表时，请遵循以下步骤：

1. **定位代码块**：搜索目标文件中的所有 ` ```mermaid ` 代码块。
2. **逐项校验**：
   - 检查图表声明（如 `graph TD`、`flowchart LR`、`sequenceDiagram` 等）拼写是否正确。
   - 检查所有节点文本是否包含括号、花括号或中文标点，确保已添加双引号。
   - 检查 `subgraph` / `alt` / `loop` 是否拥有匹配的 `end`。
   - 检查代码块前后是否留有空行。
3. **精准修复**：使用 `replace_file_content` 工具修复问题。
4. **编译验证**：运行 `npm run typecheck` 或 `npm run build` 验证文档编译无报错。
