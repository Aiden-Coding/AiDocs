---
title: PostgreSQL 备份恢复与 PITR 实战
hide_title: true
sidebar_label: 备份恢复与 PITR
sidebar_position: 3
---

## PostgreSQL 备份恢复与 PITR 实战

---

## 一、备份方案对比

| 方案 | 类型 | 停机 | 粒度 | 恢复速度 | 适用场景 |
|:---|:---|:---|:---|:---|:---|
| `pg_dump` | 逻辑备份 | 无 | 库/表 | 慢（需重导入） | 小库、跨版本迁移、表级恢复 |
| `pg_basebackup` | 物理备份 | 无 | 整个集群 | 快 | 搭建 Standby、基础备份 |
| PITR | 物理+WAL | 无 | 任意时间点 | 中等 | 误操作恢复、合规审计 |
| pgBackRest | 物理+WAL | 无 | 任意时间点+增量 | 快（并行） | 生产首选 |

---

## 二、pg_dump 逻辑备份

### 2.1 常用命令

```bash
# 备份单个数据库（自定义格式，支持并行恢复）
pg_dump -h localhost -U postgres -Fc -f /backup/mydb.dump mydb

# 备份为 SQL 文本（便于查看和跨平台）
pg_dump -h localhost -U postgres -Fp -f /backup/mydb.sql mydb

# 只备份结构（无数据）
pg_dump -h localhost -U postgres --schema-only -f /backup/mydb_schema.sql mydb

# 只备份数据（无结构）
pg_dump -h localhost -U postgres --data-only -f /backup/mydb_data.sql mydb

# 只备份特定表
pg_dump -h localhost -U postgres -t orders -t users -Fc -f /backup/selected.dump mydb

# 备份所有数据库（含角色和全局对象）
pg_dumpall -h localhost -U postgres -f /backup/all_databases.sql

# 并行备份（目录格式，-j 4 使用 4 个并行进程）
pg_dump -h localhost -U postgres -Fd -j 4 -f /backup/mydb_dir/ mydb
```

### 2.2 恢复

```bash
# 从自定义格式恢复（-j 4 并行）
pg_restore -h localhost -U postgres -d mydb -j 4 /backup/mydb.dump

# 只恢复特定表
pg_restore -h localhost -U postgres -d mydb -t orders /backup/mydb.dump

# 从 SQL 文本恢复
psql -h localhost -U postgres -d mydb -f /backup/mydb.sql

# 先创建数据库再恢复
createdb -h localhost -U postgres mydb_restored
pg_restore -h localhost -U postgres -d mydb_restored /backup/mydb.dump
```

---

## 三、pg_basebackup 物理备份

```bash
# 标准物理备份（WAL 方法：stream 边备份边传 WAL）
pg_basebackup \
    -h localhost \
    -U replicator \
    -D /backup/base/$(date +%Y%m%d_%H%M%S) \
    --wal-method=stream \
    --checkpoint=fast \
    --compress=9 \
    --progress \
    --verbose

# 验证备份完整性（PostgreSQL 13+）
pg_verifybackup /backup/base/20240101_120000

# 查看备份文件结构
ls /backup/base/20240101_120000/
# PG_VERSION  backup_label  global/  base/  pg_wal/  ...
```

---

## 四、WAL 归档配置（PITR 前提）

PITR 依赖连续的 WAL 存档，必须配置 `archive_command`：

```ini
# postgresql.conf
wal_level = replica       # 或 logical
archive_mode = on
archive_command = 'cp %p /archive/wal/%f && echo "archived %f"'
# %p = WAL 文件完整路径
# %f = WAL 文件名

# 验证归档命令（测试用）
archive_command = 'test ! -f /archive/wal/%f && cp %p /archive/wal/%f'
# test ! -f 防止覆盖已存在的归档文件

# 重载配置
SELECT pg_reload_conf();
```

```bash
# 确认归档工作正常
ls /archive/wal/ | tail -5

# 手动触发一次 WAL 段切换
psql -c "SELECT pg_switch_wal();"

# 检查归档状态
psql -c "SELECT archived_count, failed_count, last_archived_wal,
                last_archived_time, last_failed_wal, last_failed_time
         FROM pg_stat_archiver;"
# failed_count > 0 → 归档命令有问题，需立即处理
```

---

## 五、PITR 时间点恢复完整操作

### 5.1 确认恢复目标

```sql
-- 场景：2024-01-15 14:25:00 误执行了 DELETE FROM orders WHERE ...
-- 目标：恢复到 14:24:58（误操作前一刻）

-- 先找到误操作时间点
-- 查询 pg_log 或应用日志确认具体时间
```

### 5.2 执行恢复

