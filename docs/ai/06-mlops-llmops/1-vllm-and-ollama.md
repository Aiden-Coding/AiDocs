---
id: 1-vllm-and-ollama
title: vLLM 推理加速与 Ollama 本地部署实战
sidebar_position: 2
---

# vLLM 推理加速与 Ollama 本地部署实战

实现生产环境大模型服务的高吞吐量、低延迟响应，需要借助于专业的 LLM 推理引擎与轻量化部署体系。

---

## 1. 为什么自回归生成会卡顿？（KV Cache 与 PagedAttention）

### ❓ 什么是 KV Cache（键值缓存）？
大模型生成文字时是**自回归（Auto-Regressive）**逐字生成的。当生成第 100 个词时，如果不把前 99 个词算好的 $K$ 和 $V$ 向量缓存起来，模型就要把前 99 个词重新在 Transformer 里算一遍，计算量爆炸！

为了加速，模型把算好的 $K, V$ 张量存在 GPU 显存里，这就是 **KV Cache**。

### ❌ 传统 KV Cache 导致的显存碎片化
在传统框架（如原生 PyTorch）中，因为无法预知用户会聊多长，系统必须提前预留**一整块连续的显存**（比如预留支持 4096 Token 的空间）。
- **问题 1（显存碎片）**：如果用户只问了一句“你好”，剩下的 4000 个 Token 预留空间就被白白浪费了！
- **问题 2（并发极低）**：显存很快被“虚占用”填满，一张 24G 显卡可能只能同时服务 2~3 个并发请求。

### ⚡ PagedAttention 原理：像操作系统虚拟内存一样管理显存
vLLM 借鉴了操作系统的**分页内存（Paging）**思想，将 KV Cache 拆分为固定大小（如 16 个 Token）的**物理显存块（Block）**。

```mermaid
graph TD
    subgraph LogicalMemory [逻辑 KV Cache 序列 (用户请求)]
        L1[Block 0: 前 16 词] --> L2[Block 1: 中 16 词] --> L3[Block 2: 新 16 词]
    end

    subgraph PhysicalMemory [物理 GPU 显存块 (非连续分布)]
        P1[GPU Physical Block 12]
        P2[GPU Physical Block 3]
        P3[GPU Physical Block 87]
    end

    L1 -->|Block Table 页表映射| P2
    L2 -->|Block Table 页表映射| P1
    L3 -->|Block Table 页表映射| P3
```

- **按需动态分配**：用到多少分配多少，**显存浪费率从 60%+ 剧降到 1% 以下**。
- **高并发吞吐**：同等显存下，并发处理能力（Throughput）提升 **2 ~ 4 倍**！

---

## 2. 核心性能指标与压测评估

在工程落地时，我们主要评估以下三个指标：

| 指标 | 英文缩写 | 含义 | 优化目标 |
| :--- | :--- | :--- | :--- |
| **首字延迟** | **TTFT** (Time to First Token) | 从用户按下发送，到看见模型吐出第 1 个字的时间 | $\le 500\text{ms}$（决定用户是否觉得卡） |
| **生成速度** | **TPS** (Tokens Per Second) | 模型每秒吐出的 Token 数量 | $\ge 30 \sim 50\text{ Token/s}$ |
| **并发吞吐量** | **Throughput** | 整个系统每秒处理的所有用户 Token 总数 | 越高越省服务器成本 |

---

## 3. vLLM 部署与 OpenAI 兼容 API

> ⚠️ **运行环境要求**：vLLM 强依赖 Linux / WSL2 环境，且需要 NVIDIA GPU（建议 12G+ 显存）。如果是在 Windows 本地环境，推荐使用 WSL2。

### 3.1 启动 vLLM API 服务端

```bash
# 安装 vllm
pip install vllm

# 一键启动支持 OpenAI 协议的 API 服务器
python -m vllm.entrypoints.openai.api_server \
    --model Qwen/Qwen2.5-7B-Instruct \
    --tensor-parallel-size 1 \
    --max-model-len 8192 \
    --gpu-memory-utilization 0.9 \
    --port 8000
```

### 3.2 Python 客户端流式调用代码

```python
from openai import OpenAI

# 1. 连接 vLLM 启动的本地 API 接口
client = OpenAI(
    base_url="http://localhost:8000/v1",
    api_key="EMPTY"  # vllm 本地部署无需真实 API Key
)

# 2. 发起流式对话
print("正在等待模型吐字...\n")
response = client.chat.completions.create(
    model="Qwen/Qwen2.5-7B-Instruct",
    messages=[
        {"role": "system", "content": "你是一个严谨的 Python 技术专家。"},
        {"role": "user", "content": "请用 Python 写一个快速排序算法，并写出时间复杂度分析。"}
    ],
    stream=True  # 开启流式响应
)

# 3. 逐字打印输出 (计算首字到达)
for chunk in response:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)
print("\n\n回答生成完毕！")
```

---

## 4. Ollama 本地轻量化部署（跨平台）

如果想在 Mac、Windows 或无显卡机器上快速开箱即用，**Ollama** 是最佳选择！它将 GGUF 量化模型与运行环境打包在一起。

### 4.1 常用 CLI 命令

```bash
# 1. 运行/自动拉取模型 (如 qwen2.5)
ollama run qwen2.5:7b

# 2. 查看本地已下载的模型
ollama list

# 3. 停止模型运行，立即释放显存
ollama stop qwen2.5:7b
```

### 4.2 自定义 Modelfile 创建专属角色模型

编写 `Modelfile` 文件，定制 System Prompt 与采样参数（如 Code Reviewer）：

```dockerfile
FROM qwen2.5:7b

# 设置采样温度 (越低越严谨)
PARAMETER temperature 0.2

# 设置系统提示词
SYSTEM """
你是一个顶级的代码评审专家，请用简洁严谨的语言指出代码中的 Performance 和 Security 隐患。
"""
```

通过 Modelfile 构建自己的专属模型：

```bash
# 构建名为 code-reviewer 的新模型镜像
ollama create code-reviewer -f ./Modelfile

# 运行自定义模型
ollama run code-reviewer
```
