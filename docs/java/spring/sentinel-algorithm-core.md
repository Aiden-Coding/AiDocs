---
title: Sentinel 滑动窗口与高性能限流算法深度内核
hide_title: true
sidebar_label: Sentinel 限流算法内核
---

## Sentinel 滑动窗口与高性能限流算法深度内核

在高并发分布式系统中，流量防护与弹性隔离是系统的“防弹衣”。Sentinel 作为流量防卫兵，其底层高吞吐的数据统计与平滑限流算法极具工业美学。本篇将深度解析 Sentinel 的核心指标统计器 **`LeapArray`（滑动窗口）** 以及限流算法的数理推导。

---

## 一、 滑动窗口统计：`LeapArray` 环形物理设计

在高并发场景下做限流，每秒会有数万甚至数百万请求通过，若每次都用加锁（如原子计数器）或直接全量扫描内存，将产生巨大的 CPU 额外损耗。Sentinel 创新性地设计了基于**无锁环形数组（Circular Array）**的滑动窗口结构。

### 1. 内存模型与空间换时间

Sentinel 用一个固定大小的数组成员来模拟滚动的窗口，从而避免数组扩容或物理移动：

```mermaid
graph LR
    subgraph "LeapArray (WindowWrap)"
        W0[Window 0<br/>[0s - 0.5s]] --> W1[Window 1<br/>[0.5s - 1.0s]]
        W1 --> W2[Window 2<br/>[1.0s - 1.5s]]
        W2 --> W0
    end
```

- **`sampleCount`（样本窗口数）**：例如 $2$ 个窗口。
- **`intervalInMs`（总统计周期）**：例如 $1000\text{ ms}$。
- 每个窗口的宽度：
  $$
  \text{windowLength} = \frac{\text{intervalInMs}}{\text{sampleCount}} = 500\text{ ms}
  $$

### 2. 窗口定位与旧窗口重置

当请求进入时，如何定位当前时间需要落入哪个窗口，且在跨越总周期后如何做到不清理历史内存直接重写？

1.  **定位索引 (Index)**：
    $$
    \text{idx} = \left( \frac{\text{currentTime}}{\text{windowLength}} \right) \bmod \text{sampleCount}
    $$
2.  **定位窗口开始时间 (Start Time)**：
    $$
    \text{windowStart} = \text{currentTime} - \left( \text{currentTime} \bmod \text{windowLength} \right)
    $$
3.  **无锁并发复用判断**：
    由于可能有并发线程同时访问相同的槽位，Sentinel 结合了 **CAS**（无锁对比交换）来实现窗口替换：
    - 若槽位为空：利用 CAS 放入新的 `WindowWrap`。
    - 若槽位已有值，且其开始时间与 $\text{windowStart}$ 相同：说明是当前的滑动窗口，直接进行指标累加。
    - 若槽位已有值，且其开始时间更早：说明时钟已经转过一轮，此窗口属于过去。此时利用 CAS 重置（Reset）指标缓存，并更新开始时间为 $\text{windowStart}$。

---

## 二、 经典限流算法硬核对比

根据流量的不同整形诉求，限流器底层对应了不同的控制流算法。

### 1. 漏桶算法 (Leaky Bucket)

- **几何模型**：水（请求）以不确定速度流入桶内，桶底部有固定漏孔以恒定速率流出。当落入速度大于流出速度且水桶满时，多余的水直接溢出。
- **数学表达式（恒定输出）**：
  $$
  Q_{\text{out}}(t) = \text{Constant}
  $$
- **适用场景**：平滑突发流量、强制流量匀速排队，适用于对下游调用频率有严格频率边界控制的核心系统。

### 2. 令牌桶算法 (Token Bucket)

- **几何模型**：以恒定速率 $r$ 往桶内放入代币（令牌），桶容量上限为 $b$。请求进入必须消耗一个令牌方能执行，否则被降级。
- **数学表达式（允许突发）**：在 $t$ 时间内，系统允许的最大并发写入峰值为：
  $$
  M = b + r \cdot t
  $$
- **适用场景**：保护敏感核心资源、支持一定程度的突发大流量（Busty Traffic）。

---

## 三、 总结

- **`LeapArray`** 极大压榨了数据统计在高并发多核环境内的 CPU 占有。
- 限流策略应根据业务下游资源承载力按需选择：强调整形且可容忍延迟排队的，使用**漏桶算法**；强调瞬时抗压力和用户流畅体验的，采用**令牌桶算法**。