```bash
# 步骤 1：停止 PostgreSQL
pg_ctl stop -D /var/lib/postgresql/data -m fast

# 步骤 2：备份当前数据目录（以防恢复失败还能回滚）
mv /var/lib/postgresql/data /var/lib/postgresql/data.broken

# 步骤 3：恢复最近一次基础备份
cp -r /backup/base/20240115_000000 /var/lib/postgresql/data
chown -R postgres:postgres /var/lib/postgresql/data

# 步骤 4：配置恢复参数（postgresql.conf 或 postgresql.auto.conf）
cat >> /var/lib/postgresql/data/postgresql.auto.conf << 'EOF'
# WAL 归档恢复命令
restore_command = 'cp /archive/wal/%f %p'

# 恢复目标：误操作前的时间点
recovery_target_time = '2024-01-15 14:24:58'

# 恢复到目标后的动作：promote（提升为 Primary）
recovery_target_action = 'promote'

# 恢复目标的精确控制
recovery_target_inclusive = false  # 不包含目标时间点本身的事务
EOF

# 步骤 5：创建恢复信号文件
touch /var/lib/postgresql/data/recovery.signal

# 步骤 6：启动 PostgreSQL 开始重放 WAL
pg_ctl start -D /var/lib/postgresql/data

# 步骤 7：监控恢复进度
tail -f /var/log/postgresql/postgresql-*.log
# 关注：
# LOG: starting point-in-time recovery to ...
# LOG: restore_command returned exit code 1 for ... （WAL 已追完）
# LOG: recovery stopping before commit of transaction ...
# LOG: pausing at the end of recovery
```

### 5.3 恢复后验证与清理

```sql
-- 连接数据库验证数据
SELECT count(*) FROM orders;
SELECT max(created_at) FROM orders;  -- 确认最新数据时间符合预期

-- 如果数据正确，完成恢复
SELECT pg_wal_replay_resume();  -- 解除暂停，正式提升为 Primary

-- 清理恢复配置（已自动处理，但建议确认）
-- recovery.signal 文件会被自动删除
-- postgresql.auto.conf 中的恢复参数可以手动清除
```

---

## 六、pgBackRest — 企业级备份方案

pgBackRest 提供增量备份、并行压缩、加密、云存储支持，是生产环境的首选。

### 6.1 安装与配置

```bash
# 安装
apt-get install pgbackrest  # Ubuntu/Debian

# 配置文件 /etc/pgbackrest/pgbackrest.conf
cat > /etc/pgbackrest/pgbackrest.conf << 'EOF'
[global]
repo1-path=/backup/pgbackrest
repo1-retention-full=2        # 保留 2 个全量备份
repo1-retention-diff=7        # 保留 7 个差异备份
compress-type=lz4             # 压缩算法
process-max=4                 # 并行进程数

[main]                        # stanza 名称（与 archive_command 对应）
pg1-path=/var/lib/postgresql/data
pg1-user=postgres
EOF
```

```ini
# postgresql.conf 配置归档
archive_command = 'pgbackrest --stanza=main archive-push %p'
archive_mode = on
```

```bash
# 初始化 stanza
pgbackrest --stanza=main stanza-create

# 验证配置
pgbackrest --stanza=main check
```

### 6.2 备份操作

```bash
# 全量备份
pgbackrest --stanza=main --type=full backup

# 差异备份（相对上次全量）
pgbackrest --stanza=main --type=diff backup

# 增量备份（相对上次任意备份）
pgbackrest --stanza=main --type=incr backup

# 查看备份列表
pgbackrest --stanza=main info
# stanza: main
#     status: ok
#     db (current)
#         wal archive min/max: 000000010000000000000001/0000000100000000000000FF
#         full backup: 20240101-000000F
#             timestamp start/stop: 2024-01-01 00:00:00 / 2024-01-01 00:05:30
#             wal start/stop: 000000010000000000000010 / 000000010000000000000012
#             database size: 10.2GB, database backup size: 10.2GB
```

### 6.3 pgBackRest PITR 恢复

```bash
# 恢复到指定时间点
pgbackrest --stanza=main \
    --delta \
    --target="2024-01-15 14:24:58" \
    --target-action=promote \
    --type=time \
    restore

# --delta：只替换变更的文件（速度更快）
# 恢复完成后启动 PostgreSQL
pg_ctl start -D /var/lib/postgresql/data
```

---

## 七、备份策略建议

```
每天 01:00  全量备份（pgBackRest full）
每 6 小时   差异备份（pgBackRest diff）
实时        WAL 归档（archive_command）

保留策略：
- 全量备份：保留 2 份（约 2 周）
- WAL 归档：保留 14 天（支持任意时间点恢复）

监控告警：
- pg_stat_archiver.failed_count > 0 → 立即告警
- 备份目录空闲空间 < 20% → 告警
- 最后备份时间 > 25h → 告警
```

```bash
# 定时任务（crontab）
0  1 * * *  pgbackrest --stanza=main --type=full backup
0  7,13,19 * * *  pgbackrest --stanza=main --type=diff backup

# 每日验证备份可用性
0  3 * * *  pgbackrest --stanza=main check
```
