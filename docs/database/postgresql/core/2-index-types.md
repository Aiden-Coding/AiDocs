---
title: PostgreSQL 索引类型与选型指南
hide_title: true
sidebar_label: 索引类型与选型
sidebar_position: 2
---

## PostgreSQL 索引类型与选型指南

PostgreSQL 拥有最丰富的索引体系，不同类型针对不同查询模式深度优化。

---

## 一、B-Tree 索引（默认）

适用于等值查询、范围查询、排序，是绝大多数场景的首选。

### 1.1 内部结构

```
Root Page
├── Internal Page (key ≤ 100)
│   ├── Leaf Page: (1,ctid) (5,ctid) ... (100,ctid)
│   └── Leaf Page: (101,ctid) ...
└── Internal Page (key > 100)
    └── ...

← 双向链表连接所有叶子页（支持范围扫描）→
```

### 1.2 HOT 与索引

当 UPDATE 修改了**索引列**，必须在索引中同时插入新条目，索引膨胀快。若更新**非索引列**，PostgreSQL 使用 HOT 优化，不更新索引。

```sql
-- 创建标准 B-Tree 索引
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- 复合索引（列顺序决定适用查询）
-- 适用于：WHERE user_id = ? AND created_at > ?
-- 适用于：WHERE user_id = ?
-- 不适用：WHERE created_at > ?（跳过第一列）
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at DESC);

-- 部分索引（过滤条件，减小索引体积）
CREATE INDEX idx_orders_pending ON orders(created_at)
WHERE status = 'pending';

-- 表达式索引（对函数结果建索引）
CREATE INDEX idx_users_email_lower ON users(lower(email));
-- 然后查询必须用同样的表达式
SELECT * FROM users WHERE lower(email) = 'alice@example.com';

-- 包含索引（Index-Only Scan 不需要回表）
CREATE INDEX idx_orders_covering ON orders(user_id) INCLUDE (amount, status);
SELECT amount, status FROM orders WHERE user_id = 1;  -- Index-Only Scan

-- 并发创建索引（不锁表，生产推荐）
CREATE INDEX CONCURRENTLY idx_orders_created ON orders(created_at);
```

### 1.3 Visibility Map 与 Index-Only Scan

Index-Only Scan 只读索引而不回表，但必须确认行对当前快照可见。VM（Visibility Map）标记了哪些页面所有行都对所有事务可见：

```sql
-- 检查 Index-Only Scan 命中率（vm_hit vs heap_fetch）
EXPLAIN (ANALYZE, BUFFERS)
SELECT amount FROM orders WHERE user_id = 1;
-- "Heap Fetches: 0"  ← 完全 Index-Only，无需回表
-- "Heap Fetches: 50" ← 50 行需要回表确认可见性（VM 未标记为全可见）

-- 运行 VACUUM 更新 VM，提升 Index-Only Scan 效率
VACUUM orders;
```

---

## 二、GIN 倒排索引

GIN（Generalized Inverted Index）适用于**一个值对应多个 key** 的场景：数组、全文检索、JSONB。

### 2.1 全文检索

```sql
-- 创建 tsvector 列（存储处理后的词素）
ALTER TABLE articles ADD COLUMN ts_content tsvector
    GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || body)) STORED;

-- 在 tsvector 列上创建 GIN 索引
CREATE INDEX idx_articles_fts ON articles USING GIN(ts_content);

-- 全文查询
SELECT id, title
FROM articles
WHERE ts_content @@ to_tsquery('english', 'postgresql & index');

-- 中文全文检索（需要 zhparser 扩展）
CREATE INDEX idx_articles_zh ON articles USING GIN(to_tsvector('zhparser', body));

-- 高亮显示匹配词
SELECT ts_headline('english', body, to_tsquery('postgresql'))
FROM articles LIMIT 3;
```

### 2.2 数组查询

```sql
-- 数组列 GIN 索引
CREATE INDEX idx_products_tags ON products USING GIN(tags);

-- 数组包含查询（@>）
SELECT * FROM products WHERE tags @> ARRAY['electronics', 'sale'];

-- 数组重叠查询（&&）
SELECT * FROM products WHERE tags && ARRAY['new', 'featured'];

-- 数组元素查询（ANY）
SELECT * FROM products WHERE 'electronics' = ANY(tags);
```

### 2.3 JSONB 查询

