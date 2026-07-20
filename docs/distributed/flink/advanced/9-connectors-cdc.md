---
title: Flink 连接器、CDC 与动态数据源
hide_title: true
sidebar_label: 连接器与数据流
---

## Flink 连接器、CDC 与动态数据源

Flink 的强大生态之一在于它不仅能执行流处理逻辑，还能“无痛接入”各种外部数据源和目的地。连接器（Connector）构成了 Flink 与 Kafka、数据库、文件系统、消息队列之间的桥梁。

---

## 一、 Flink 连接器模型概览

Flink 连接器主要按数据方向分为：

- **Source Connector**：读取外部系统，产生 DataStream / Table。
- **Sink Connector**：将结果写入外部系统。

在 Table/SQL 语义中，它们也可以被定义为动态表。一个典型的 Table DDL 看起来像：

```sql
CREATE TABLE kafka_orders (
  order_id STRING,
  user_id STRING,
  amount DOUBLE,
  order_time TIMESTAMP(3),
  WATERMARK FOR order_time AS order_time - INTERVAL '5' SECOND
) WITH (
  'connector' = 'kafka',
  'topic' = 'orders',
  'properties.bootstrap.servers' = 'kafka:9092',
  'format' = 'json'
);
```

---

## 二、 CDC 实时变更数据流

CDC（Change Data Capture）是把数据库中的行级更改事件变成实时流的一种设计模式。

### 1. Flink CDC 的核心价值

- 将 MySQL/PostgreSQL/Oracle 的 binlog/redo log 等变更流，转换为 Flink 可消费的 `INSERT`/`UPDATE`/`DELETE` 事件。
- 支持对数据库表进行实时同步、实时 ETL、实时数据仓库填充。

### 2. Flink CDC 常见实现方式

最常见的是使用 Flink CDC 的开源连接器，如 `flink-connector-mysql-cdc`。

示例：

```sql
CREATE TABLE mysql_orders (
  id STRING,
  user_id STRING,
  amount DOUBLE,
  order_time TIMESTAMP(3),
  PRIMARY KEY (id) NOT ENFORCED
) WITH (
  'connector' = 'mysql-cdc',
  'hostname' = 'mysql-host',
  'port' = '3306',
  'username' = 'user',
  'password' = 'pwd',
  'database-name' = 'shop',
  'table-name' = 'orders'
);
```

---

## 三、 动态表与 Changelog 语义

当你把 CDC 表注册为 Flink 动态表之后，Flink 会把它看成一个不断产生变更记录的实时关系表。此时，SQL 查询会自然地变成对“变化流”的计算。

- **Append-only 表**：只产生新增事件。
- **Retract 表**：产生撤回（`-D`）和新增（`+I`）事件，用于聚合结果的更新。
- **Upsert 表**：通过主键更新写法维护最新状态，适合写入外部键值存储。

---

## 四、 典型数据管道设计

1. **Kafka Source -> Flink SQL 处理 -> Kafka Sink**
   - 适用于流媒体、事件追踪、用户行为分析。
2. **CDC Source -> Flink 业务变换 -> OLAP 数据仓库 Sink**
   - 适用于实时数仓、实时 BI、实时指标计算。
3. **Flink SQL + CDC -> Upsert Sink**
   - 适用于实时维表、实时物化视图。

---

## 五、 生产实践要点

- **优先使用 Table/SQL DDL 定义数据源**：保持 Schema 与外部系统契合。
- **使用主键 Upsert Sink 时，确保外部存储支持幂等写入**。
- **对于大规模 CDC 任务，注意 Source 并发度与 snapshot 机制对数据库的压力**。
- **如果需要语义一致性，尽量使用 Kafka + Exactly-Once Sink**。
