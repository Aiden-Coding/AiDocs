---
id: 3-quantization-and-monitoring
title: 3. 模型量化 (GGUF/AWQ) 与服务监控
sidebar_position: 4
---

# 3. 模型量化 (GGUF/AWQ) 与服务监控

为了将几十 GB 的大模型压缩到普通笔记本显卡甚至手机上运行，我们需要用到**模型量化（Quantization）**技术。

---

## 📉 1. 模型量化原理：从 FP16 到 INT4

大模型参数默认用 16 位浮点数（FP16，每个参数占 2 字节）存储。量化就是将连续的高精度浮点数映射到离散的低精度整数（如 INT8/INT4，每个参数占 0.5 字节）：

$$\text{FP16 (2 Bytes)} \rightarrow \text{INT4 (0.5 Bytes)} \quad (\text{体积缩小 } 75\%)$$

### 主流量化格式对比：
1. **GGUF (llama.cpp 格式)**：针对 CPU / Apple Silicon 优化，支持 2-bit ~ 8-bit 量化，跨平台兼容极佳。
2. **AWQ / GPTQ**：针对 NVIDIA GPU 激活值优化的 4-bit 量化，适合 GPU 部署加速。

---

## 📊 2. LLM 服务核心监控指标

上线后需要关注的三大 SLA 黄金指标：

- **TTFT (Time to First Token)**：首字延迟（从发出请求到看到第一个字的时间，影响用户感知爽感）。
- **TPS (Tokens Per Second)**：解码生成速度（每秒产生多少个 Token，如 > 30 tokens/s 为流畅）。
- **Throughput (吞吐量)**：系统整体每秒处理的总 Token 数（衡量高并发能力）。
