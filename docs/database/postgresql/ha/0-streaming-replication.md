---
title: PostgreSQL 流复制原理与搭建实战
hide_title: true
sidebar_label: 流复制原理与搭建
sidebar_position: 0
---

## PostgreSQL 流复制原理与搭建实战

---

## 一、WAL 与复制原理

### 1.1 WAL 工作机制

WAL（Write-Ahead Log）是 PostgreSQL 的持久化基础：**先写 WAL，再改数据页**。即使数据页未刷盘，重启时也可通过 WAL 重放恢复。

```mermaid
graph LR
    A[事务提交] --> B[WAL Record 写入 WAL Buffer]
    B --> C{synchronous_commit?}
    C -- on --> D[WAL 刷盘 fdatasync]
    D --> E[返回提交成功]
    C -- off --> F[立即返回提交成功]
    F --> G[后台 WAL Writer 异步刷盘]
    E --> H[bgwriter 异步将脏页刷到数据文件]
    G --> H
```

**WAL 文件结构**：

```
$PGDATA/pg_wal/
├── 000000010000000000000001   ← 16MB WAL 段文件（默认）
├── 000000010000000000000002
└── ...
```

文件名格式：`时间线ID(8位) + 逻辑段号高32位 + 段内序号低8位`

### 1.2 流复制架构

```mermaid
graph LR
    subgraph "Primary"
        W[WAL Writer] --> WF[WAL 文件 pg_wal/]
        WS[WAL Sender 进程]
        WF --> WS
    end
    subgraph "Standby"
        WR[WAL Receiver 进程] --> RW[Redo WAL]
        RW --> DP[数据页更新]
    end
    WS --TCP 流--> WR
```

**关键进程**：
- `wal sender`：Primary 上的复制发送进程（每个 Standby 对应一个）
- `wal receiver`：Standby 上的复制接收进程
- `startup`：Standby 的 WAL 应用进程（持续 Redo）

---

## 二、搭建流复制（手动）

### 2.1 Primary 配置

```bash
# postgresql.conf
wal_level = replica
max_wal_senders = 10         # 最大并发复制连接数
wal_keep_size = 1GB          # 保留用于复制的 WAL 大小
hot_standby = on             # 允许 Standby 执行只读查询

# pg_hba.conf — 允许 Standby 连接复制
# TYPE  DATABASE    USER         ADDRESS         METHOD
host    replication replicator   192.168.1.0/24  scram-sha-256
```

```sql
-- 创建复制用户
CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'your_password';

-- 重载配置（不需要重启）
SELECT pg_reload_conf();
```

### 2.2 Standby 初始化

```bash
# 1. 在 Standby 机器上，从 Primary 基础备份
pg_basebackup \
    -h primary_host \
    -U replicator \
    -p 5432 \
    -D /var/lib/postgresql/data \
    --wal-method=stream \
    --checkpoint=fast \
    --progress \
    --verbose

# 2. 创建 standby.signal 文件（PostgreSQL 12+ 方式）
touch /var/lib/postgresql/data/standby.signal

# 3. 配置 primary_conninfo（postgresql.conf 或 postgresql.auto.conf）
cat >> /var/lib/postgresql/data/postgresql.auto.conf << 'EOF'
primary_conninfo = 'host=192.168.1.10 port=5432 user=replicator password=your_password application_name=standby1'
hot_standby = on
EOF

# 4. 启动 Standby
pg_ctl start -D /var/lib/postgresql/data
```

### 2.3 监控复制状态

```sql
-- Primary 上查看复制状态
SELECT
    application_name,
    state,            -- streaming/catchup/backup
    sent_lsn,         -- 已发送到的 LSN
    write_lsn,        -- Standby 已写入 WAL 的 LSN
    flush_lsn,        -- Standby 已刷盘的 LSN
    replay_lsn,       -- Standby 已应用的 LSN
    write_lag,        -- 写入延迟
    flush_lag,        -- 刷盘延迟
    replay_lag,       -- 应用延迟（最终一致性延迟）
    sync_state        -- async/sync/quorum
FROM pg_stat_replication;

-- Standby 上查看复制状态
SELECT
    status,
    receive_start_lsn,
    received_lsn,
    last_msg_send_time,
    last_msg_receipt_time,
    latest_end_lsn,
    latest_end_time
FROM pg_stat_wal_receiver;

-- 计算复制延迟（字节数）
SELECT pg_current_wal_lsn() - replay_lsn AS lag_bytes
FROM pg_stat_replication;

-- 计算复制延迟（估算秒数）
SELECT EXTRACT(EPOCH FROM replay_lag) AS lag_seconds
FROM pg_stat_replication;
```

---

## 三、复制槽（Replication Slots）

复制槽确保 Standby 追上之前 WAL 不会被删除，防止 Standby 因短暂断连丢失 WAL。

```sql
-- 创建物理复制槽（流复制用）
SELECT pg_create_physical_replication_slot('standby1_slot');

-- 在 postgresql.auto.conf 使用复制槽
-- primary_slot_name = 'standby1_slot'

-- 查看复制槽状态
SELECT slot_name, slot_type, active, restart_lsn,
       pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS retained_wal
FROM pg_replication_slots;
-- retained_wal 过大（> 10GB）说明 Standby 长期断线，有 WAL 积压风险

-- 删除不再使用的复制槽（释放 WAL）
SELECT pg_drop_replication_slot('standby1_slot');
```

**⚠️ 注意**：复制槽在 Standby 离线时持续保留 WAL，如果 Standby 长期不连接，`pg_wal` 目录会无限增长直到磁盘耗尽。生产中建议监控 `retained_wal` 并设置告警。

---

## 四、同步复制

```sql
-- Primary postgresql.conf：配置同步 Standby
synchronous_standby_names = 'standby1'
-- 或任意 1 个同步：
synchronous_standby_names = 'FIRST 1 (standby1, standby2)'
-- 或 quorum 模式（任意 1/2 确认即可）：
synchronous_standby_names = 'ANY 1 (standby1, standby2)'

-- 查看同步状态
SELECT application_name, sync_state FROM pg_stat_replication;
-- sync_state: sync=同步复制, async=异步, potential=备用同步
```

---

## 五、手动 Failover 与 Switchover

```bash
# Switchover（计划切换，Primary 正常）
# 1. 确认 Standby 追上 Primary
psql -h primary -c "SELECT pg_current_wal_lsn();"
psql -h standby -c "SELECT pg_last_wal_replay_lsn();"

# 2. 在 Primary 上触发计划切换
pg_ctl promote -D /var/lib/postgresql/data    # 旧方式
# 或
psql -h primary -c "SELECT pg_switchover();"  # PostgreSQL 16+

# Failover（Primary 宕机，紧急切换）
# 1. 确认 Primary 确实宕机
# 2. 在 Standby 上提升为 Primary
pg_ctl promote -D /var/lib/postgresql/data

# 3. 验证提升成功
psql -h new_primary -c "SELECT pg_is_in_recovery();"
-- false → 已成为 Primary

# 4. 更新应用连接字符串指向新 Primary
# 5. 将旧 Primary 以 Standby 角色重新加入集群（pg_rewind）
pg_rewind \
    --target-pgdata=/var/lib/postgresql/data \
    --source-server="host=new_primary user=postgres" \
    --progress
```
