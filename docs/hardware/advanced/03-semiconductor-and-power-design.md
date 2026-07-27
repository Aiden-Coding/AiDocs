---
title: 半导体器件与电源设计
hide_title: true
sidebar_label: 03 半导体器件与电源设计
sidebar_position: 3
---

## 半导体器件与电源设计

任何电子系统都离不开能量供应。本章将从半导体元件 (二极管、BJT、MOSFET) 的物理与电气特性出发，深入剖析硬件设计中最核心的**电源树 (Power Tree) 架构**与**线性稳压器 (LDO) vs 开关电源 (DCDC)** 的选型设计方法。

---

## 1. 核心半导体器件精讲

### 1.1 二极管 (Diode) & 肖特基二极管 (Schottky)

二极管利用 PN 结的单向导电性工作。

- **普通硅整流二极管 (1N4007)**：正向压降 $V_F \approx 0.7\text{V} \sim 1.0\text{V}$，反向恢复时间长，适用于低频交流整流。
- **肖特基二极管 (Schottky, 如 SS34)**：正向压降更低 $V_F \approx 0.3\text{V} \sim 0.45\text{V}$，无少数载流子储存效应，反向恢复极快。适合高频开关电源续流、防反接电路。
- **TVS 管 (瞬态电压抑制器)**：利用反向击穿特性，响应时间达到皮秒 ($ps$) 级，用于吸收接口 ESD 和浪涌高压。

### 1.2 N-MOSFET 与 P-MOSFET 功率开关

MOSFET 是压控型器件，通过栅极电压 $V_{GS}$ 控制源极 (S) 和漏极 (D) 之间的导通。

```text
          N-MOSFET 导通条件: V_GS > V_th (高电平导通，适合低端开关)
                   D (漏极)
                   |
             G ----| (栅极)
                   |
                   S (源极, 接地 GND)

          P-MOSFET 导通条件: V_GS < -V_th (低电平导通，适合高端开关)
                   S (源极, 接 VCC)
                   |
             G ----| (栅极)
                   |
                   D (漏极)
```

#### MOSFET 损耗三大来源计算

- **导通损耗 (Conduction Loss)**：

$$
P_{cond} = I_D^2 \cdot R_{DS(on)}
$$

- **开关损耗 (Switching Loss)**：在开启与关断瞬间，$V_{DS}$ 与 $I_D$ 同时存在交叠区产生的损耗。

$$
P_{sw} = \frac{1}{2} \cdot V_{IN} \cdot I_{OUT} \cdot (t_{r} + t_{f}) \cdot f_{sw}
$$

- **栅极驱动损耗 (Gate Drive Loss)**：

$$
P_{gate} = Q_g \cdot V_{GS} \cdot f_{sw}
$$

---

## 2. LDO 线性稳压器 vs DCDC 开关电源

在电源树设计中，常见的稳压方案主要是 LDO (Low Dropout Regulator) 和 DCDC 变换器 (Buck / Boost / Buck-Boost)。

### 2.1 性能与特性全方位对比

| 对比维度 | LDO (线性稳压器) | DCDC Buck (开关降压) |
| :--- | :--- | :--- |
| **转换效率 ($\eta$)** | 低：$\eta = \frac{V_{out}}{V_{in}}$ | **极高**：通常可达 $85\% \sim 95\%$ |
| **热损耗** | 大：$P_{loss} = (V_{in} - V_{out}) \cdot I_{out}$ 转化为热 | 小：大部分能量通过电感与 MOS 开关储能传递 |
| **输出噪声/纹波** | **极低**（微伏级 $uV$，PSRR 高） | 有开关纹波噪声（几十 $mV$ 级） |
| **外围电路复杂度** | 极简单（仅需输入/输出电容） | 较复杂（需功率电感、续流 MOS/二极管、反馈网络） |
| **压差要求** | 输入必须大于输出（有最小压降 $V_{drop}$） | 可降压 (Buck)、升压 (Boost) 或升降压 |

---

## 3. 开关电源 (Buck 变换器) 核心设计与计算

### 3.1 Buck 电路物理拓扑

```text
             SW 节点
  Vin ------[ MOS 开关 ]------+------[ 电感 L ]------+------ Vout
                              |                      |
                            [二极管]               [电容 C]
                            (续流)                   |
                              |                      GND
                             GND
```

![Buck 开关电源原理拓扑图](/img/hardware/03-buck-converter.png)

### 3.2 占空比与输出电压关系

在连续导通模式 (CCM) 下：

$$
V_{out} = D \cdot V_{in} \quad \implies \quad D = \frac{V_{out}}{V_{in}}
$$

### 3.3 关键储能电感计算公式

电感纹波电流通常取最大输出电流的 $20\% \sim 40\%$ ($\Delta I_L = r \cdot I_{out}$)：

$$
L = \frac{V_{in} - V_{out}}{\Delta I_L \cdot f_{sw}} \cdot \frac{V_{out}}{V_{in}}
$$

- **工程实例**：若 $V_{in} = 12\text{V}$，$V_{out} = 3.3\text{V}$，$I_{out} = 2\text{A}$，开关频率 $f_{sw} = 500\text{kHz}$，设定纹波系数 $r = 0.3$ ($\Delta I_L = 0.6\text{A}$)：

$$
L = \frac{12 - 3.3}{0.6 \cdot 500 \cdot 10^3} \cdot \frac{3.3}{12} \approx 6.57 \ \mu\text{H} \quad \to \text{工程选型标称值 } 6.8 \ \mu\text{H} \text{ 功率电感}
$$

---

## 4. 热设计与芯片温升计算

芯片结温 (Junction Temperature $T_J$) 不能超过其最高许用值（通常为 $125^\circ\text{C} \sim 150^\circ\text{C}$）。

热阻网络类比欧姆定律：

$$
T_J = T_A + P_{loss} \cdot \theta_{JA}
$$

其中：
- $T_A$：环境温度（如工业级 $85^\circ\text{C}$）。
- $P_{loss}$：芯片上消耗的实际功耗 (W)。
- $\theta_{JA}$：芯片结到环境的热阻 ($^\circ\text{C}/\text{W}$)。

> **⚠️ 热设计算例**：选用 SOT-23 封装 LDO 将 $5\text{V}$ 降压到 $3.3\text{V}$，电流 $I_{out} = 300\text{mA}$。
> - 功耗 $P_{loss} = (5 - 3.3) \cdot 0.3 = 0.51\text{W}$。
> - SOT-23 的 $\theta_{JA} \approx 200^\circ\text{C}/\text{W}$。
> - 在环境温度 $T_A = 25^\circ\text{C}$ 下，$T_J = 25 + 0.51 \times 200 = 127^\circ\text{C}$！
> - **结论**：芯片瞬间过热降额或触发过热关断。必须更换为 DPAK/SOP-8 封装，或改用 DCDC 降压！

