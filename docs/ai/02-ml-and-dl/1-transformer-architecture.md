---
id: 1-transformer-architecture
title: Transformer 架构详解与 Self-Attention 原理
sidebar_position: 2
---

# Transformer 架构详解与 Self-Attention 原理

Transformer 架构由 Attention Is All You Need (Vaswani et al., 2017) 提出，已成为现代所有大语言模型（LLM）的共同骨架。

---

## 1. Transformer 整体架构图解

```mermaid
graph TD
    subgraph Encoder [Encoder 编码器]
        E_In[Input Tokens] --> E_Emb[Embedding + Positional Encoding]
        E_Emb --> E_MHA[Multi-Head Self-Attention]
        E_MHA --> E_Add1[Add & Norm]
        E_Add1 --> E_FFN[Feed Forward Network]
        E_FFN --> E_Add2[Add & Norm]
    end

    subgraph Decoder [Decoder 解码器 (Causal)]
        D_In[Output Tokens Shifted Right] --> D_Emb[Embedding + Positional Encoding]
        D_Emb --> D_MaskedMHA[Masked Multi-Head Attention]
        D_MaskedMHA --> D_Add1[Add & Norm]
        D_Add1 --> D_CrossMHA[Cross-Attention]
        D_CrossMHA --> D_Add2[Add & Norm]
        D_Add2 --> D_FFN[Feed Forward Network]
        D_FFN --> D_Add3[Add & Norm]
        D_Add3 --> Linear[Linear + Softmax]
    end

    E_Add2 -->|K, V Vectors| D_CrossMHA
```

---

## 2. Self-Attention（自注意力机制）计算步骤

Self-Attention 允许模型在处理某一个 Token 时，自动聚焦于句子中关联度最高的其他 Token。

### 2.1 投影计算 Q, K, V

对于输入矩阵 $X \in \mathbb{R}^{N \times d_{\text{model}}}$，通过三个可学习权重矩阵 $W_Q, W_K, W_V$ 映射：

$$Q = X W_Q \quad (\text{Query})$$

$$K = X W_K \quad (\text{Key})$$

$$V = X W_V \quad (\text{Value})$$

### 2.2 Scaled Dot-Product Attention

$$\text{Attention}(Q, K, V) = \text{Softmax}\left(\frac{Q K^T}{\sqrt{d_k}}\right) V$$

- **除以 $\sqrt{d_k}$ 的作用**：防止当维度 $d_k$ 较大时，点积数值过大导致 Softmax 进入梯度极小的饱和区。

---

## 3. PyTorch 实现 Self-Attention 代码示例

```python
import torch
import torch.nn as nn
import torch.nn.functional as F

class SelfAttention(nn.Module):
    def __init__(self, embed_dim):
        super().__init__()
        self.embed_dim = embed_dim
        
        self.W_q = nn.Linear(embed_dim, embed_dim, bias=False)
        self.W_k = nn.Linear(embed_dim, embed_dim, bias=False)
        self.W_v = nn.Linear(embed_dim, embed_dim, bias=False)

    def forward(self, x, mask=None):
        # x shape: (batch_size, seq_len, embed_dim)
        Q = self.W_q(x)
        K = self.W_k(x)
        V = self.W_v(x)

        # 1. 计算 Attention Scores: (batch_size, seq_len, seq_len)
        scores = torch.matmul(Q, K.transpose(-2, -1)) / (self.embed_dim ** 0.5)

        # 2. 因果掩码 (Causal Mask，用于 Decoder 自回归生成)
        if mask is not None:
            scores = scores.masked_fill(mask == 0, -1e9)

        # 3. Softmax 归一化
        attn_weights = F.softmax(scores, dim=-1)

        # 4. 加权求和
        output = torch.matmul(attn_weights, V)
        return output, attn_weights

# 测试
x = torch.randn(2, 5, 64) # BatchSize=2, SeqLen=5, Dim=64
attn = SelfAttention(embed_dim=64)
out, weights = attn(x)
print("Output shape:", out.shape) # (2, 5, 64)
```
