---
title: PostgreSQL 执行计划深度解读
hide_title: true
sidebar_label: 执行计划解读
sidebar_position: 0
---

## PostgreSQL 执行计划深度解读

---

## 一、EXPLAIN 基本用法

```sql
-- 只显示计划（不执行）
EXPLAIN SELECT * FROM orders WHERE user_id = 1;

-- 实际执行并显示真实统计（生产常用）
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT o.id, u.name, o.amount
FROM orders o JOIN users u ON o.user_id = u.id
WHERE o.created_at > now() - interval '7 days';

-- 输出 JSON 格式（便于程序解析）
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT ...;
```

**常用参数组合**：
- `ANALYZE` — 实际执行，显示真实行数和时间
- `BUFFERS` — 显示缓存命中/未命中（需配合 ANALYZE）
- `VERBOSE` — 显示列信息、Schema 等
- `SETTINGS` — 显示非默认的配置参数

---

## 二、执行计划输出解读

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM orders WHERE user_id = 42 AND amount > 100;
```

```
Index Scan using idx_orders_user_id on orders  (cost=0.43..8.45 rows=3 width=64)
                                               (actual time=0.021..0.024 rows=2 loops=1)
  Index Cond: (user_id = 42)
  Filter: (amount > 100)
  Rows Removed by Filter: 1
  Buffers: shared hit=4 read=1
Planning Time: 0.156 ms
Execution Time: 0.045 ms
```

### 2.1 cost 字段解读

```
cost=0.43..8.45
      │     └── 返回最后一行的总代价（单位：随机页面 I/O 的代价）
      └── 返回第一行的代价（startup cost）
```

**代价模型参数**（`postgresql.conf`）：

| 参数 | 默认值 | 含义 |
|:---|:---|:---|
| `seq_page_cost` | 1.0 | 顺序读一个页面的代价（基准） |
| `random_page_cost` | 4.0 | 随机读一个页面的代价（SSD 建议改为 1.1-1.5） |
| `cpu_tuple_cost` | 0.01 | 处理一行的 CPU 代价 |
| `cpu_index_tuple_cost` | 0.005 | 处理一个索引条目的 CPU 代价 |
| `cpu_operator_cost` | 0.0025 | 执行一次操作符的 CPU 代价 |

```sql
-- SSD 存储时调整（让优化器更倾向使用索引）
SET random_page_cost = 1.1;
SET effective_cache_size = '12GB';  -- 告知优化器可用缓存大小（影响代价估算）
```

### 2.2 rows / actual rows 差异

`rows` 是优化器估算值，`actual rows` 是实际值。差距大说明统计信息过时：

```sql
-- 估算 3 行，实际 2000 行 → 统计信息严重失准
-- → 执行 ANALYZE 更新统计
ANALYZE orders;

-- 查看统计信息最后更新时间
SELECT relname, last_analyze, last_autoanalyze
FROM pg_stat_user_tables
WHERE relname = 'orders';
```

### 2.3 Buffers 解读

```
Buffers: shared hit=4 read=1 written=0
          │             │
          │             └── 从磁盘读取的页数（越少越好）
          └── 从 shared_buffers 缓存命中的页数（越多越好）
```

---

## 三、扫描方式对比

### 3.1 Sequential Scan（全表扫描）

```
Seq Scan on orders  (cost=0.00..1845.00 rows=100000 width=64)
```

顺序读取整张表。适合：
- 无合适索引
- 返回行数超过表总行数的 ~5-10%（优化器认为索引扫描 + 随机 I/O 比顺序扫描更慢）

### 3.2 Index Scan（索引扫描）

```
Index Scan using idx_orders_user_id on orders
  Index Cond: (user_id = 42)
```

通过索引找到 ctid，再回表（Heap）读取完整行。每次回表是随机 I/O。

### 3.3 Index Only Scan（仅索引扫描）

```
Index Only Scan using idx_orders_covering on orders
  Index Cond: (user_id = 42)
  Heap Fetches: 0  ← 无需回表
```

查询所需列全在索引中（INCLUDE 列），直接从索引返回数据。

### 3.4 Bitmap Index Scan + Bitmap Heap Scan

```
Bitmap Heap Scan on orders
  Recheck Cond: (user_id = 42)
  ->  Bitmap Index Scan on idx_orders_user_id
        Index Cond: (user_id = 42)
