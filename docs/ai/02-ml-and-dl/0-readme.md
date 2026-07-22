---
id: 0-readme
title: 机器学习与深度学习原理
sidebar_position: 1
---

# 机器学习与深度学习原理

理解传统机器学习与深度学习神经网络是深入大模型（LLM）的必经之路。

## 核心知识点

### 1. 经典机器学习算法

- **监督学习**：线性回归（Linear Regression）、逻辑回归（Logistic Regression）、决策树（Decision Tree）、随机森林（Random Forest）、XGBoost / LightGBM。
- **无监督学习**：K-Means 聚类、PCA 降维、层次聚类。
- **评估指标**：精确率（Precision）、召回率（Recall）、F1-Score、ROC-AUC、MSE/RMSE。

### 2. 深度学习神经网络 (ANN / CNN / RNN)

- **多层感知机 (MLP)**：前向传播、激活函数（ReLU, GELU, Sigmoid, Softmax）、损失函数（Cross-Entropy, MSE）。
- **卷积神经网络 (CNN)**：卷积层、池化层，应用于图像识别与视觉任务。
- **循环神经网络 (RNN / LSTM / GRU)**：处理序列数据、门控机制与梯度消失问题。

### 3. Transformer 架构（大模型的基石）

- **Self-Attention 机制**：Query, Key, Value 运算，Scaled Dot-Product Attention。
- **Multi-Head Attention**：多头注意力机制捕捉不同子空间的表征。
- **Positional Encoding**：位置编码（绝对位置编码、RoPE 旋转位置编码）。
- **Encoder-Decoder 架构**：BERT（Pure Encoder）、GPT（Causal Decoder）、T5（Encoder-Decoder）。
