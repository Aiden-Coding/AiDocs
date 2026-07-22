---
title: Redis 高可用集群架构
hide_title: true
sidebar_label: 高可用集群架构
sidebar_position: 4
---

## Redis 高可用集群架构

生产级 Redis 架构需应对海量并发与故障切换。本章深入剖析 Redis Cluster 扩容缩容、PSYNC2 主从同步优化、混合持久化恢复，以及运维监控最佳实践。

---

## 一、 Redis Cluster 扩容缩容与槽位迁移

当业务增长超过单节点容量或 QPS 上限时，需要动态扩容 Redis Cluster。

### 1. Cluster 拓扑与槽位分配

Redis Cluster 固定 **16384 个哈希槽（Slot）**，每个 Master 节点负责部分槽位。

```mermaid
graph TD
    subgraph "Redis Cluster (3 Master + 3 Slave)"
        subgraph "Master 节点"
            M1["(Master 1)"] -->|0-5460| Slot1["Slot 0-5460 (5461)"]
            M2["(Master 2)"] -->|5461-10922| Slot2["Slot 5461-10922 (5462)"]
            M3["(Master 3)"] -->|10923-16383| Slot3["Slot 10923-16383 (5461)"]
        end
        subgraph "Slave 节点"
            S1["(Slave 1)"] -->|同步| M1
            S2["(Slave 2)"] -->|同步| M2
            S3["(Slave 3)"] -->|同步| M3
        end
    end
```

### 2. 动态扩容流程

#### 步骤 1：启动新节点并加入集群

```bash
# 启动新 Redis 实例（端口 7006）
redis-server redis.conf

# 加入集群（假设集群已有 3 个 Master）
redis-cli --cluster add-node 127.0.0.1:7006 127.0.0.1:7001
```

#### 步骤 2：分配槽位（Reshard）

```bash
# 从现有节点迁移 2000 个槽位到新节点
redis-cli --cluster reshard 127.0.0.1:7001 \
  --cluster-from all \
  --cluster-to new_node_id \
  --cluster-slots 2000 \
  --cluster-yes
```

**槽位迁移原理**：
1. **源节点标记槽位为 `IMPORTING` 状态**。
2. **目标节点标记槽位为 `MIGRATING` 状态**。
3. **迁移命令**：`MIGRATE <target_host> <target_port> <key> 0 <timeout> COPY REPLACE`。
4. **客户端透明**：客户端查询槽位时，若遇到 `ASK` 重定向，按指引跳转到目标节点。

```mermaid
sequenceDiagram
    autonumber
    participant Client as 客户端
    participant Src as 源节点 (Migrating)
    participant Dest as 目标节点 (Importing)

    Client->>Src: 1. GET key (落入 Migrating 槽位)
    Src->>Client: 2. ASK <slot> <target_ip:port>
    Client->>Dest: 3. ASKING + GET key
    Dest->>Src: 4. MIGRATE key (COPY REPLACE)
    Src->>Dest: 5. 返回 key 数据
    Dest->>Client: 6. 返回 key 值
```

#### 步骤 3：添加副本节点

```bash
# 将新 Master 7006 添加副本 7007
redis-cli --cluster add-node 127.0.0.1:7007 127.0.0.1:7001 --cluster-slave --cluster-master-id new_master_id
```

### 3. 动态缩容流程

#### 步骤 1：迁移槽位出目标节点

```bash
# 将目标节点的所有槽位迁移到其他节点
redis-cli --cluster reshard 127.0.0.1:7001 \
  --cluster-to existing_node_id \
  --cluster-slots all \
  --cluster-from target_node_id \
  --cluster-yes
```

#### 步骤 2：清空并移除节点

```bash
# 清空目标节点数据（可选）
redis-cli -h 127.0.0.1 -p 7006 FLUSHALL

# 从集群中移除节点
redis-cli --cluster del-node 127.0.0.1:7001 <target_node_id>
```

---

## 二、 PSYNC2 主从同步优化

Redis 2.8 引入的 **PSYNC2** 协议解决了旧版 PSYNC 的频繁全量同步问题。

### 1. PSYNC2 核心机制

| 组件 | 说明 |
| :--- | :--- |
| **`repl_backlog`（复制积压缓冲区）** | 循环缓冲区，默认 1MB，主节点写入命令即写入此缓冲区 |
| **`psync_repl_offset`（复制偏移量）** | 主从节点各自维护写入/复制偏移量 |
| **`master_replid`（复制 ID）** | 每个 Master 有一个唯一 ID，新 Master 晋升后 ID 变更 |

### 2. PSYNC 全量 vs 部分同步判断流程

