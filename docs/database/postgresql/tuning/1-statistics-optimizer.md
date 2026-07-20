---
title: PostgreSQL 统计信息与查询优化器
hide_title: true
sidebar_label: 统计信息与查询优化器
sidebar_position: 1
---

## PostgreSQL 统计信息与查询优化器

查询优化器是 PostgreSQL 的大脑，它依赖**统计信息**估算每种执行路径的代价，进而选出最优计划。理解统计信息的工作机制，是解决"为何优化器选错计划"的根本。

---

## 一、统计信息存储结构

### 1.1 pg_statistic 与 pg_stats

```sql
-- pg_statistic：原始统计数据（底层系统表）
SELECT * FROM pg_statistic
WHERE starelid = 'orders'::regclass
  AND staattnum = (SELECT attnum FROM pg_attribute
                   WHERE attrelid = 'orders'::regclass
                     AND attname = 'status');

-- pg_stats：可读性更好的视图（推荐使用）
SELECT
    attname        AS 列名,
    n_distinct     AS 唯一值估算,   -- 正数=绝对数量, 负数=占总行数比例
    null_frac       AS NULL占比,
    avg_width       AS 平均字节宽度,
    most_common_vals  AS 高频值MCV,
    most_common_freqs AS 高频值频率,
    histogram_bounds  AS 直方图边界
FROM pg_stats
WHERE tablename = 'orders'
  AND attname = 'status';
```

### 1.2 关键统计字段解读

| 字段 | 含义 | 对优化器的作用 |
|:---|:---|:---|
| `n_distinct` | 唯一值数量（-1 = 全部唯一） | 估算等值查询的选择率 |
| `null_frac` | NULL 值占比（0.0~1.0） | 影响 IS NULL 过滤的代价 |
| `most_common_vals` (MCV) | 出现最频繁的值列表 | 精确估算高频值的选择率 |
| `most_common_freqs` | MCV 各值的频率 | 配合 MCV 计算选择率 |
| `histogram_bounds` | 直方图边界（等频直方图） | 估算范围查询的选择率 |
| `correlation` | 物理顺序与逻辑顺序的相关性（-1~1） | 影响索引扫描的代价估算 |

```sql
-- correlation 接近 1 → 数据按该列物理有序 → Index Scan 随机 I/O 少，代价低
-- correlation 接近 0 → 数据随机分布 → Index Scan 需要大量随机 I/O，优化器倾向 Seq Scan
SELECT attname, correlation
FROM pg_stats
WHERE tablename = 'orders'
ORDER BY abs(correlation) DESC;
```

---

## 二、ANALYZE 触发机制

```sql
-- 手动触发（更新全表统计）
ANALYZE orders;

-- 只更新特定列（减少时间）
ANALYZE orders (user_id, status, created_at);

-- VACUUM + ANALYZE 一起执行
VACUUM ANALYZE orders;

-- 查看统计信息更新时间
SELECT relname, last_analyze, last_autoanalyze, n_mod_since_analyze
FROM pg_stat_user_tables
WHERE relname = 'orders';
-- n_mod_since_analyze 高 → 自上次 ANALYZE 后修改行数多，统计信息可能过时
```

### 2.1 Autovacuum 自动触发 ANALYZE

```ini
# 触发条件：修改行数 > threshold + scale_factor × reltuples
autovacuum_analyze_threshold   = 50     # 最少 50 行变化才触发
autovacuum_analyze_scale_factor = 0.05  # 默认 0.2，大表建议调小（如 0.01）

# 针对高频写入的表单独调整
ALTER TABLE orders SET (
    autovacuum_analyze_scale_factor = 0.01,
    autovacuum_analyze_threshold = 100
);
```

### 2.2 statistics_target — 统计精度

`default_statistics_target` 控制 MCV 列表和直方图的桶数（默认 100）：

```sql
-- 提高特定列的统计精度（适合基数高、范围查询多的列）
ALTER TABLE orders ALTER COLUMN created_at SET STATISTICS 500;
-- 然后重新 ANALYZE
ANALYZE orders (created_at);

-- 查看各列当前 statistics target
SELECT attname, attstattarget
FROM pg_attribute
WHERE attrelid = 'orders'::regclass
  AND attnum > 0
ORDER BY attnum;
-- attstattarget = -1 → 使用全局 default_statistics_target
```

---

## 三、选择率估算原理

