---
title: PostgreSQL 关键参数调优手册
hide_title: true
sidebar_label: 关键参数调优
sidebar_position: 1
---

## PostgreSQL 关键参数调优手册

---

## 一、内存参数（最重要的调优方向）

### 1.1 shared_buffers — 共享缓冲区

PostgreSQL 自己管理的页面缓存，所有进程共享：

```ini
# 推荐：物理内存的 25%（不超过 40%）
# 超过 40% 反而可能因为与 OS 缓存竞争导致性能下降
shared_buffers = 8GB    # 32GB 机器

# 查看当前值
SHOW shared_buffers;

# 查看缓存命中率（正常应 > 99%）
SELECT
    sum(heap_blks_read)  AS disk_reads,
    sum(heap_blks_hit)   AS cache_hits,
    round(sum(heap_blks_hit)::numeric /
          nullif(sum(heap_blks_hit) + sum(heap_blks_read), 0) * 100, 2) AS hit_ratio
FROM pg_statio_user_tables;
```

### 1.2 work_mem — 排序/哈希内存

每个**排序或哈希操作**可使用的内存（不是每个连接，而是每个操作）：

```ini
# 默认 4MB，复杂查询场景严重不足
# 设置过大：连接数 × 操作数 × work_mem = 总内存占用（可能 OOM）
# 推荐：根据并发连接数估算
# 公式：work_mem = (RAM - shared_buffers) / (max_connections × 平均并发操作数)

work_mem = 64MB     # 中等并发（~100 连接）
work_mem = 256MB    # 低并发分析型查询

# 会话级临时调大（不影响全局）
SET work_mem = '1GB';
EXPLAIN (ANALYZE, BUFFERS) SELECT ... ORDER BY ...;
```

```sql
-- 检查 Sort 和 Hash 是否溢出到磁盘（Disk 代替 Memory）
EXPLAIN (ANALYZE)
SELECT user_id, count(*) FROM orders GROUP BY user_id ORDER BY count(*) DESC;
-- "Sort Method: external merge  Disk: 25MB" ← 溢出到磁盘，需增加 work_mem
-- "Sort Method: quicksort  Memory: 512kB"   ← 内存完成，理想
```

### 1.3 maintenance_work_mem — 维护操作内存

`VACUUM`、`CREATE INDEX`、`ALTER TABLE ADD FOREIGN KEY` 等维护操作使用：

```ini
# 推荐：物理内存的 5-10%，至少 256MB
maintenance_work_mem = 2GB  # 加速大表 VACUUM 和索引创建

# 也可以在 autovacuum worker 中单独设置
autovacuum_work_mem = 512MB  # -1 表示使用 maintenance_work_mem
```

### 1.4 effective_cache_size — 有效缓存大小

**不实际分配内存**，只是告诉优化器 OS 缓存 + shared_buffers 共有多少可用，影响索引扫描代价估算：

```ini
# 推荐：总 RAM 的 50-75%
effective_cache_size = 24GB  # 32GB 机器

# 设置过小 → 优化器低估缓存，倾向选 Seq Scan
# 设置过大 → 无实际危害，但可能过于乐观
```

---

## 二、WAL 参数

### 2.1 wal_level 与 synchronous_commit

```ini
# wal_level 决定 WAL 记录的详细程度
wal_level = replica      # 支持流复制（推荐）
# wal_level = logical    # 支持逻辑复制（需要时用）

# synchronous_commit 控制事务提交时等待 WAL 落盘的程度
synchronous_commit = on       # 默认：等待 WAL 写入本地磁盘后返回
synchronous_commit = off      # 异步提交（性能 +30%，但宕机可能丢失最近 wal_writer_delay 内的数据）
synchronous_commit = remote_write  # 等待 Standby 写入 WAL（不一定落盘）
synchronous_commit = remote_apply  # 等待 Standby 应用 WAL（强一致）
```

### 2.2 checkpoint 调优

```ini
# checkpoint_completion_target：目标完成时间（占两次 checkpoint 间隔的比例）
# 值越大，checkpoint 写入越分散，对 I/O 越友好
checkpoint_completion_target = 0.9   # 默认 0.9，一般不需改

# max_wal_size：触发 checkpoint 的最大 WAL 大小（增大可减少 checkpoint 频率）
max_wal_size = 4GB     # 默认 1GB，写密集型应用建议增大
min_wal_size = 1GB

# 查看 checkpoint 统计
SELECT * FROM pg_stat_bgwriter;
# checkpoints_req 高 → 说明 WAL 增长太快，需增大 max_wal_size
```

---

## 三、连接与并发

### 3.1 max_connections 与连接池

