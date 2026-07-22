---
id: 2-math-for-ai
title: 2. 直观线性代数与概率论
sidebar_position: 3
---

# 2. 直观线性代数与概率论

线性代数与概率论是大模型的“内部语言”。本文丢弃晦涩难懂的公式推导，用**直观的几何比喻与生活例子**带你彻底弄懂向量点积、余弦相似度与 Softmax 概率归一化。

---

## 📐 1. 向量点积与相似度：如何让 AI 理解“语义接近”？

在大模型中，文字（如“苹果”、“香蕉”）会被转换为固定长度的数字数组，称为 **Embedding 词向量**。

例如，用 3 个特征维度打分（`[甜度, 是否水果, 是否电子产品]`）：
- **红富士苹果**: `[0.9, 0.8, 0.0]`
- **香蕉**: `[0.8, 0.2, 0.0]`
- **iPhone**: `[0.0, 0.9, 0.9]`

### 1.1 向量点积 (Dot Product)
点积对应位置相乘再相加：

$$\text{苹果} \cdot \text{香蕉} = (0.9 \times 0.8) + (0.8 \times 0.2) + (0.0 \times 0.0) = 0.72 + 0.16 + 0 = 0.88$$

点积数值越大，说明两个词的语义倾向越一致！

### 1.2 余弦相似度 (Cosine Similarity)
如果文本很长导致数值偏大，余弦相似度可以归一化向量长度，把相似度约束在 **[-1, 1]** 范围内：

$$\text{Cosine Similarity} = \frac{\mathbf{A} \cdot \mathbf{B}}{\|\mathbf{A}\| \|\mathbf{B}\|}$$

```python
import numpy as np

v1 = np.array([0.9, 0.8, 0.0])
v2 = np.array([0.8, 0.2, 0.0])

# 计算余弦相似度
cos_sim = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))
print("红富士苹果与香蕉的余弦相似度:", round(cos_sim, 4))
# 输出: 0.9381 (极高相关)
```

---

## 🧮 2. 矩阵乘法 $Y = XW + b$：神经网络的变换魔法

神经网络的实质是做特征的线性变换：
- $X$: 输入特征矩阵，Shape: `[Batch_Size, In_Features]`
- $W$: 权重参数矩阵，Shape: `[In_Features, Out_Features]`
- $b$: 偏置向量，Shape: `[Out_Features]`

### 乘法维度规则
必须满足 **前列等于后行**！

$$\text{Shape: } [100, 2] \times [2, 1] = [100, 1]$$

---

## 🎲 3. Softmax 函数：把得分转成百分比概率

大模型最后输出的原始打分（Logits）可能很大或有负数，Softmax 通过指数与归一化把它变成总和为 1 的概率分布：

$$\text{Softmax}(z_i) = \frac{e^{z_i}}{\sum_{j} e^{z_j}}$$

```python
import numpy as np

# 大模型对下一个字候选预测的 Logits 分值
logits = np.array([4.0, 1.0, 0.0])

# Softmax 转换
exp_logits = np.exp(logits)
probs = exp_logits / np.sum(exp_logits)

words = ["张三", "李四", "王五"]
for word, p in zip(words, probs):
    print(f"预测为 '{word}' 的概率: {p * 100:.2f}%")
# 张三: 93.60%, 李四: 4.70%, 王五: 1.70%
```
