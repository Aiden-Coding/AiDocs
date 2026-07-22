---
id: 2-neural-network-from-scratch
title: 2. 从零手写多层感知机 (MLP)
sidebar_position: 3
---

# 2. 从零手写多层感知机 (MLP)

如果将单个线性回归比作一个“神经元”，那么把成百上千个神经元层层连接，并加上**非线性激活函数**，就构成了**多层感知机（MLP，Multilayer Perceptron）**——深度学习的基石。

---

## 🧠 1. 为什么必须引入激活函数 (Activation Function)？

如果只是把很多层线性公式 $Y = XW_1 W_2 W_3$ 叠加，由于矩阵乘法的结合律，多层线性叠加本质上**依然等于一层单层线性变换**！模型将无法拟合现实世界中复杂的非线性曲线（比如 XOR 异或问题）。

**激活函数**的作用就是为神经网络注入“非线性折弯”的能力：

| 激活函数 | 公式 | 特点与应用场景 |
| :--- | :--- | :--- |
| **ReLU** | $f(x) = \max(0, x)$ | 极速计算，防止梯度消失，隐藏层最常用 |
| **Sigmoid** | $f(x) = \frac{1}{1 + e^{-x}}$ | 将输出压缩到 $(0, 1)$，二分类输出层常用 |
| **GELU** | $x \cdot \Phi(x)$ | 平滑版 ReLU，**Transformer/LLM 底层标配** |

---

## 🏗️ 2. MLP 神经网络架构拆解

一个典型的 MLP 包含三层：
1. **输入层 (Input Layer)**：接收原始特征向量，Shape: `[Batch_Size, In_Dim]`
2. **隐藏层 (Hidden Layer)**：提取抽象特征，`Linear -> Activation`
3. **输出层 (Output Layer)**：预测最终类别或分值

```mermaid
graph LR
    subgraph 输入层
        X1["x1"]
        X2["x2"]
    end
    subgraph 隐藏层 (ReLU)
        H1["h1"]
        H2["h2"]
        H3["h3"]
    end
    subgraph 输出层
        Y1["y (预测值)"]
    end

    X1 --> H1
    X1 --> H2
    X1 --> H3
    X2 --> H1
    X2 --> H2
    X2 --> H3

    H1 --> Y1
    H2 --> Y1
    H3 --> Y1
```

---

## 💻 3. PyTorch 端到端手写写一个手写数字分类器 (MNIST)

下面的代码使用 PyTorch 构建包含 1 个隐藏层的 MLP，展示完整训练过程：

```python
import torch
import torch.nn as nn
import torch.optim as optim

# 1. 定义多层感知机模型
class SimpleMLP(nn.Module):
    def __init__(self, input_dim=784, hidden_dim=128, num_classes=10):
        super().__init__()
        # 第一层线性变换 [Batch, 784] -> [Batch, 128]
        self.fc1 = nn.Linear(input_dim, hidden_dim)
        # 激活函数
        self.relu = nn.ReLU()
        # 第二层线性变换 [Batch, 128] -> [Batch, 10]
        self.fc2 = nn.Linear(hidden_dim, num_classes)

    def forward(self, x):
        # x Shape: [Batch, 784]
        h = self.relu(self.fc1(x)) # Shape: [Batch, 128]
        out = self.fc2(h)          # Shape: [Batch, 10] (Raw Logits)
        return out

# 2. 实例化模型与优化器
model = SimpleMLP()
criterion = nn.CrossEntropyLoss() # 内部已包含 Softmax
optimizer = optim.Adam(model.parameters(), lr=0.001)

# 3. 模拟一个 Batch 的训练数据 (Batch_Size=32, 28x28 像素图片展开为 784 维)
dummy_inputs = torch.randn(32, 784) # Shape: [32, 784]
dummy_labels = torch.randint(0, 10, (32,)) # 真实标签 0-9

# 4. 单步训练迭代
optimizer.zero_grad()
outputs = model(dummy_inputs)     # 前向传播 Shape: [32, 10]
loss = criterion(outputs, dummy_labels) # 计算交叉熵损失
loss.backward()                   # 反向传播计算梯度
optimizer.step()                  # 更新模型参数

print(f"训练单步 Loss 损失值: {loss.item():.4f}")
```
