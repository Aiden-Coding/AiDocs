---
id: 3-transformer-and-attention
title: 3. Transformer 与 Self-Attention 机制全解
sidebar_position: 4
---

# 3. Transformer 与 Self-Attention 机制全解

如果说 MLP 是深度学习的基石，那么 **Transformer 架构** 与 **自注意力机制（Self-Attention）** 就是现代大语言模型（ChatGPT、Claude、Qwen、DeepSeek）的发动机。

---

## 💥 1. 为什么 RNN 被淘汰？Self-Attention 的突破点

在 Transformer 出现前，处理文本主要依靠 RNN（循环神经网络）。

RNN 的致命缺点：
- **必须串行计算**：算第 100 个词必须先算完前 99 个词，**无法利用 GPU 大规模并行加速**。
- **长距离遗忘**：句子太长时，开头的上下文信息传递到结尾就丢失了。

```mermaid
graph LR
    subgraph RNN (串行效率低)
        Word1["词1"] --> RNN1["RNN Cell"] --> Word2["词2"] --> RNN2["RNN Cell"] --> Word3["词3"]
    end
```

Transformer 的突破：**Self-Attention 一次性让句子中的每一个词与其它所有词直接进行“注意力关联”计算**，实现了全并行计算与长距离依赖捕获！

---

## 🔍 2. Self-Attention 核心原理：Q、K、V 矩阵

把自注意力机制想象成**图书馆查资料**：
- **Query ($Q$)**：你的检索问题（比如：“苹果手机怎么关机？”）
- **Key ($K$)**：图书馆每本书的书名/标签
- **Value ($V$)**：每本书的具体详细内容

### 注意力计算 4 步走

$$\text{Attention}(Q, K, V) = \text{Softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V$$

1. **生成 Q、K、V**：输入特征 $X$ 乘以三个线性矩阵 $W_Q, W_K, W_V$。
2. **计算相似度得分 ($Q K^T$)**：Query 与 Key 做点积，衡量词与词之间的关联度。
3. **缩放与 Softmax 归一化**：除以 $\sqrt{d_k}$ 防止数值过大，经过 Softmax 得到注意力权重百分比。
4. **加权求和 ($W \times V$)**：用权重对 Value 进行加权融合，得到融入上下文含义的新向量！

```python
import torch
import torch.nn.functional as F

# 模拟输入: Batch_Size=1, Seq_Len=3 (句子 3 个词), Dim=4
X = torch.randn(1, 3, 4)

# 1. 简单定义 Q, K, V 映射矩阵
W_q = torch.randn(4, 4)
W_k = torch.randn(4, 4)
W_v = torch.randn(4, 4)

Q = X @ W_q  # Shape: [1, 3, 4]
K = X @ W_k  # Shape: [1, 3, 4]
V = X @ W_v  # Shape: [1, 3, 4]

# 2. 计算注意力得分 Q * K^T (后两维转置)
scores = Q @ K.transpose(-2, -1) / (4 ** 0.5)  # Shape: [1, 3, 3]

# 3. Softmax 归一化为注意力权重
attn_weights = F.softmax(scores, dim=-1) # Shape: [1, 3, 3]

# 4. 加权融合 Value
output = attn_weights @ V # Shape: [1, 3, 4]

print("Self-Attention 输出 Shape:", output.shape)
```

---

## 🧩 3. Transformer 整体架构组件

除了 Self-Attention，Transformer 还包含以下关键组件：

- **Multi-Head Attention（多头注意力）**：用多组不同的 $Q, K, V$ 矩阵并行关注不同的上下文切面（比如一组关注语法，一组关注语义）。
- **Positional Encoding（位置编码）**：自注意力机制本身不包含位置顺序，需要向输入向量中加入代表位置信息的正弦/余弦或 RoPE（旋转位置编码）。
- **Layer Normalization（层归一化）**：稳定深层网络中的激活值分布。
