---
title: Flink SQL 与动态表 (Dynamic Tables)
hide_title: true
sidebar_label: Flink SQL 与动态表
---

## Flink SQL 与动态表 (Dynamic Tables)

随着大数据开发的民主化，写 Flink DataStream API（Java/Scala 代码）的门槛和运维成本使得纯 SQL 处理流数据成为了主流演进方向。基于 **Apache Calcite**，Flink 提供了强大的 SQL 解析、优化与流批一体的表环境 (Table API)。

---

## 一、 动态表 (Dynamic Table) 与流表二象性

传统数据库执行查询往往是对**静止快照**的一轮扫描，而流数据是绵绵不断的。Flink SQL 如何在查询一个表？

核心概念：**动态表 (Dynamic Table)**。

### 1. 从流到表 (Stream $\\rightarrow$ Table)

当你把 Kafka 里的一条条无界流日志接入系统时，流在逻辑上被转换为了“包含插入记录动态追加 (Append) 或更新 (Update) 的关系数据库表”。
流的一条记录，就是动态表里新增或者发生变动的一行记录（Changelog）。

### 2. 连续查询 (Continuous Query)

普通 SQL 执行完毕就返回退出；但在 Flink 中，你的 `SELECT` 查询会作为守护服务**在后台 7x24 持续（Continuous）被执行**。
- 只要上游动态表有新的一行输入，底层的物理算子（比如聚合状态机）就会被立刻唤醒触发计算。
- 它吐出自身处理完毕的结果，然后**源源不断地生成一个全新且被修改过的新结果动态表**。

### 3. 从表回到流 (Table $\\rightarrow$ Stream)

当我们想把连续查询出来的最新表格结果打回给外部介质（比如 Redis、Kafka 或 MySQL），Flink 提供了**重做日志模式**（Changelog Stream / Retract Stream）：
- **Append-only 流**：如果你的查询是仅仅 `SELECT` 过滤。只有新规插入的数据增加 `+I`。
- **撤回流 (Retract Stream)**：如果你使用了 `GROUP BY`。由于之前算好的求和总数被后来数据搞变化了，由于流发出去的结果覆水难收，系统会向外部发一条撤回信号 `[-D, 老值]` 删去旧结果，再发送一条 `[+I, 新值]`。
- **更新覆盖流 (Upsert Stream)**：要求外部介质必须具备主键（如 HBase, MySQL, Redis），系统直接发出覆盖更新指令去顶替过去的数据。

---

## 二、 核心组件：Apache Calcite 的优化器网络

Flink 并不重复造 SQL 语法的车轮。它的大脑基石就是 **Apache Calcite 框架**引擎。

1. **Parser & Validator（解析校验）**：收到 `SELECT * FROM T`，转换为抽象语法树 AST，校验表是否存在、字段数据类型是否适配逻辑校验。
2. **Logical Plan（逻辑计划生成）**：将这堆 SQL 转化为关系代数节点组合，如 `Filter`, `Join`。
3. **Calcite Optimizer（基于规则和成本的自动优化，RBO/CBO 组合）**：
   - 谓词下推（Predicate PushDown）：能早早过滤的条件提到数据源取数阶段。
   - 投影下推（Projection PushDown）：没用上的 `select column` 尽早丢弃，减少内部网络通信序列化压力。
4. **Physical Plan（物理计划部署生成）**：Calcite 将打磨好的计划转化回 Flink Runtime 原生的 DataStream 物理算子算式，最终提交生成 `JobGraph` 上线。

---

## 三、 Flink SQL 高级功能扩展演变 (1.15 ~ 1.19+)

- **连接器生态大爆发 (Connectors)**：几乎所有数据源现在都能被定义成一张 Table。例如直接通过 SQL DDL `CREATE TABLE xx WITH ('connector' = 'kafka')` 无代码直连。
- **CDC 集成 (Change Data Capture)**：借由 Debezium / Flink CDC 架构，业务数据库 MySQL 中的 Binglog 可以被伪装为 Flink 的原生 Changelog 流。你可以使用 SQL 在 Flink 里处理来自数据库增删改查变化，同步推向数仓做实时大屏同步。
- **时间属性管理与 TVF (Table-Valued Functions)**：提供原生的 `WINDOWING TUMBLE(time_col, size)` 等极为现代易读的表值窗口生成函数语义进行聚合。
