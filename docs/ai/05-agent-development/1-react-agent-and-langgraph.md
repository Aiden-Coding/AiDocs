---
id: 1-react-agent-and-langgraph
title: ReAct 范式与 LangGraph 智能体工作流
sidebar_position: 2
---

# ReAct 范式与 LangGraph 智能体工作流

AI Agent（智能体）打破了单一 Prompt 对话的局限，使其能够自主推理、规划并调用外部 API 与代码工具解决复杂任务。

---

## 1. ReAct (Reasoning + Acting) 运行机制

ReAct 范式通过交替执行 **Thought（思考）**、**Action（行动）** 和 **Observation（观察）** 来达成目标：

```text
User Task: 查找并对比 Apple 和 Microsoft 最新季度的财报营收。

Thought 1: 我需要先获取 Apple 最新的季度财报营收数据。
Action 1: GoogleSearch("Apple latest quarter financial results revenue")
Observation 1: Apple 报告季度营收为 1195.8 亿美元。

Thought 2: 现在我需要获取 Microsoft 最新的季度财报营收数据。
Action 2: GoogleSearch("Microsoft latest quarter financial results revenue")
Observation 2: Microsoft 报告季度营收为 620.2 亿美元。

Thought 3: 我已获得两家公司的数据，现在可以进行对比并回复用户。
Final Answer: Apple 最新季度营收为 1195.8 亿美元，Microsoft 为 620.2 亿美元，Apple 高出约 575.6 亿美元。
```

---

## 2. LangGraph 状态图工作流

LangGraph 是基于有向图（Graph）构建多 Agent 与复杂状态机工作流的现代化框架。

```mermaid
graph TD
    Start([Start 入口]) --> Agent[Agent 节点: 思考与决定]
    Agent --> Condition{是否有 Tool Call?}
    Condition -->|Yes| Tools[Tools 节点: 执行工具]
    Tools --> Agent
    Condition -->|No| End([End 结束])
```

---

## 3. Python + LangGraph 手写 Agent 示例

```python
from typing import Annotated, TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langgraph.prebuilt import ToolNode, tools_condition

# 1. 定义状态类型
class State(TypedDict):
    messages: Annotated[list, add_messages]

# 2. 定义可供 Agent 调用的工具
@tool
def calculate(expression: str) -> str:
    """计算数学表达式的结果。"""
    try:
        return str(eval(expression))
    except Exception as e:
        return f"Error: {e}"

tools = [calculate]
tool_node = ToolNode(tools)

# 3. 初始化绑定 Tool 的大模型
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0).bind_tools(tools)

def chatbot_node(state: State):
    return {"messages": [llm.invoke(state["messages"])]}

# 4. 构建 LangGraph 图
builder = StateGraph(State)
builder.add_node("chatbot", chatbot_node)
builder.add_node("tools", tool_node)

builder.add_edge(START, "chatbot")
builder.add_conditional_edges("chatbot", tools_condition) # 自动判断是否走 tools 节点
builder.add_edge("tools", "chatbot") # 工具返回后重新进入 agent 节点

graph = builder.compile()

# 5. 调用执行
response = graph.invoke({"messages": [("user", "请问 123 * 456 等于多少？")]})
for msg in response["messages"]:
    print(f"[{msg.type}]: {msg.content}")
```
