---
id: 0-readme
title: 大语言模型（LLM）核心与微调
sidebar_position: 1
---

# 大语言模型（LLM）核心与微调

大语言模型（Large Language Models）是当前人工智能领域的核心突破。本章涵盖 Prompt 工程、模型高效微调（PEFT）与对齐技术。

## 核心知识点

### 1. Prompt 工程（提示词艺术）

- **基础技术**：Few-Shot Prompting（少样本提示）、Chain-of-Thought（CoT 思维链）、Self-Consistency（自我一致性）。
- **高级提示技巧**：Tree-of-Thoughts (ToT)、ReAct 思考-行动模式。
- **结构化输出**：JSON Mode、Function Calling 格式约束。

### 2. LLM 高效微调 (PEFT - Parameter-Efficient Fine-Tuning)

- **全参数微调 vs 轻量微调**：算力开销对比与适用场景。
- **LoRA (Low-Rank Adaptation)**：低秩分解矩阵原理，仅训练少量附加参数。
- **QLoRA**：4-bit NF4 量化结合 LoRA，大幅降低显存占用（单卡消费级显卡微调大模型）。
- **P-Tuning / Prefix-Tuning**：软提示（Soft Prompt）微调方法。

### 3. 模型对齐与评估 (Alignment & Evaluation)

- **RLHF (Reinforcement Learning from Human Feedback)**：人类反馈强化学习（Reward Model + PPO）。
- **DPO (Direct Preference Optimization)**：直接偏好优化，无需单独训练奖励模型。
- **基准测试 (Benchmarks)**：MMLU, GSM8K, HumanEval, MT-Bench。
