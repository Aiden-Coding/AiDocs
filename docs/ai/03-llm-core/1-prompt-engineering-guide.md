---
id: 1-prompt-engineering-guide
title: 1. Prompt 工程全景指南
sidebar_position: 2
---

# 1. Prompt 工程全景指南

在不需要修改大模型任何权重的情况下，通过设计精准的提示词（Prompt），就能让 LLM 按照我们的预期输出高质量内容。这就是 **Prompt 工程（提示词工程）**。

---

## 🎯 1. 优质 Prompt 的四大核心要素

一个结构清晰的 Prompt 包含以下模块：

1. **角色 (Role)**：指定 AI 扮演的专家角色（如“你是一位经验丰富的 Python 架构师”）。
2. **上下文 (Context)**：提供必要的背景信息。
3. **任务指令 (Instruction)**：明确具体要做什么。
4. **输出格式 (Output Format)**：指定 JSON、Markdown 或特定格式。

---

## 💡 2. 核心进阶技巧：CoT 思维链与 Few-Shot 少样本

### 2.1 CoT (Chain-of-Thought) 思维链
当面临复杂数学逻辑或推理问题时，只需在提示词结尾加上：  
`“请一步一步思考并给出推导过程 (Let's think step by step)”`

可以让模型的推理准确率提升数倍！

```text
问：小明有 5 个苹果，吃了 2 个，又买了 3 箱（每箱 6 个），请问现在有多少个苹果？
答：请一步一步思考：
1. 初始苹果数：5
2. 吃了 2 个：5 - 2 = 3 个
3. 买了 3 箱苹果：3 * 6 = 18 个
4. 最终总数：3 + 18 = 21 个。
```

---

## 💻 3. Python OpenAI/Qwen API 调用与结构化 JSON 输出

在工程开发中，我们需要大模型返回可直接被程序解析的 JSON 字符串：

```python
from openai import OpenAI
import json

# 初始化客户端 (以 OpenAI/Qwen 兼容 API 为例)
client = OpenAI(
    api_key="YOUR_API_KEY",
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1"
)

prompt = """
请分析以下用户评论的感情倾向，并提取用户提到的产品名称。
评论: "这个新买的苹果 Mac电脑屏幕太清晰了，但是电池有点耗电快。"

请务必按以下 JSON 格式输出，不要包含任何额外的解释文字：
{
    "sentiment": "正面/负面/中性",
    "product": "产品名称",
    "pros": ["优点1"],
    "cons": ["缺点1"]
}
"""

response = client.chat.completions.create(
    model="qwen-plus",
    messages=[{"role": "user", "content": prompt}],
    temperature=0.1 # 降低随机性
)

# 提取并解析 JSON
raw_text = response.choices[0].message.content
print("模型原始输出:\n", raw_text)

try:
    result_json = json.loads(raw_text)
    print("\n成功解析 JSON 字典, 产品名:", result_json["product"])
except json.JSONDecodeError:
    print("JSON 解析失败")
```