```

两阶段：先扫描索引收集所有匹配行的位图（按物理块排序），再按块顺序读 Heap（减少随机 I/O）。适合返回行数适中的场景。

---

## 四、Join 算法对比

### 4.1 Nested Loop Join

```
Nested Loop
  ->  Seq Scan on users u
  ->  Index Scan on orders o
        Index Cond: (o.user_id = u.id)
```

外层每行驱动内层扫描，内层需要有好的索引。适合：外层结果集小 + 内层有索引。

### 4.2 Hash Join

```
Hash Join
  Hash Cond: (o.user_id = u.id)
  ->  Seq Scan on orders o
  ->  Hash
        ->  Seq Scan on users u
```

先扫描较小的表建哈希表，再扫描大表用哈希查找匹配行。需要 `work_mem` 容纳哈希表。

```sql
-- 查看 Hash Join 是否溢出到磁盘
EXPLAIN (ANALYZE, BUFFERS)
SELECT ...;
-- "Batches: 4" → 哈希表分 4 批处理，说明 work_mem 不足
-- "Batches: 1" → 完全在内存中，理想状态

-- 增加 work_mem 让 Hash Join 在内存完成
SET work_mem = '256MB';
```

### 4.3 Merge Join

```
Merge Join
  Merge Cond: (u.id = o.user_id)
  ->  Sort (或 Index Scan)  on users u
  ->  Sort (或 Index Scan)  on orders o
```

两边都已排序时直接合并（类似归并排序的 merge 步骤）。如果数据已有索引排序，Merge Join 非常高效。

---

## 五、常见慢查询优化案例

### 5.1 缺少索引

```sql
-- 慢：Seq Scan
EXPLAIN SELECT * FROM orders WHERE status = 'pending' AND created_at > now() - interval '1 day';

-- 优化：创建复合索引
CREATE INDEX idx_orders_status_created ON orders(status, created_at DESC)
WHERE status IN ('pending', 'processing');  -- 部分索引进一步减小体积
```

### 5.2 隐式类型转换导致索引失效

```sql
-- 失效：varchar 列和 integer 参数类型不匹配
SELECT * FROM users WHERE phone_number = 13800138000;  -- int 参数，varchar 列

-- 正确：类型匹配
SELECT * FROM users WHERE phone_number = '13800138000';

-- 或：创建表达式索引
CREATE INDEX idx_users_phone_int ON users(phone_number::bigint);
```

### 5.3 OR 条件优化

```sql
-- 慢：OR 条件可能不走索引
SELECT * FROM orders WHERE user_id = 1 OR user_id = 2;

-- 优化 1：改为 IN
SELECT * FROM orders WHERE user_id IN (1, 2);

-- 优化 2：UNION ALL（当两边过滤结果集差异大时）
SELECT * FROM orders WHERE user_id = 1
UNION ALL
SELECT * FROM orders WHERE user_id = 2;
```

### 5.4 分页性能优化

```sql
-- 传统分页（深度分页性能差，需要扫描 offset+limit 行）
SELECT * FROM orders ORDER BY id LIMIT 20 OFFSET 100000;

-- 游标分页（Keyset Pagination，性能稳定）
SELECT * FROM orders WHERE id > :last_id ORDER BY id LIMIT 20;
```

### 5.5 使用 pg_stat_statements 找慢查询

```sql
-- 启用 pg_stat_statements
-- postgresql.conf: shared_preload_libraries = 'pg_stat_statements'
CREATE EXTENSION pg_stat_statements;

-- 找总耗时最高的查询
SELECT
    round(total_exec_time::numeric, 2) AS total_ms,
    calls,
    round(mean_exec_time::numeric, 2) AS mean_ms,
    round(stddev_exec_time::numeric, 2) AS stddev_ms,
    left(query, 100) AS query_snippet
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- 找平均最慢的查询
SELECT * FROM pg_stat_statements
ORDER BY mean_exec_time DESC LIMIT 10;

-- 重置统计
SELECT pg_stat_statements_reset();
```