```ini
# 每个连接消耗约 5-10MB 内存，不要设置过大
max_connections = 200     # 应用服务器直连时的合理值
max_connections = 100     # 配合连接池（PgBouncer）时可以更低

# 预留给超级用户的连接数
superuser_reserved_connections = 3
```

### 3.2 PgBouncer 连接池

```ini
# pgbouncer.ini 关键配置
[databases]
mydb = host=127.0.0.1 port=5432 dbname=mydb

[pgbouncer]
pool_mode = transaction      # 事务级复用（推荐，比会话级复用率高）
max_client_conn = 10000      # 应用层最大连接数
default_pool_size = 50       # 每个 database/user 对的连接池大小
min_pool_size = 10
reserve_pool_size = 5        # 备用连接（应急使用）
server_idle_timeout = 600    # 空闲后端连接超时（秒）

# 注意：transaction 模式下 SET 变量、PREPARE、LISTEN 等无法正常工作
# 如需这些特性，改用 session 模式
```

```sql
-- 监控连接池使用情况（PgBouncer admin 控制台）
SHOW pools;
SHOW stats;
SHOW clients;
```

---

## 四、自动 VACUUM 调优

```ini
# 开启 autovacuum（强烈建议保持开启）
autovacuum = on

# 触发 VACUUM 的阈值（死元组数 > threshold + scale * reltuples）
autovacuum_vacuum_threshold = 50           # 默认，小表保护
autovacuum_vacuum_scale_factor = 0.02      # 默认 0.2，大表时改小（如 0.01）

# 触发 ANALYZE 的阈值
autovacuum_analyze_threshold = 50
autovacuum_analyze_scale_factor = 0.01     # 统计信息更新更积极

# autovacuum worker 数量（默认 3，高并发写入可增加）
autovacuum_max_workers = 5

# 单个 autovacuum 的成本限速（防止影响正常业务）
autovacuum_vacuum_cost_delay = 2ms         # 默认 2ms，降低可加速 VACUUM
autovacuum_vacuum_cost_limit = 400         # 默认 200，增大可加速 VACUUM

# 针对特定高写入表单独调整
ALTER TABLE high_write_table SET (
    autovacuum_vacuum_scale_factor = 0.01,
    autovacuum_vacuum_cost_delay = 1
);
```

```sql
-- 监控 autovacuum 是否跟上写入速度
SELECT relname,
       n_dead_tup,
       n_live_tup,
       round(n_dead_tup::numeric / nullif(n_live_tup, 0) * 100, 2) AS dead_ratio,
       last_autovacuum,
       last_autoanalyze
FROM pg_stat_user_tables
WHERE n_dead_tup > 10000
ORDER BY n_dead_tup DESC;
```

---

## 五、日志与监控配置

```ini
# 记录慢查询（生产必备）
log_min_duration_statement = 1000    # 记录超过 1 秒的查询（毫秒）
log_min_duration_statement = 500     # 对 OLTP 可降低到 500ms

# 记录锁等待
log_lock_waits = on
deadlock_timeout = 1s

# 记录 checkpoint 信息（监控 I/O 压力）
log_checkpoints = on

# 记录临时文件（work_mem 不足时的溢出文件）
log_temp_files = 64    # 记录超过 64MB 的临时文件

# 记录连接/断开（高并发下谨慎开启，日志量大）
# log_connections = on
# log_disconnections = on

# pg_stat_statements（慢查询分析）
shared_preload_libraries = 'pg_stat_statements'
pg_stat_statements.max = 10000
pg_stat_statements.track = all
```

---

## 六、生产推荐配置模板

```ini
# ========== 内存（假设 32GB RAM）==========
shared_buffers = 8GB
work_mem = 64MB
maintenance_work_mem = 2GB
effective_cache_size = 24GB
huge_pages = try           # 启用大页（THP 关闭情况下）

# ========== WAL ==========
wal_level = replica
max_wal_size = 4GB
min_wal_size = 1GB
checkpoint_completion_target = 0.9
synchronous_commit = on    # 数据安全优先

# ========== 连接 ==========
max_connections = 200
superuser_reserved_connections = 3

# ========== 并行查询 ==========
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
max_worker_processes = 16

# ========== 自动 VACUUM ==========
autovacuum_max_workers = 5
autovacuum_vacuum_scale_factor = 0.05
autovacuum_analyze_scale_factor = 0.02
autovacuum_vacuum_cost_delay = 2ms
autovacuum_vacuum_cost_limit = 400

# ========== 监控 ==========
shared_preload_libraries = 'pg_stat_statements'
log_min_duration_statement = 500
log_checkpoints = on
log_lock_waits = on
log_temp_files = 64
track_io_timing = on       # 追踪 I/O 时间（需要 OS 支持）
```
