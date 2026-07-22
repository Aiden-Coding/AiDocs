---
id: 0-readme
title: AI Agent 智能体开发实战
sidebar_position: 1
---

# AI Agent 智能体开发实战

AI Agent（智能体）是具备**感知、规划、记忆与工具执行能力**的自治系统，代表了大模型从“对话框”向“生产力工具”演进的核心形态。

## 核心知识点

### 1. Agent 核心构成四大要素

1. **Planning（规划）**：任务拆解（Subgoal Decomposition）、自我反思与批判（Self-Reflection / Reflexion）。
2. **Memory（记忆）**：
   - **短期记忆**：Context Window 上下文窗口、Conversation History。
   - **长期记忆**：结合向量数据库或外部 KV 存储持久化记忆。
3. **Tools（工具）**：搜索引擎、数据库 SQL 查询、API 调用、Python 代码解释器（Code Interpreter）。
4. **Action（执行）**：根据规划与工具调用结果做出动作响应。

### 2. 常用 Agent 范式

- **ReAct (Reason + Act)**：交替进行“思考 (Thought) -> 动作 (Action) -> 观察 (Observation)”。
- **Plan-and-Solve**：先生成完整执行步骤清单，再依次调用工具执行。

### 3. 主流开发框架

- **LangChain / LangGraph**：基于图（Graph）的循环状态控制，支持复杂条件分支与 Agent 工作流。
- **LlamaIndex**：面向数据连接与复杂 RAG + Agent 工作流。
- **AutoGen / CrewAI**：多智能体（Multi-Agent）协同框架，角色分工与团队协作机制。