```sql
-- JSONB 列 GIN 索引（默认索引所有键值对）
CREATE INDEX idx_events_data ON events USING GIN(data);

-- JSONB 包含查询（@>）— 使用 GIN 索引
SELECT * FROM events WHERE data @> '{"type": "purchase", "amount": 100}';

-- JSONB 键存在查询（?）
SELECT * FROM events WHERE data ? 'user_id';

-- JSONB 路径操作符（jsonb_path_ops，更小更快，但只支持 @> 操作）
CREATE INDEX idx_events_data_path ON events USING GIN(data jsonb_path_ops);
```

### 2.4 GIN 的 fastupdate 机制

GIN 索引更新代价高（需要更新倒排列表），`fastupdate=on` 先缓冲写入再批量合并：

```sql
-- 创建带 fastupdate 的 GIN 索引
CREATE INDEX idx_fts ON articles USING GIN(ts_content) WITH (fastupdate=on);

-- 手动刷新 fastupdate 缓冲（批量写入时执行）
SELECT gin_clean_pending_list('idx_fts');
```

---

## 三、GiST 通用搜索树

GiST（Generalized Search Tree）是可扩展索引框架，支持地理空间、范围类型、几何类型等。

```sql
-- PostGIS 地理空间索引
CREATE EXTENSION postgis;
CREATE INDEX idx_locations_geom ON locations USING GIST(geom);

-- 查找半径 1km 内的门店
SELECT name, ST_Distance(geom, ST_MakePoint(116.4, 39.9)::geography) AS dist
FROM stores
WHERE ST_DWithin(geom::geography, ST_MakePoint(116.4, 39.9)::geography, 1000)
ORDER BY dist;

-- 范围类型索引（daterange/tsrange/numrange）
CREATE TABLE bookings (
    id      serial PRIMARY KEY,
    room_id int,
    period  daterange,
    EXCLUDE USING GIST (room_id WITH =, period WITH &&)  -- 防止同房间时间段重叠
);
CREATE INDEX idx_bookings_period ON bookings USING GIST(period);

-- 查找某日期段内有预订的房间
SELECT room_id FROM bookings
WHERE period && '[2024-01-01, 2024-01-07)'::daterange;
```

---

## 四、BRIN 块范围索引

BRIN（Block Range Index）极小（每 128 页存一条索引项），适合**天然有序**的大表（时序数据、日志表、IoT 数据）。

```sql
-- 时序表（按 created_at 自然有序）
CREATE TABLE sensor_data (
    id         bigserial PRIMARY KEY,
    sensor_id  int,
    value      float,
    created_at timestamptz DEFAULT now()
);

-- BRIN 索引（pages_per_range=128 为默认值）
CREATE INDEX idx_sensor_created_brin ON sensor_data
    USING BRIN(created_at) WITH (pages_per_range=128);

-- 时间范围查询（BRIN 跳过不相关的块范围）
SELECT avg(value) FROM sensor_data
WHERE created_at BETWEEN '2024-01-01' AND '2024-01-31';

-- BRIN 索引大小对比
SELECT
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) AS index_size
FROM pg_indexes
WHERE tablename = 'sensor_data';
-- BRIN 通常比 B-Tree 小 100-1000 倍
```

---

## 五、Hash 索引

Hash 索引仅支持等值查询（`=`），但等值性能略优于 B-Tree，且体积更小（PostgreSQL 10+ WAL 安全）。

```sql
-- Hash 索引（仅适合等值查询，不支持范围/排序）
CREATE INDEX idx_sessions_token ON sessions USING HASH(token);

-- 适用查询
SELECT * FROM sessions WHERE token = 'abc123';

-- 不适用（需要用 B-Tree）
SELECT * FROM sessions WHERE token > 'abc';  -- 范围查询不用 Hash
```

---

## 六、索引选型速查

| 场景 | 推荐索引 | 原因 |
|:---|:---|:---|
| 等值 + 范围 + 排序 | B-Tree | 通用，支持全部操作符 |
| 频繁等值，不需范围 | Hash | 略快于 B-Tree，但功能受限 |
| 数组 / JSONB / 全文检索 | GIN | 倒排结构，高效处理一对多 |
| 地理空间 / 范围类型 / 几何 | GiST | 通用搜索树，可扩展 |
| 大表时序数据（天然有序） | BRIN | 极小索引，适合顺序数据 |
| 低基数列（如 status） | 部分索引 / 不建索引 | 低基数列索引效果差 |
| 覆盖查询（避免回表） | 包含索引（INCLUDE） | Index-Only Scan |

```sql
-- 查看索引使用情况（定期清理未使用的索引）
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan AS 扫描次数,
    pg_size_pretty(pg_relation_size(indexrelid)) AS 索引大小
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
-- idx_scan = 0 且索引很大 → 考虑删除
```