优化器通过统计信息计算**选择率（Selectivity）**，即查询条件过滤后剩余行数的比例。

### 3.1 等值查询选择率

```sql
-- 对于 WHERE status = 'pending'
-- 优化器查 MCV 列表：
--   most_common_vals  = {'pending', 'completed', 'cancelled'}
--   most_common_freqs = {0.35,       0.50,        0.15}
-- 选择率 = 0.35，估算行数 = total_rows × 0.35

-- 如果 status 值不在 MCV 中：
-- 选择率 = (1 - sum(MCV频率)) / (n_distinct - len(MCV))
```

### 3.2 范围查询选择率（直方图）

```sql
-- 对于 WHERE created_at BETWEEN '2024-01-01' AND '2024-01-31'
-- 优化器用直方图边界 histogram_bounds 线性插值估算落在该范围的比例
-- histogram_bounds 桶越多（statistics_target 越大），估算越精准
```

### 3.3 多列联合选择率的误差

优化器默认假设各列**相互独立**，将多个条件的选择率相乘：

```sql
-- WHERE status = 'pending' AND region = 'north'
-- 独立假设：selectivity = 0.35 × 0.25 = 0.0875
-- 实际：如果 pending 订单主要来自 north 区，实际选择率可能是 0.30
-- → 严重低估，优化器可能选错计划
```

---

## 四、扩展统计（Extended Statistics）

针对多列相关性问题，PostgreSQL 10+ 提供扩展统计：

```sql
-- 1. 创建多列统计（捕获列间相关性）
CREATE STATISTICS orders_status_region ON status, region
FROM orders;

-- 触发 ANALYZE 收集扩展统计
ANALYZE orders;

-- 2. 查看扩展统计
SELECT stxname, stxkeys, stxkind
FROM pg_statistic_ext
WHERE stxrelid = 'orders'::regclass;
-- stxkind: d=ndistinct, f=功能依赖, m=MCV

-- 3. 验证效果：对比创建前后的估算行数
EXPLAIN SELECT * FROM orders WHERE status = 'pending' AND region = 'north';
-- rows 应更接近实际值
```

---

## 五、干预优化器：调试参数

当优化器选错计划时，可通过参数临时关闭某种执行策略来诊断：

```sql
-- 关闭 Seq Scan，强制走索引（诊断用，不要长期设置）
SET enable_seqscan = off;
EXPLAIN SELECT * FROM orders WHERE user_id = 42;

-- 关闭 Hash Join，强制 Nested Loop
SET enable_hashjoin = off;
SET enable_mergejoin = off;

-- 关闭并行查询
SET max_parallel_workers_per_gather = 0;

-- 调整 SSD 的随机 I/O 代价（让优化器更积极使用索引）
SET random_page_cost = 1.1;
SET effective_cache_size = '24GB';

-- 恢复所有设置
RESET ALL;

-- 会话级别设置（不影响其他连接）
SET LOCAL enable_seqscan = off;  -- 只在当前事务有效
```

### 5.1 plan_cache_mode — 参数化查询计划

```sql
-- 对于 prepared statement，PostgreSQL 5次后切换为 Generic Plan
-- 如果 Generic Plan 比 Custom Plan 差很多：
SET plan_cache_mode = force_custom_plan;   -- 每次都用参数值估算
SET plan_cache_mode = force_generic_plan;  -- 始终用通用计划

-- 查看 prepared statement 的计划
SELECT name, statement, prepare_time, calls, generic_plans, custom_plans
FROM pg_prepared_statements;
```

---

## 六、统计信息诊断工作流

```sql
-- 第一步：确认统计信息是否过时
SELECT relname,
       n_mod_since_analyze,
       last_autoanalyze,
       pg_size_pretty(pg_total_relation_size(relid)) AS size
FROM pg_stat_user_tables
WHERE n_mod_since_analyze > 10000
ORDER BY n_mod_since_analyze DESC;

-- 第二步：查看估算 vs 实际差距
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM orders WHERE status = 'pending';
-- "rows=XXX" (估算) vs "actual rows=YYY"
-- 差距 > 10x → 统计信息严重失准

-- 第三步：检查直方图桶数是否足够
SELECT attname, attstattarget,
       array_length(histogram_bounds, 1) AS histogram_buckets
FROM pg_stats
WHERE tablename = 'orders'
ORDER BY attname;

-- 第四步：更新统计并重新检查
ANALYZE orders;
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM orders WHERE status = 'pending';
```