```mermaid
graph TD
    A[Slave 发起 PSYNC] --> B{主节点 replid 匹配?}
    B -->|否| C["全量同步 (FULLRESYNC)"]
    B -->|是| D{偏移量在 backlog 范围?}
    D -->|否| C
    D -->|是| E["部分同步 (CONTINUE)"]
    E --> F[发送 backlog 增量数据]
```

**判断逻辑**：
1. **ReplID 匹配**：判断是否为同一主节点（避免主从切换后的 ID 变更导致误判）。
2. **偏移量范围检查**：`psync_offset >= master_repl_offset - backlog_size`。

### 3. 优化建议

- **调大复制积压缓冲区**：应对网络抖动场景

  ```text
  repl-backlog-size 1024mb  # 默认 1MB，高并发环境建议 512MB~1GB
  ```

- **配置从节点超时**：

  ```text
  repl-timeout 60  # 主从连接超时，默认 60 秒
  repl-diskless-sync-delay 5  # 无盘同步延迟，默认 5 秒
  ```

---

## 三、 混合持久化与恢复实战

### 1. 混合持久化原理

Redis 4.0+ 支持 AOF 重写时结合 RDB + AOF 增量的混合模式。在 Redis 7.0+ 引入 Multi-Part AOF 后，混合持久化的实现也得到了演进：
- **Redis 7.0 之前**：混合持久化将 RDB 快照和 AOF 增量数据合并写入同一个 `.aof` 文件中（文件头部为 RDB 格式，尾部为 AOF 命令格式）。
- **Redis 7.0 及之后**：基于 Multi-Part AOF，混合持久化将数据物理上隔离存储：
  - **Base AOF 文件**：以 RDB 格式存储的某个时间点的全量物理快照（以 `.rdb` 为后缀）。
  - **Incremental AOF 文件**：以 AOF 文本格式追加记录的增量命令（以 `.aof` 为后缀）。
  - **Manifest 清单文件**：追踪它们的状态。

```bash
# redis.conf 开启混合持久化
aof-use-rdb-preamble yes
```

### 2. 混合持久化的数据恢复流程

当 Redis 节点发生宕机并重启时，加载持久化数据的机制如下：

1. **寻找 Manifest 文件**：定位配置的 `appendonly.aof.manifest` 清单文件。
2. **加载 Base 部分**：根据清单，优先读取 Base AOF 文件（由于是 RDB 快照，解析速度极快，迅速还原绝大部分内存数据）。
3. **重放 Incremental 部分**：依次读取增量 AOF 命令文件并串行重放，补全快照之后产生的增量写命令。
4. **加载完成**：节点恢复到宕机前状态，开始对外提供服务。

### 3. RDB / AOF 混合故障恢复场景

在生产运维中，可能会遇到持久化文件损坏导致节点无法启动的情况。以下是故障场景与应对机制：

| 故障场景 | 现象与影响 | 恢复与修复策略 |
| :--- | :--- | :--- |
| **仅增量 AOF 损坏** | 节点启动报错，提示 AOF 文件格式不正确或解析失败 | 使用 `redis-check-aof --fix <filename>` 工具对损坏的增量 AOF 文件进行修复（会将未完整写入的损坏尾部指令截断丢弃），然后基于 Base 文件 + 修复后的增量 AOF 加载恢复。 |
| **仅 Base (RDB) 文件损坏** | 节点启动报错，无法解析 RDB 头部 | 使用 `redis-check-rdb <filename>` 尝试校验。如果损坏无法修复，只能依赖备份的 RDB 文件进行手动回滚，或依赖 Slave 节点数据同步。 |
| **清单 Manifest 文件损坏/丢失** | Redis 无法识别 Base 和 Incremental 关系，拒绝启动 | 如果物理数据文件依然完好，可以根据目录下的文件名手动重建 Manifest 文件（声明 Base 和 Incr 的版本与关系），或者直接将 Base 文件的文件名改为临时 `dump.rdb` 并通过普通 RDB 模式加载恢复。 |
| **全量物理损坏/数据丢失** | 文件被物理删除或彻底损坏 | 节点无法启动，数据彻底丢失。需利用外部的备份策略（如每天定时备份至 OSS / S3）下载备份文件导入恢复。 |

**故障演练与数据防丢最佳实践**：
1. **自动备份**：建议使用定时任务（如 crontab）每天或每小时将 Base AOF 和 Manifest 文件打包拷贝到异地冷备服务器。
2. **文件完整性校验**：定期在测试环境离线验证 RDB 和 AOF 文件的完整性，保障灾备方案真实可用。

---

## 四、 运维监控与指标采集

