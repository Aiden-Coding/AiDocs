---
title: Java 日常开发语言基础
sidebar_label: 日常开发基础
sidebar_position: 7
---

# Java 日常开发语言基础

本文面向已经开始编写 Java 业务代码的读者，梳理从类型和控制流程到对象设计、异常处理及常用标准库的核心实践。重点是正确使用语言和 API；集合源码、泛型底层与并发原理分别见相关专题。

## 1. 类型与表达式

Java 类型分为基本类型和引用类型。基本类型变量直接保存值；引用类型变量保存对象引用。赋值和传参都是值传递：传引用类型时，复制的是引用值，因此方法可以通过该引用修改对象状态，但给形参重新赋值不会改变调用方变量。

数值运算需要留意整数溢出、整除截断和隐式类型提升。需要精确十进制计算时使用 `BigDecimal`，并从字符串或明确的十进制值构造，除法时指定舍入方式。

```java
BigDecimal total = new BigDecimal("19.95");
BigDecimal count = BigDecimal.valueOf(3);
BigDecimal average = total.divide(count, 2, RoundingMode.HALF_UP);
```

引用比较 `==` 判断是否为同一对象；内容相等通常使用 `equals`。字符串内容比较不要使用 `==`。对于可能为空的值，先明确空值策略，再调用方法，避免隐式 `NullPointerException`。

## 2. 类、接口与对象设计

- 用接口表达调用方需要的能力，用组合表达对象间的协作；只有确实存在可复用的“是一个”关系时才考虑继承。
- 将对象维持在创建后有效的状态：通过构造器或工厂方法校验必需数据，避免公开可变字段。
- 优先使用不可变值对象；集合字段可防御性复制，避免外部代码修改内部状态。
- 使用 `enum` 表示有限且固定的选项，避免用无约束的字符串或数字常量表示状态。
- 重写 `equals` 时同时实现 `hashCode`；作为哈希键的对象，其相等性相关字段在使用期间应保持稳定。

## 3. 控制流程与方法

条件分支应覆盖预期输入，并为不支持的状态提供明确处理。`switch` 表达式适合按离散值生成结果；循环应明确边界，避免在循环体中修改难以追踪的控制变量。

方法保持单一职责，参数和返回值表达清晰。集合或数组参数若会被修改，应在文档或类型约定中说明；否则按只读输入处理。避免通过 `null` 同时表示多种业务含义，必要时使用明确结果类型或 `Optional`。

## 4. 异常与资源管理

- 对可恢复且调用方能处理的情况使用受检异常；对违反调用约定或不可恢复的程序错误使用运行时异常。
- 不要捕获后静默忽略异常。捕获异常时补充上下文，或在合适边界转换为领域异常并保留原始 cause。
- 不要用异常控制常规分支，也不要捕获 `Throwable` 来掩盖虚拟机级错误。
- 使用 `try-with-resources` 管理实现 `AutoCloseable` 的资源，如流、连接和文件句柄。

```java
try (BufferedReader reader = Files.newBufferedReader(path, StandardCharsets.UTF_8)) {
    return reader.lines().toList();
} catch (IOException e) {
    throw new UncheckedIOException("读取文件失败: " + path, e);
}
```

## 5. 字符串、日期时间与正则

### 字符串

`String` 不可变，适合表示文本值。循环中大量拼接使用 `StringBuilder`；格式化输出使用 `String.format` 或 `formatted`。比较文本内容使用 `equals`，不要依赖字符串常量池行为。

### 日期时间

新代码优先使用 `java.time`：用 `Instant` 表示时间线上的时刻，用 `LocalDate` 表示日期，用 `LocalDateTime` 表示不带时区的本地日期时间，用 `ZonedDateTime` 表示带时区的日期时间。跨服务传输时明确时区或统一使用 UTC，展示时再转换到用户时区。

### 正则表达式

固定表达式可预编译为 `Pattern`，每次匹配创建 `Matcher`。区分整串匹配 `matches()` 和子串查找 `find()`；对来自用户的复杂表达式设置长度和执行边界，避免灾难性回溯造成拒绝服务。

## 6. 集合、Optional 与空值

根据访问和更新模式选择集合：需要保持插入顺序时使用 `LinkedHashMap`，需要排序时使用 `TreeMap`，一般键值查找使用 `HashMap`。集合框架源码和复杂度详见[集合专题](0-collection-framework.md)。

`Optional<T>` 主要用于表达可能缺失的返回值。使用 `map`、`flatMap`、`orElseGet` 表达转换和默认值；避免将 Optional 用作字段、方法参数或集合元素，也不要调用 `get()` 前不检查存在性。

返回空集合通常比返回 `null` 更容易调用。对于必须区分“缺失”和“空”的场景，应使用明确的类型和契约，而不是依赖调用方猜测。

## 7. 编码习惯检查表

- 公共方法有明确的输入、输出、空值和异常约定。
- 金额和精度敏感计算不使用二进制浮点数直接表示十进制金额。
- 资源在所有执行路径都能关闭，异常保留根因和必要上下文。
- 时间值明确表示时区语义，格式化仅用于输入输出边界。
- 可变对象不作为长期哈希键，集合不暴露内部可变状态。
- 日志记录业务定位所需信息，不记录密码、令牌等敏感数据。

## 延伸阅读

- [Java 集合框架底层源码](0-collection-framework.md)
- [Java 核心机制：异常、反射与泛型](1-java-core-fundamentals.md)
- [Java I/O 与序列化](4-io-serialization.md)
- [Java 后端知识体系补充路线](6-java-backend-roadmap.md)
