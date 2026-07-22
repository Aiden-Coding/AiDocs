---
id: 1-local-llm-ollama
title: 1. Ollama 与本地大模型私有化部署
sidebar_position: 2
---

# 1. Ollama 与本地大模型私有化部署

如果不想将敏感业务数据发送给云端 API，或者希望在个人电脑上离线运行大模型，**Ollama** 是目前最好用的本地大模型管理工具（被誉为大模型界的 Docker）。

---

## 🦙 1. Ollama 核心优势

- **一键下载安装**：跨平台（macOS / Windows / Linux）极简部署。
- **开箱即用 API**：默认提供与 OpenAI 完全兼容的 RESTful HTTP 接口（`http://localhost:11434/v1`）。
- **丰富模型库**：命令行一键拉取 `qwen2.5`、`llama3.2`、`deepseek-r1` 等主流开源模型。

---

## 🚀 2. 常用 Ollama 命令行指令

```bash
# 1. 下载并运行 Qwen 2.5 0.5B 轻量模型 (终端即刻开聊)
ollama run qwen2.5:0.5b

# 2. 查看本地已下载模型列表
ollama list

# 3. 检查当前显存/内存中运行的模型
ollama ps
```

---

## 💻 3. Python 访问 Ollama 本地服务

由于 Ollama 兼容 OpenAI 协议，只需更改 `base_url` 即可无缝切换本地模型：

```python
from openai import OpenAI

# 连接本地 11434 端口的 Ollama 服务
client = OpenAI(
    base_url='http://localhost:11434/v1',
    api_key='ollama'  # 本地运行无需真实 Key，填写占位符即可
)

response = client.chat.completions.create(
    model="qwen2.5:0.5b",
    messages=[
        {"role": "user", "content": "请用一句话介绍自己。"}
    ]
)

print("Ollama 本地模型输出:\n", response.choices[0].message.content)
```
