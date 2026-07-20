---
title: Linux CPU 与内存性能调优
hide_title: true
sidebar_label: CPU 与内存性能调优
sidebar_position: 0
---

## Linux CPU 与内存性能调优

---

## 一、CPU 性能分析

### 1.1 快速定位 CPU 瓶颈

```bash
# 总览：CPU 使用率、负载、进程状态
top -bn 1 | head -5

# 关键指标解读（top 头部）
# %us: 用户态 CPU（应用代码）
# %sy: 内核态 CPU（系统调用）
# %ni: nice 调整后的用户态
# %id: 空闲
# %wa: 等待 I/O（高则 I/O 瓶颈）
# %hi: 硬中断
# %si: 软中断（高则网络包处理压力大）
# %st: 虚拟机 steal（被宿主机抢占，云主机关注）

# 每个 CPU 核心状态
mpstat -P ALL 1 5

# 历史 CPU 使用趋势（sar）
sar -u 1 10           # 每秒采样，共 10 次
sar -u -f /var/log/sa/sa$(date +%d)  # 查看今日历史数据

# 按进程统计 CPU
pidstat -u 1 5        # 每秒展示各进程 CPU 占用
pidstat -u -p <pid> 1 # 指定进程
```

### 1.2 CPU 负载 vs CPU 使用率

```bash
# 查看负载均值（1/5/15 分钟）
uptime
cat /proc/loadavg

# 负载含义：等待运行（R状态）+ 不可中断（D状态）的进程数
# 负载 = CPU 核心数 时，CPU 刚好满载
# 负载 >> CPU 核心数，说明进程排队严重

# 4 核机器，负载 8 → CPU 使用率可能 100%，也可能 50%（4个D状态进程）
# 区分：如果 CPU 使用率低但负载高 → I/O 瓶颈（大量 D 状态进程）

# 查看当前 D 状态进程
ps aux | awk '$8=="D"{print $0}'
```

### 1.3 perf 性能剖析

```bash
# 统计指定进程的性能事件（10 秒）
perf stat -p <pid> sleep 10
# 关注：cache-misses（缓存未命中率）、branch-misses（分支预测失败率）

# 采样热点函数（CPU 性能剖析）
perf top -p <pid>

# 生成完整调用栈报告
perf record -g -p <pid> sleep 30
perf report --stdio | head -100

# 系统全局热点（无 -p 参数）
perf top

# 追踪上下文切换
perf stat -e context-switches,cpu-migrations -p <pid> sleep 10
```

### 1.4 火焰图生成

```bash
# 1. 采集数据
perf record -F 99 -p <pid> -g -- sleep 30

# 2. 生成折叠栈文件
perf script > out.perf
./FlameGraph/stackcollapse-perf.pl out.perf > out.folded

# 3. 生成 SVG
./FlameGraph/flamegraph.pl out.folded > flamegraph.svg

# 火焰图解读：
# - 横轴：CPU 时间占比（宽 = 慢）
# - 纵轴：调用栈深度
# - 宽而平的矩形 → 重点优化目标
```

---

## 二、内存性能分析

### 2.1 内存使用全景

```bash
# 概览（推荐日常使用）
free -h
#              total   used    free   shared  buff/cache  available
# Mem:         16Gi    4.2Gi   1.1Gi  512Mi   10.7Gi      11.0Gi
# available = free + 可回收的 buff/cache（这才是真正可用内存）

# 详细内存统计
cat /proc/meminfo

# 进程内存占用排序
ps aux --sort=-%mem | head -20

# 查看进程详细内存映射
pmap -x <pid> | sort -k3 -rn | head -20
# RSS（Resident Set Size）= 实际驻留物理内存
# PSS（Proportional SS）= 共享内存按比例分摊后的占用（更准确）
```

### 2.2 内存泄漏检测

```bash
# 方法 1：观察 RSS 持续增长
watch -n 5 "ps -o pid,rss,vsz,cmd -p <pid>"

# 方法 2：/proc/smaps 分析
cat /proc/<pid>/smaps | grep -A 1 "heap\|anon" | grep -E "Rss|Pss"
cat /proc/<pid>/smaps_rollup   # 汇总版本（内核 4.14+）

# 方法 3：valgrind（开发环境）
valgrind --leak-check=full --show-leak-kinds=all ./my_app

# 方法 4：jemalloc 内存分析（生产环境低开销）
LD_PRELOAD=/usr/lib/x86_64-linux-gnu/libjemalloc.so MALLOC_CONF=prof:true ./my_app
jeprof --pdf ./my_app jeprof.*.heap > memory.pdf

# Java 程序内存泄漏
jmap -heap <pid>          # 堆内存概况
jmap -histo <pid> | head  # 对象统计（类名+实例数+占用字节）
jmap -dump:format=b,file=heap.hprof <pid>  # 导出堆转储
# 用 MAT（Eclipse Memory Analyzer）分析 heap.hprof
```

