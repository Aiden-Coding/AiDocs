---
title: Redis 命令、事务、Lua 与客户端
hide_title: true
sidebar_label: 命令、事务与客户端
sidebar_position: 6
---

## Redis 命令、事务、Lua 与客户端

Redis 的性能和正确性不仅取决于服务端数据结构，也取决于命令选择、请求组织方式和客户端对重定向及失败的处理。本章从日常命令讲到事务、脚本和客户端协议。

## 一、命令选择与复杂度

Redis 命令的复杂度由操作和数据规模共同决定。使用前应查看命令文档中的复杂度，尤其避免在主线程上对超大集合执行线性扫描或删除。

| 需求 | 常用命令 | 注意事项 |
| --- | --- | --- |
| 读写字符串 | `GET`、`SET`、`MGET`、`MSET`、`INCR` | `SET key value EX seconds NX` 可将写入与过期/条件组合为一个原子命令 |
| 哈希字段 | `HGET`、`HSET`、`HMGET`、`HSCAN` | 大 Hash 使用 `HSCAN` 分批遍历，避免 `HGETALL` 一次返回过多数据 |
| 集合与有序集合 | `SADD`、`SISMEMBER`、`ZADD`、`ZRANGE`、`ZRANGEBYSCORE` | 范围结果数量也影响耗时与响应大小 |
| 列表与流 | `LPUSH`、`BRPOP`、`XADD`、`XREADGROUP` | 选择阻塞读取时需设置超时并管理消费者生命周期 |
| 键空间 | `EXISTS`、`TYPE`、`TTL`、`SCAN` | 生产环境避免 `KEYS *`；`SCAN` 可能返回重复项，调用方需容忍并持续迭代直到游标归零 |

`DEL` 对集合类大 Key 可能产生明显延迟；可使用 `UNLINK` 将释放内存安排到后台执行。`SCAN`、`SSCAN`、`HSCAN`、`ZSCAN` 每次返回数量是提示值，不是严格上限。

## 二、事务与乐观并发

`MULTI` 开始事务，后续命令进入队列，`EXEC` 依次执行；`DISCARD` 放弃队列。执行期间不会插入其他客户端命令，因此事务中的命令序列具有隔离性。

Redis 事务**不提供回滚**：语法错误可在 `EXEC` 前拒绝整个队列，但运行时错误不会撤销已成功执行的其他命令。需要读后写条件时，可使用 `WATCH key` 监视键；若 `EXEC` 前键被修改，事务不会执行，客户端应重新读取并按有界次数重试。`WATCH` 是客户端连接状态，完成后应 `UNWATCH` 或结束事务。

事务不会自动将多条命令变成跨分片原子操作。Cluster 中事务涉及的键需位于同一哈希槽，建议用 `{tag}` 哈希标签将相关键放在一起。

## 三、Lua 脚本与 Redis Functions

Lua 脚本通过 `EVAL` / `EVALSHA` 在服务端执行，可将检查与更新组合成原子操作，减少网络往返。键通过 `KEYS` 显式传入，普通参数通过 `ARGV` 传入；脚本访问的键必须遵循 Cluster 同槽限制。

```lua
-- 仅当余额足够时扣减；KEYS[1] 为余额键，ARGV[1] 为扣减额
local balance = tonumber(redis.call('GET', KEYS[1]) or '0')
local amount = tonumber(ARGV[1])
if balance < amount then
  return 0
end
redis.call('DECRBY', KEYS[1], amount)
return 1
```

脚本运行期间会阻塞该实例处理其他命令，因此脚本应短小、执行时间有界，不要遍历大集合或执行不可控循环。`SCRIPT LOAD` 可预加载脚本，客户端遇到 `NOSCRIPT` 时应重新加载后重试。Redis 7.0 引入 Redis Functions（`FUNCTION LOAD`、`FCALL`），用于部署和管理服务端函数；它与临时脚本的生命周期管理不同。

## 四、RESP、Pipeline 与连接池

Redis 客户端通过 TCP 使用 RESP 协议交换命令和响应。RESP2 是广泛使用的协议格式；Redis 6.0 起支持 RESP3，客户端需协商后才能使用其新增响应类型。

Pipeline 将多条独立命令批量发送，减少网络往返，但它本身**不提供事务原子性**。应限制每批命令数量和响应体积，避免客户端或服务端缓冲区过大。需要原子执行时选事务或脚本。

连接池应复用连接并设置合理的最大连接数、获取超时、空闲回收和命令超时。阻塞命令（如 `BLPOP`）会独占连接，通常使用独立连接或专用池。连接池大小需结合实例承载能力与应用副本数评估。

## 五、Cluster 客户端路由与失败处理

客户端应支持 Cluster 拓扑发现并按键槽路由请求。收到 `MOVED` 时应更新槽位映射并向目标节点重试；`ASK` 是迁槽期间的临时重定向，客户端需先向目标节点发送 `ASKING` 再重试该请求。

连接断开或超时不等于命令未执行：写命令可能已在服务端成功但响应丢失。只有具备幂等语义或请求去重机制时，才可安全自动重试。事务及脚本使用的多个键应通过哈希标签确保同槽。客户端需设置连接、命令和拓扑刷新超时，并观测重试率、重定向率及连接池等待时间。
