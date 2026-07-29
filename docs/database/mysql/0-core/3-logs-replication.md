---
title: MySQL 日志系统与主从复制原理
hide_title: true
sidebar_label: 日志系统与主从复制
---

## MySQL 日志系统与主从复制原理

在生产环境中，数据库的**高可用性**、**数据持久性（Crash-Safe）**以及**主从一致性**是企业级架构的底线。MySQL InnoDB 引擎通过一套精妙的日志系统（Redo Log、Undo Log、Binlog）和主从复制机制，完美地支撑了这些非功能性需求。

---

## 一、 MySQL 三大日志深度剖析

MySQL 架构分为两层：**Server 层**（负责 SQL 解析、优化、执行等）和 **存储引擎层**（InnoDB，负责数据读写）。日志系统也据此划分：

```mermaid
graph TD
    subgraph "Server 层"
        Binlog["Binlog: 归档日志 / 逻辑日志"]
    end
    subgraph "InnoDB 存储引擎层"
        Redo["Redo Log: 重做日志 / 物理日志"]
        Undo["Undo Log: 回滚日志 / 逻辑日志"]
    end
```

### 1. Redo Log（重做日志）—— 保证持久性与 Crash-Safe

- **作用**：确保事务提交后，即使数据库发生异常宕机，已提交的数据也不会丢失，实现 **Crash-Safe**。
- **原理：WAL（Write-Ahead Logging，预写日志）**：
  - 在 MySQL 中，如果每次修改都直接写入磁盘，会产生大量的随机 I/O，性能极差。
  - 因此，InnoDB 采用 WAL 机制：当数据发生修改时，先将修改记录写入 **Redo Log Buffer（内存）**，并更新内存中的数据页（Buffer Pool）。随后，在合适的时机将 Redo Log 顺序写入磁盘。
  - 顺序写磁盘的速度远快于随机写数据页，从而极大地提升了数据库的写性能。

- **刷盘策略（`innodb_flush_log_at_trx_commit`）**：

  这是调优数据库写入性能与安全性的核心参数：

| 参数值          | 刷盘行为                                                                                           | 安全性与性能                                                                          |
| :-------------- | :------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------ |
| **`0`**         | 每次事务提交时，只将日志留在 Redo Log Buffer 中。每秒由后台线程写入 OS Cache 并调用 `fsync` 刷盘。 | **性能最高，最不安全**。MySQL 崩溃或服务器断电都会丢失 1 秒的数据。                   |
| **`1`（默认）** | 每次事务提交时，都必须将日志写入 OS Cache 并调用 `fsync` 刷入磁盘。                                | **最安全，性能最差**。保证强一致性，绝对不丢数据。                                    |
| **`2`**         | 每次事务提交时，只将日志写入 OS Cache（操作系统缓存），每秒由后台线程调用 `fsync` 刷盘。           | **折中方案**。MySQL 崩溃不丢数据（因为在 OS Cache 中），但服务器断电会丢失 1 秒数据。 |

```mermaid
graph TD
    A[Redo Log Buffer] -->|commit| B{innodb_flush_log_at_trx_commit?}
    B -->|0| C[每秒刷盘]
    B -->|1| D[每次提交 fsync 刷盘]
    B -->|2| E[每次提交写 OS Cache, 每秒 fsync]
    C --> F[磁盘 Redo Log]
    D --> F
    E --> F
```

---

### 2. Binlog（归档日志）—— 保证备份与主从复制

- **作用**：用于数据备份、恢复，以及主从复制。
- **对比 Redo Log**：

| 维度         | Redo Log（重做日志）                                       | Binlog（归档日志）                                       |
| :----------- | :--------------------------------------------------------- | :------------------------------------------------------- |
| **实现层**   | InnoDB 存储引擎特有。                                      | MySQL Server 层实现，所有引擎通用。                      |
| **日志类型** | **物理日志**。记录的是“在某个数据页上做了什么修改”。       | **逻辑日志**。记录的是 SQL 语句或原始行数据。            |
| **写入方式** | **循环写**。空间固定，写满后会覆盖开头，无法用于历史恢复。 | **追加写**。写满一个文件后新建下一个，保存历史所有记录。 |

