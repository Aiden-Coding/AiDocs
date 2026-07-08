---
title: Flink Savepoint 恢复与版本迁移
hide_title: true
sidebar_label: Savepoint 恢复与迁移
---

## Flink Savepoint 恢复与版本迁移

除了 Checkpoint 之外，Flink 还提供了更适合运维管理的**Savepoint**机制，用于手动触发、保存作业状态，以及实现作业升级、迁移和回滚。

---

## 一、 Checkpoint 与 Savepoint 的本质区别

- **Checkpoint**：由 Flink 运行时自动触发，目的是实现故障恢复。它属于集群内部的“短期状态快照”，通常具有较强的时间敏感性。
- **Savepoint**：由用户手动触发，是一种稳态、可管理、可迁移的状态快照。它用于生产作业升级、版本回滚、迁移到新集群或新版本时的有意识状态保全。

### 关键差异

- **触发方式**：Checkpoint 自动触发；Savepoint 手动触发。
- **用途场景**：Checkpoint 主要用于故障恢复；Savepoint 用于升级、迁移与回滚。
- **生命周期**：Checkpoint 通常由 Flink 运行时自动清理；Savepoint 需要运维团队手动管理和清理。

---

## 二、 Savepoint 生成与管理实践

### 1. 生成 Savepoint

```bash
bin/flink savepoint :jobId [:targetDirectory]
```

- `jobId`：目标作业 ID。
- `targetDirectory`：可选的远程存储路径，如 `s3://bucket/flink/savepoints/`。

### 2. 查询 Savepoint

```bash
bin/flink savepoint :jobId
```

该命令会返回当前作业的 Savepoint 目录位置。

### 3. 取消作业并保留 Savepoint

```bash
bin/flink stop -p :targetDirectory :jobId
```

这可以保证在关闭作业之前生成一个最新的 Savepoint，并清理正在运行的 Job。

---

## 三、 Savepoint 恢复与版本迁移策略

### 1. 直接恢复旧作业

```bash
bin/flink run -s :savepointPath :jarFile
```

- 如果新作业的算子链、状态注册名称完全兼容，则可直接恢复运行。
- 该方法适用于小范围的修复或回滚。

### 2. 兼容性迁移（状态名一致）

- 通过 `StateBackend` 保持一致的状态存储格式。
- 如果作业并发度变化，Flink 会根据子任务数量执行状态重分区。

### 3. 版本升级与作业结构调整

当算子结构产生变更时，需要：
1. 保持旧版与新版的 state-name 一致；
2. 尽量避免拆分或重命名关键注册状态；
3. 使用 `savepoint.restore-mode` 等配置项进行兼容性恢复。

---

## 四、 Flink 1.19+ 生产运维最佳实践

- **定期保存 Savepoint**：对长期运行作业，每次发布前都生成一次 Savepoint。
- **使用对象存储**：优先将 Savepoint 存放于 S3/HDFS 等高可用远程存储。
- **不依赖 Savepoint 清理**：由于 Savepoint 是运维资产，需要定期审计并手动清理过期文件。
- **Savepoint 与 Checkpoint 分离**：不要将 Savepoint 的目录与自动 Checkpoint 的目录混用，避免误删。

---

## 五、 常见问题

### Q1: 如果 Savepoint 恢复失败，怎么办？

1. 检查保存的 Savepoint 是否完整；
2. 确认新作业的算子名称与状态名称是否一致；
3. 如果 Job 代码变更过大，考虑先在测试环境中进行状态转移验证。

### Q2: 何时使用 `-s` 恢复而不是 `-c` 重新启动？

当你需要保留旧作业的状态并继续执行时，使用 `-s`。
当你只需要全新提交一个作业，不关心旧状态时，使用 `-c`。
