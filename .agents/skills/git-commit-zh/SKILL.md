---
name: git-commit-zh
description: 'Generate structured, professional Git commit messages in Chinese using Conventional Commits format. Use when user wants to write a commit, commit message, or asks to generate a Chinese commit prefix.'
---

# Git 中文提交规范生成器 (git-commit-zh)

本 Skill 用于根据当前的代码变更（Diff）或用户描述，生成符合 **约定式提交规范 (Conventional Commits)** 且**主要说明、Body 部分完全使用中文**的高质量 Git 提交消息。

## 适用场景

- 当需要为当前修改生成一个规范的中文 Commit 消息时。
- 通过命令行调用或在 Chat 窗口输入 `/git-commit-zh`。

## 提交流程与规范

### 1. 结构化格式

每个 Commit 消息必须包含一个**主标题（Subject）**，并且可以根据复杂度选填**正文（Body）**和**脚注（Footer）**。整体格式如下：

```text
<type>(<scope>): <中文主标题（50字内）>

<中文正文：详细解释为什么做这个变更（如有必要）>

<脚注：如关联 Issue、BREAKING CHANGE 声明（如有必要）>
```

### 2. 核心元素定义

#### 类型 (Type) — 必须使用英文半角控制
- **`feat`**：引入新功能（Features）。
- **`fix`**：修复漏洞（Bug fixes）。
- **`docs`**：仅修改文档（Documentation）。
- **`style`**：仅修改代码格式（不影响代码逻辑的空格、分号等样式变更）。
- **`refactor`**：代码重构（既不修复 bug 也不增加新功能的代码更改）。
- **`perf`**：提升性能的代码更改（Performance）。
- **`test`**：增加缺失的测试或修正现有的测试（Testing）。
- **`build`**：影响构建系统或外部依赖关系的更改（如 npm、maven、cmake 等）。
- **`ci`**：修改 CI 配置文件和脚本。
- **`chore`**：其他不修改 src 或测试文件的琐碎更改。
- **`revert`**：撤销之前的某次提交。

#### 作用域 (Scope) — 选填，使用英文
关联的具体模块名。例如：`feat(auth)`、`fix(parser)`。

#### 主标题 (Subject) — 必须使用中文
- 动词开头，简明扼要（如：`新增 用户登录拦截器`，而不是 `我做了一个登录拦截功能`）。
- 50字内，结尾绝对不要加句号。

#### 正文 (Body) — 使用中文（可省）
- 简短一两句无法说清**“为什么”**时必填，详细描述变更原因及改动点。
- 每行控制在 72 字符内换行。
- 列表项符号统一使用 `-`，不用 `*`。

#### 脚注 (Footer) — 选填
- 重大变更（BREAKING CHANGE）：必须以大写 `BREAKING CHANGE:` 开头，后跟中文说明。
- 关联缺陷：如 `Closes #123` 或 `相关 Issue: #456`。

---

## 编写示例

### 示例 1: 新增功能
```text
feat(auth): 新增 JWT 登录状态验证拦截器

- 拦截所有 /api/v1/private/* 路由请求，验证 Header 中的 Bearer Token。
- 验证失败时统一返回 401 状态码与中文错误 JSON。

Closes #105
```

### 示例 2: Bug 修复
```text
fix(redis): 修复高并发下连接池管道泄露引发的超时异常

在高负载瞬时连接下，连接对象未能被正常 release 归还池中，
导致其被丢弃并报 TimeoutException。通过增加 finally 块强制回收解决。
```

---

## 质量确认检查 (Checklist)

1. **Type 是否为标准英文前缀**？（只能是 `feat`/`fix`/`docs`/`refactor` 等，不准机翻成中文 `功能/修复`）。
2. **Subject 是否全部为中文**？且结尾不包含句号 `.`。
3. **Body 是否条理清晰地阐明了“为什么改”（Why）而不是仅阐明“改了什么”（What）**？
