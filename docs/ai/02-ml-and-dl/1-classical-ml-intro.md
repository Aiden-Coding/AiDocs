---
id: 1-classical-ml-intro
title: 1. 经典机器学习入门 (Regression & Classification)
sidebar_position: 2
---

# 1. 经典机器学习入门 (Regression & Classification)

在直接学习 Transformer 和大语言模型之前，我们需要先明白：**机器学习到底在学什么？**

传统编程是：**数据 + 规则 $\rightarrow$ 答案**（比如 `if score > 60: return "Pass"`）。  
机器学习是：**数据 + 答案 $\rightarrow$ 寻找隐藏规则（拟合函数 $y = f(x)$）**。

---

## 🎯 1. 机器学习两大核心任务

| 任务类型 | 目标 | 常见例子 | 代表算法 |
| :--- | :--- | :--- | :--- |
| **回归 (Regression)** | 预测**连续的数值** | 预测房价、预测明日气温 | 线性回归 (Linear Regression) |
| **分类 (Classification)** | 预测**离散的类别标签** | 垃圾邮件识别（是/否）、图像分类（猫/狗） | 逻辑回归 (Logistic Regression)、决策树 |

---

## 📉 2. 线性回归与损失函数 (Loss Function)

假设我们要根据房屋面积 $x$ 预测售价 $y$：

预测公式为：
$$\hat{y} = w \cdot x + b$$

- $w$ (Weight): 权重（单价）
- $b$ (Bias): 偏置（基础基准价）

### 损失函数（MSE 均方误差）
为了衡量模型预测得准不准，我们计算所有样本真实值 $y_i$ 与预测值 $\hat{y}_i$ 的差距平方和平均值：

$$\text{MSE Loss} = \frac{1}{N} \sum_{i=1}^{N} (y_i - \hat{y}_i)^2$$

机器学习的目标就是：**找到一组 $w$ 和 $b$，使 Loss 达到最小！**

```python
from sklearn.linear_model import LinearRegression
import numpy as np

# 1. 模拟数据: 房屋面积 (平米) -> 售价 (万元)
X = np.array([[50], [80], [100], [120]])
y = np.array([150, 230, 290, 350])

# 2. 创建并训练模型
model = LinearRegression()
model.fit(X, y)

# 3. 预测 90 平米的房屋售价
predicted_price = model.predict([[90]])
print("预测 90 平米房屋售价:", round(predicted_price[0], 2), "万元")
```

---

## 🚨 3. 机器学习核心难题：过拟合与欠拟合

- **欠拟合 (Underfitting)**：模型太简单，没学会数据规律（如同复习不够，考试不及格）。
- **过拟合 (Overfitting)**：模型太复杂，把训练集里的噪声和细节死记硬背下来了，遇到新数据（测试集）立马失效（如同死记硬背原题，换个数字就不会做）。

```mermaid
graph LR
    A["欠拟合<br/>(模型能力太弱)"] --> B["恰好拟合<br/>(泛化能力优秀)"] --> C["过拟合<br/>(死记硬背训练集)"]
```

解决过拟合的常用手段：**增加数据量、正则化（L1/L2）、Dropout**。
