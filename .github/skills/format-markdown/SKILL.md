---
name: format-markdown
description: "Format and lint Markdown files to ensure compliance with standard markdownlint rules (e.g., MD022, MD031, MD032, MD056, MD026). Use when: formatting markdown documents, fixing markdown lint errors, ensuring proper spacing around headings, lists, and code blocks, correcting table column counts, or removing trailing punctuation from headings."
argument-hint: '[file-path]'
user-invocable: true
disable-model-invocation: false
---

# Markdown 格式化与 Lint 修复指南

本 Skill 旨在提供一套标准化的 Markdown 格式化与 Lint 错误修复流程，确保文档排版美观、结构清晰，并符合主流 Markdown 校验规则（如 Markdownlint）。

## 常见 Markdown 规范与修复方案

### 1. 标题前后空行 (MD022 / blanks-around-headings)

- **规则**：所有标题（`#` 到 `######`）的上方和下方必须各有一个空行。
- **修复示例**：

  ```markdown
  <!-- 错误 -->
  ## 标题
  列表内容

  <!-- 正确 -->
  ## 标题

  列表内容
  ```

### 2. 列表前后空行 (MD032 / blanks-around-lists)

- **规则**：无序列表（`-`、`*`）和有序列表（`1.`）的前后必须有空行，不能与普通文本或标题紧挨着。
- **修复示例**：

  ```markdown
  <!-- 错误 -->
  普通文本
  - 列表项 1
  - 列表项 2
  普通文本

  <!-- 正确 -->
  普通文本

  - 列表项 1
  - 列表项 2

  普通文本
  ```

### 3. 代码块前后空行 (MD031 / blanks-around-fences)

- **规则**：使用三个反引号（```）包裹的代码块前后必须有空行。
- **修复示例**：

  ````markdown
  <!-- 错误 -->
  普通文本
  ```java
  System.out.println("Hello");
  ```
  普通文本

  <!-- 正确 -->
  普通文本

  ```java
  System.out.println("Hello");
  ```

  普通文本
  ````

### 4. 表格列数一致性 (MD056 / table-column-count)

- **规则**：Markdown 表格的每一行（包括表头、分割线和数据行）的列数（即 `|` 的数量）必须完全一致。
- **修复示例**：

  ```markdown
  <!-- 错误 (第二行和第三行少了一个列) -->
  | 锁状态 | 25bit | 31bit | 1bit | 4bit | 1bit | 2bit |
  | :--- | :--- | :--- | :--- | :--- | :--- |
  | **无锁** | 未使用 | hashCode | | 分代年龄 | 0 | 01 |

  <!-- 正确 -->
  | 锁状态 | 25bit | 31bit | 1bit | 4bit | 1bit | 2bit |
  | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
  | **无锁** | 未使用 | hashCode | | 分代年龄 | 0 | 01 |
  ```

### 5. 标题末尾标点符号 (MD026 / no-trailing-punctuation)

- **规则**：标题末尾不应包含不必要的标点符号（如中文冒号 `：`、英文冒号 `:`、问号、感叹号等）。
- **修复示例**：

  ```markdown
  <!-- 错误 -->
  ## 核心源码：

  <!-- 正确 -->
  ## 核心源码
  ```

---

## 格式化操作步骤

当需要格式化或修复某个 Markdown 文件时，请遵循以下步骤：

1. **定位文件**：获取需要格式化的 Markdown 文件路径。
2. **逐项检查**：
   - 检查所有标题，确保其上下均有且仅有一个空行，且末尾无中文/英文冒号。
   - 检查所有列表（有序/无序），确保其前后有空行。
   - 检查所有代码块，确保其前后有空行。
   - 检查所有表格，确保每一行的 `|` 数量完全一致。
3. **应用修改**：使用 `replace_string_in_file` 工具对不符合规范的区域进行精准替换。
4. **验证结果**：运行 `get_errors` 工具，确保该 Markdown 文件中不再包含相关的 Lint 编译错误。
