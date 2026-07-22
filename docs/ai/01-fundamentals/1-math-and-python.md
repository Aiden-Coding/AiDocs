---
id: 1-math-and-python
title: 线性代数、概率论与 Python 科学计算栈
sidebar_position: 2
---

# 线性代数、概率论与 Python 科学计算栈

掌握 AI 的底层计算机制，需要理解张量运算、概率推理以及 Python 科学计算核心库的使用。

---

## 1. 线性代数核心 (Linear Algebra)

在深度学习中，绝大多数计算均可抽象为矩阵与张量（Tensor）运算。

### 1.1 向量与点积 (Vector & Dot Product)

向量是表示高维特征的基本单位。两个 $n$ 维向量 $\mathbf{u}$ 和 $\mathbf{v}$ 的点积计算如下：

$$\mathbf{u} \cdot \mathbf{v} = \sum_{i=1}^{n} u_i v_i = u_1 v_1 + u_2 v_2 + \dots + u_n v_n$$

在 NLP 与 Embedding 相似度计算中，常用**余弦相似度（Cosine Similarity）**：

$$\text{Cosine Similarity}(\mathbf{u}, \mathbf{v}) = \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\| \|\mathbf{v}\|}$$

### 1.2 矩阵乘法 (Matrix Multiplication)

设矩阵 $A \in \mathbb{R}^{m \times k}$，矩阵 $B \in \mathbb{R}^{k \times n}$，则乘积矩阵 $C = AB \in \mathbb{R}^{m \times n}$：

$$C_{ij} = \sum_{l=1}^{k} A_{il} B_{lj}$$

> 💡 **神经网络映射**：全连接层 $Y = XW + b$ 本质上就是矩阵乘法结合偏置项与激活函数。

---

## 2. 概率论与统计学 (Probability & Statistics)

### 2.1 条件概率与贝叶斯定理

$$\text{P}(A|B) = \frac{\text{P}(B|A)\text{P}(A)}{\text{P}(B)}$$

在 LLM 生成预测中，大模型根据前面所有 Token（条件 $B$）预测下一个 Token（事件 $A$）的概率分布： $P(w_t | w_1, w_2, \dots, w_{t-1})$。

### 2.2 常见概率分布

- **高斯分布 (Gaussian Distribution)**：权重初始化与扩散模型（Diffusion Models）噪声添加的基础。
- **Softmax 函数**：将高维 logits 转换为概率分布：

$$\text{Softmax}(z_i) = \frac{e^{z_i}}{\sum_{j} e^{z_j}}$$

---

## 3. Python 科学计算栈实战

### 3.1 NumPy 核心矩阵操作

```python
import numpy as np

# 1. 创建特征矩阵与权重
X = np.array([[1.0, 2.0], [3.0, 4.0]])  # Shape: (2, 2)
W = np.array([[0.5], [0.1]])             # Shape: (2, 1)
b = 0.2

# 2. 前向传播计算: Y = XW + b
Y = np.dot(X, W) + b
print("Output Y:\n", Y)

# 3. 计算余弦相似度
def cosine_similarity(v1, v2):
    return np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))

emb1 = np.array([0.1, 0.8, 0.5])
emb2 = np.array([0.2, 0.9, 0.4])
print("Embedding Similarity:", cosine_similarity(emb1, emb2))
```

### 3.2 PyTorch 张量与 GPU 加速

```python
import torch

# 检查 CUDA GPU 可用性
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# 创建随机张量并打到 GPU 上
x = torch.randn(1000, 1000, device=device)
w = torch.randn(1000, 500, device=device)

# 自动求导机制 (Autograd)
x_val = torch.tensor([2.0], requires_grad=True)
y = x_val ** 2 + 3 * x_val + 1
y.backward()

print("dy/dx at x=2:", x_val.grad.item())  # 2*x + 3 = 7.0
```