### 2.3 HugePage 大页优化

标准页面大小 4KB，大页（HugePage）为 2MB 或 1GB，减少 TLB 压力，适合 JVM、数据库、Redis 等大内存应用。

```bash
# 查看大页配置
cat /proc/meminfo | grep Huge
grep -i huge /proc/meminfo

# 配置静态大页（系统启动分配）
echo 2048 > /proc/sys/vm/nr_hugepages   # 分配 2048 个 2MB 大页 = 4GB

# 永久配置
echo "vm.nr_hugepages = 2048" >> /etc/sysctl.conf

# 透明大页（THP）— 内核自动管理，但可能引起延迟抖动
cat /sys/kernel/mm/transparent_hugepage/enabled
# 数据库（MySQL/Redis）和低延迟应用建议关闭 THP
echo never > /sys/kernel/mm/transparent_hugepage/enabled
echo never > /sys/kernel/mm/transparent_hugepage/defrag

# JVM 使用大页
java -XX:+UseLargePages -XX:LargePageSizeInBytes=2m -jar app.jar
```

---

## 三、磁盘 I/O 调优

### 3.1 I/O 性能监控

```bash
# 磁盘 I/O 综合统计
iostat -x 1 5
# 关键指标：
# %util：磁盘使用率（接近 100% 说明 I/O 饱和）
# await：I/O 请求平均等待时间（ms）
# r_await/w_await：读/写等待时间
# svctm：I/O 服务时间（已废弃，参考意义有限）
# rrqm/s, wrqm/s：合并的读/写请求数（高说明顺序 I/O）

# 查看哪个进程在进行 I/O
iotop -o           # 只显示有 I/O 的进程
iotop -a           # 累计 I/O 统计
pidstat -d 1       # 各进程的 I/O 统计

# 查看特定进程的 I/O
cat /proc/<pid>/io
# rchar: 读字节数
# wchar: 写字节数
# read_bytes: 实际从磁盘读（非缓存）
# write_bytes: 实际写入磁盘
# cancelled_write_bytes: 被取消的写（如临时文件）
```

### 3.2 I/O 调度器

```bash
# 查看当前 I/O 调度器
cat /sys/block/sda/queue/scheduler
# [mq-deadline] kyber bfq none

# 调度器选择建议
# SSD / NVMe：none 或 mq-deadline（减少调度开销）
# HDD（机械盘）：mq-deadline 或 bfq（减少磁头寻道）
# 虚拟机：none（宿主机已有调度器）

# 运行时修改（临时）
echo none > /sys/block/sda/queue/scheduler

# 通过 udev 永久配置（/etc/udev/rules.d/60-io-scheduler.rules）
ACTION=="add|change", KERNEL=="nvme*", ATTR{queue/scheduler}="none"
ACTION=="add|change", KERNEL=="sd*", ATTR{queue/scheduler}="mq-deadline"
```

### 3.3 文件系统挂载优化

```bash
# /etc/fstab 挂载选项优化
# noatime：不更新文件访问时间（减少写操作，读密集型场景推荐）
# nodiratime：不更新目录访问时间
# barrier=0：关闭写屏障（性能提升但数据安全性降低，需有 RAID 缓存保护）

# 示例
/dev/sdb1  /data  ext4  defaults,noatime,nodiratime  0 2

# 调整预读大小（顺序读场景）
blockdev --setra 4096 /dev/sda   # 设置预读 512KB（4096 * 512B）
```

---

## 四、系统级参数调优汇总

```bash
# 文件描述符限制（高并发服务必须调整）
# 临时
ulimit -n 1000000
# 永久（/etc/security/limits.conf）
echo "* soft nofile 1000000" >> /etc/security/limits.conf
echo "* hard nofile 1000000" >> /etc/security/limits.conf
# 内核级
echo "fs.file-max = 1000000" >> /etc/sysctl.conf

# 查看当前系统打开的文件数
cat /proc/sys/fs/file-nr
# 输出：已用/0（已废弃）/最大值

# 进程最大线程数
sysctl kernel.threads-max

# 虚拟内存参数
sysctl vm.swappiness          # 默认 60，内存充足时设为 10 减少 swap 使用
sysctl vm.dirty_ratio          # 脏页占内存比例上限（默认 20%）
sysctl vm.dirty_background_ratio  # 后台写回阈值（默认 10%）

# 推荐生产配置
cat >> /etc/sysctl.conf << 'EOF'
vm.swappiness = 10
vm.dirty_ratio = 40
vm.dirty_background_ratio = 10
vm.overcommit_memory = 1
kernel.pid_max = 4194304
fs.file-max = 1000000
EOF
sysctl -p
```