- **Binlog 格式对比**：
  - **`STATEMENT`**：记录 SQL 语句。日志量极小，但如果 SQL 中包含 `UUID()`、`NOW()` 等动态函数，会导致主从数据不一致。
  - **`ROW`（推荐）**：记录每一行数据的实际变更。绝对安全，但日志量极大（如一个 `UPDATE` 影响了 10 万行，会记录 10 万条变更）。
  - **`MIXED`**：折中方案。默认使用 STATEMENT，遇到可能导致不一致的函数时自动切换为 ROW。

---

### 3. Undo Log（回滚日志）—— 保证原子性与 MVCC

- **作用**：
  1. **实现事务回滚（原子性）**：当事务需要回滚时，InnoDB 会读取对应的 Undo Log，执行相反的逻辑操作（如原本是 `INSERT`，回滚时执行 `DELETE`）。
  2. **支撑 MVCC（多版本并发控制）**：Undo Log 保存了数据的历史版本，形成了版本链，供快照读（SELECT）使用。

---

## 二、 核心机制：两阶段提交（2PC）

在更新一条数据时，既要写 Redo Log，又要写 Binlog。如果写完其中一个后数据库突然宕机，就会导致两份日志数据不一致，进而导致主从数据不一致。

为了解决这个问题，MySQL 引入了**两阶段提交（Two-Phase Commit）**机制：

```mermaid
sequenceDiagram
    autonumber
    participant Executor as Executor (Server层)
    participant InnoDB as InnoDB (引擎层)
    participant Disk as 磁盘

    Executor->>InnoDB: 1. 加载数据页到内存，修改数据
    Executor->>InnoDB: 2. 写入 Redo Log (Prepare 状态)
    InnoDB->>Disk: 3. 刷盘 (Redo Prepare)
    Executor->>Disk: 4. 写入 Binlog
    Executor->>InnoDB: 5. 提交事务 (Commit 状態)
    InnoDB->>Disk: 6. 刷盘 (Redo Commit)
```

### 2. MTR (Mini-Transaction) 与 LSN (Log Sequence Number) 的关系

在 InnoDB 存储引擎中，对底层页面的一次原子性物理修改操作（如插入一条数据、分裂一个平衡节点）被称为一个 **MTR (Mini-Transaction)**。 MTR 产生的所有的 Redo Log 都是一个不容拆分、不可分割的整体。

- **LSN（日志序列号）**：是一个单调递增的 8 字节无符号整数，用来记录写入的 Redo Log 日志量。
- **协同机制**：
  - 每个 MTR 结束时，会将自己产生的 Redo Log 拷贝到系统的公共 **Redo Log Buffer**。
  - 拷贝的同时，系统的全局 LSN 会随之单调递增。
  - 数据页的头部会记录一个 `FIL_PAGE_LSN`（最后一次修改该页时的 LSN）。
  - **崩溃自愈的追溯**：在系统崩溃重新拉起后，MySQL 会对比磁盘数据页的 `FIL_PAGE_LSN` 与 Redo Log 的 LSN。只有当 `Redo LSN > FIL_PAGE_LSN` 时，才执行该日志中的页物理重做；凡是已经落盘的物理进度（`Redo LSN <= FIL_PAGE_LSN`）直接略过，**极大加速了崩溃恢复速度**。

---

### 3. 未提交事务回滚与崩溃恢复逻辑

当数据库在两阶段提交的任意时刻宕机，重启后会按照以下规则恢复：

1. **如果 Redo Log 处于 Commit 状态**：说明事务已完全提交，直接确认提交。
2. **如果 Redo Log 处于 Prepare 状态**：
   - 拿着该事务的 XID（全局事务ID）去 **Binlog** 中寻找对应的记录。
   - **如果 Binlog 中存在该 XID**：说明 Binlog 已经写成功，事务是安全的，**继续提交**。
   - **如果 Binlog 中不存在该 XID**：说明在写 Binlog 前就宕机了，为了防止主从不一致，**回滚事务**（利用 Undo Log）。

---

### 4. 组提交（Group Commit）机制与 I/O 吞吐演进