### 1. 核心监控指标

| 指标 | 命令 | 阈值告警 |
| :--- | :--- | :--- |
| **内存使用率** | `INFO memory` → `used_memory_peak` / `maxmemory` | > 85% |
| **连接数** | `INFO clients` → `connected_clients` | > 80% maxclients |
| **慢查询** | `SLOWLOG GET 10` | 单命令 > 100ms |
| **Keyspace 命中率** | `INFO stats` → `keyspace_hits` / (`hits` + `misses`) | < 95% |
| **主从延迟** | `INFO replication` → `slave_repl_offset` | > 1 秒 |
| **AOF 写入延迟** | `INFO persistence` → `aof_delayed_fsync` | > 10 次/分钟 |

### 2. 常用运维命令

```bash
# 查看内存使用详情
redis-cli --memstats

# 分析大 Key（需 redis-cli --bigkeys 配合）
redis-cli -h 127.0.0.1 -p 6379 --scan --pattern "*" | xargs redis-cli --bigkeys

# 生成内存分析报告（需 redis-rdb-tools）
rdb -c memory redis dump.rdb > memory_report.csv

# 查看慢查询日志
redis-cli SLOWLOG GET 20

# 手动触发 AOF 重写
redis-cli BGREWRITEAOF

# 手动触发 RDB 快照
redis-cli BGSAVE
```

### 3. 自动化监控方案

- **Prometheus + Redis Exporter**：

  ```yaml
  # prometheus.yml
  - job_name: 'redis'
    static_configs:
      - targets: ['localhost:9121']
  ```

- **Grafana Dashboard**：导入 Redis 官方 Dashboard（ID: 11899）

---

## 五、 Cluster 故障转移实战

### 1. 故障转移触发条件

- **主观下线（SDOWN）**：单个节点判定节点失联（`cluster-node-timeout`，默认 15 秒）。
- **客观下线（ODOWN）**：半数以上 Master 节点投票判定下线。

### 2. 故障转移流程

```mermaid
sequenceDiagram
    autonumber
    participant M1 as 旧 Master
    participant S1 as Slave 1
    participant M2 as Master 2
    participant Quorum as 哨兵/Quorum

    M1->>M2: 1. 心跳失败（网络分区）
    M2->>Quorum: 2. 标记 SDOWN
    Quorum->>Quorum: 3. 达到 ODOWN（半数同意）
    Quorum->>S1: 4. 选举 S1 为新 Master
    S1->>S1: 5. 提升为 Master（断开与 M1 关系）
    M1->>M1: 6. 网络恢复后降级为 Slave
```

### 3. 故障转移后的槽位重分配

```bash
# 查看集群状态
redis-cli --cluster info 127.0.0.1:7001

# 检查槽位分布
redis-cli --cluster check 127.0.0.1:7001

# 手动均衡槽位
redis-cli --cluster fix 127.0.0.1:7001
```

---

## 六、 高可用集群配置模板

### 1. Redis Cluster 配置（redis.conf）

```ini
# 基础配置
port 7001
cluster-enabled yes
cluster-config-file nodes.conf
cluster-node-timeout 15000
cluster-replica-validity-factor 10
cluster-migration-barrier 1
cluster-require-full-coverage no

# 持久化配置
appendonly yes
appendfsync everysec
aof-use-rdb-preamble yes
save 900 1
save 300 10
save 60 10000

# 内存配置
maxmemory 8gb
maxmemory-policy allkeys-lru

# 网络配置
bind 0.0.0.0
protected-mode yes
repl-backlog-size 1024mb
```

### 2. Sentinel 配置模板

```ini
sentinel monitor mymaster 127.0.0.1 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 60000
sentinel parallel-syncs mymaster 1
```

---

## 七、 常见故障排查

### 1. 槽位未完全分配（CLUSTER_DOWN）

**现象**：`CLUSTERDOWN Hash slot not served`

**排查**：

```bash
# 检查槽位分布
redis-cli --cluster info 127.0.0.1:7001

# 修复集群
redis-cli --cluster fix 127.0.0.1:7001
```

### 2. 主从同步失败（FULLRESYNC）

**现象**：从节点持续触发全量同步

**排查**：

```bash
# 检查复制偏移量
redis-cli INFO replication | grep -E "master_repl_offset|slave_repl_offset"

# 检查 backlog 大小
redis-cli CONFIG GET repl-backlog-size
```

### 3. 内存突增（OOM）

**排查**：

```bash
# 查看内存明细
redis-cli INFO memory | grep -E "used_memory_human|used_memory_peak_human"

# 分析大 Key
redis-cli --bigkeys
```
