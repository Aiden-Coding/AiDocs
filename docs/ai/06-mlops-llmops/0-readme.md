---
id: 0-readme
title: MLOps 与 LLMOps 部署运维
sidebar_position: 1
---

# MLOps 与 LLMOps 部署运维

大模型的生产环境落地离不开高效的推理部署、资源调度、监控与安全防护（LLMOps）。

## 核心知识点

### 1. 模型推理加速与服务化

- **vLLM**：基于 **PagedAttention** 技术的极速 LLM 推理引擎，大幅提升吞吐量与显存利用率。
- **Ollama**：轻量级本地大模型运行框架，支持 GGUF 格式与开箱即用的 REST API。
- **TensorRT-LLM / TGI (Text Generation Inference)**：企业级高性能推理部署方案。

### 2. 模型量化技术 (Quantization)

- **AWQ / GPTQ**：权重量化（4-bit / 8-bit），显著降低显存开销，保持模型精度。
- **GGUF / GGML**：适用于 CPU / 混合设备上运行大模型的量化格式。

### 3. LLMOps 监控与可观测性

- **LangSmith / Phoenix / Langfuse**：LLM 链路追踪（Trace）、Prompt 版本管理与 Token 消耗监控。
- **Guardrails（安全护栏）**：提示词注入防护（Prompt Injection Guard）、敏感词过滤与内容合规校验。