每次事务提交都要写磁盘（即调用 `fsync` 刷物理 IO），当面对万级 QPS 时，大量的磁盘 I/O 串行等待会导致物理吞吐直接见顶。为了破局，MySQL 引入了 **组提交（Group Commit）** 机制。

- **核心思想**：将多个并发请求的事务，组合成一个物理批次，只执行**一次**磁盘 `fsync` 刷物理设备。

#### 两阶段组提交的串行协调器

为了让 Redo Log 和 Binlog 在组提交时其数据块物理刷盘顺序绝对对齐，MySQL 在 5.6 之后设计了 Binlog 的三阶段队列（Pipeline）结构：

```mermaid
graph TD
    subgraph "三阶段队列 (Pipeline 协调)"
        A["Flush Stage: 写入 Binlog 内存缓冲"] -->|合并提交| B["Sync Stage: 多个事务统一 fsync 刷磁盘"]
        B -->|串行接手| C["Commit Stage: 统一在存储引擎侧提交"]
    end
```

- **Flush Stage (刷入内存段)**：
  - 队列中的第一个事务为主导者（Leader），其余事务为追随者（Follower）。
  - Leader 统一接收并把所有汇聚的并发事务的 Binlog 拷贝写入到系统的 OS Cache 中。
- **Sync Stage (刷入磁盘段)**：
  - 多个排队积攒的事务在这一步统一调用一次 `fsync` 逻辑，一次性把上面所有的 Binlog 物理落盘。可以通过以下参数进行积攒行为调优：
    - `binlog_group_commit_sync_delay`：规定在 `fsync` 之前，Leader 强制等待（Delay）的微秒数。
    - `binlog_group_commit_sync_no_delay_count`：即使等待时间未到，只要排队队列里的事务个数达到了此数值，自动触发刷盘。
- **Commit Stage (提交段)**：
  - 按队列里的既定顺序串行、安全地去 InnoDB 引擎内部执行最后的事务 Commit。

通过这套协调调度，MySQL 极大程度减少了最沉重的 $O(1)$ 磁盘 `fsync` 触发频率，将其转变为了批量高性能的组落盘，提升了万级吞吐表现。

---

## 三、 MySQL 主从复制原理

主从复制是实现读写分离、高可用架构的基石。

### 1. 复制流程

```mermaid
graph LR
    subgraph "Master 节点"
        M_DB["(Master DB)"] -->|写操作| M_Bin[Binlog]
        M_Bin -->|Dump 线程| Dump[Binlog Dump 线程]
    end
    subgraph "Slave 节点"
        Dump -->|网络传输| IO["I/O 线程"]
        IO -->|写入| Relay[Relay Log 中继日志]
        Relay -->|SQL 线程| SQL[SQL 线程]
        SQL -->|重放| S_DB["(Slave DB)"]
    end
```

1. **Master 节点**：当有写操作时，写入 Binlog。**Binlog Dump 线程** 监听 Binlog 的变更，并将 Binlog 内容发送给 Slave。
2. **Slave 节点（I/O 线程）**：接收 Master 发来的 Binlog，并将其顺序写入本地的 **Relay Log（中继日志）**。
3. **Slave 节点（SQL 线程）**：读取 Relay Log 中的变更，并在本地重放（Replay），从而保持与 Master 的数据一致。

---

### 2. 复制方式演进

- **异步复制（Asynchronous）**：
  - **原理**：Master 写入 Binlog 后，立即向客户端返回成功，不关心 Slave 是否收到。
  - **缺点**：如果 Master 宕机且数据未同步到 Slave，强行切换会导致**数据丢失**。
- **半同步复制（Semi-Synchronous）**：
  - **原理**：Master 写入 Binlog 后，必须等待**至少一个 Slave** 收到并写入 Relay Log 反馈 ACK 后，才向客户端返回成功。
  - **优点**：极大地提升了数据安全性，保证了主从切换时数据不丢失。
- **组复制（MGR, MySQL Group Replication）**：
  - **原理**：基于 Paxos 共识协议的多主/单主复制。要求超过半数节点同意，事务才能提交，实现了真正的强一致性与高可用。
