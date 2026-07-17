---
title: 二、Java 新特性
sidebar_label: 2. Java 新特性
sidebar_position: 2
---

# 二、Java 新特性

本章涵盖 Java 17、Java 21 以及 Java 25 以来核心语法和平台底层特性的重大演进。

---

## 9. Java 17 到 25/26 的重大特性

Java 版本发布进入快速迭代期，长期支持版本（LTS）推出了多项极具区分度的重磅功能。

### Java 17（LTS）

- **密封类（Sealed Classes）**：提供细粒度的继承层次控制，修饰类只能被指定的子类继承。
- **Record 类**：支持原生定义只读的数据载体类（Data Class）。
- **去除了强反射访问限制**：对 JDK 内部模块的反射访问进行了默认封锁。

### Java 21（LTS）

- **虚拟线程（Virtual Threads）**：引入轻量级协程级线程模型，重塑高吞吐并发模型。
- **Switch 模式匹配（Pattern Matching for switch）**：正式转正，支持基于类型的多路分支选择。
- **Record 模式匹配**：支持通过解构的方式提取 Record 对象的值。
- **分代 ZGC（Generational ZGC）**：为 ZGC 引入分代收集机制，极大地减少了在高并发内存分配下的停顿时间。
- **结构化并发（Structured Concurrency）与作用域值（Scoped Values）**：预览阶段推出，提升异步多子任务的生命周期管理。

### Java 25/26 演进趋势

- **标准 HTTP/3 支持（JEP 517）**：JDK 标准 HTTP Client 原生支持基于 QUIC 协议的 HTTP/3。
- **AOT 缓存（Leyden 项目）**：将 AOT 编译后的预热信息与任意 GC 配合，实现对应用启动速度和冷启动内存的大幅优化。
- **原始类型模式匹配（Primitive Types in Patterns）**：自 Java 23 预览并在后续版本推进，允许对基本数据类型进行模式匹配。

---

## 10. Record 类的设计限制与选型

Record 类是 JVM 级原生提供的一种强约束性只读数据载体。

### 使用限制

- Record 类是隐式 `final` 的，不能被继承。
- Record 隐式继承自 `java.lang.Record`，由于 Java 是单继承机制，因此 Record 类**不能继承任何其他类**（但可以实现接口）。
- 其所有属性都是 `private final` 的，且不允许声明普通的实例成员变量，只能定义静态变量。

### 相比 Lombok `@Value` 的选型

- **Lombok `@Value`**：通过在编译期生成 Getter、`equals()`、`hashCode()`、`toString()` 等字节码来减少样板代码，本质上还是普通的类，可以自由继承其他父类，不受 JVM 底层运行时的特殊对待。
- **Java 原生 `Record`**：
  - **安全性与深层契约**：JVM 底层强保证其不可变性。
  - **更好的反射与序列化支持**：序列化时不需要调用构造方法或者特殊处理，反序列化时强制执行唯一的规范构造函数，防范了通过绕过构造方法修改数据的反序列化漏洞攻击。
  - **模式匹配解构**：可以直接在模式匹配中解构属性：

    ```java
    if (obj instanceof Point(int x, int y)) {
        System.out.println(x + y);
    }
    ```

- **选型建议**：如果仅仅是纯粹的数据解构与流转，优先使用 `Record`；如果需要与遗留系统继承体系耦合，或者需要动态定制 Getter/Setter 属性，选用 Lombok。

---

## 11. 密封类解决什么问题

密封类（Sealed Class）用于限制哪些类或接口可以继承或实现它们。

### 解决的痛点

在传统的继承体系中，类要么是开放的（任何开发者都可以随便继承），要么是封闭的（`final`，不允许任何人继承）。

而很多时候，类库的设计者希望**继承体系是可以被枚举和可控的**。例如，定义一个表示几何图形的基类，只允许圆形、矩形继承，不允许用户自定义其他图形混入。

密封类提供了一种**受限的多态性**：

```java
public sealed class Shape permits Circle, Rectangle {
}
```

### 与枚举、常规继承对比

| 特性 | 常规继承 | 密封类 | 枚举（Enum） |
| :--- | :--- | :--- | :--- |
| **实例数量限制** | 实例数量无限，子类型数量无限 | 实例数量无限，子类型数量在编译期确定 | 实例数量在编译期确定 |
| **可扩展性** | 完全开放，不可预测子类型 | 闭合子类列表，可安全使用模式匹配穷举 | 实例完全静态固定，无法进行动态类扩展 |
| **应用场景** | 通用多态（如 `List`） | 受限制的多态域（如语法树节点） | 固定常量集（如星期、状态码） |

---

## 12. Switch 模式匹配示例

Java 21 之后，`switch` 可以直接对对象的类型进行判断，配合守护条件 `when` 和 `null` 安全处理，能精简多路分支代码：

```java
public String formatObject(Object obj) {
    return switch (obj) {
        // 1. null 分支安全处理，无需在外部做空指针防范
        case null -> "object is null";
        
        // 2. 类型匹配并自动声明局部变量
        case Integer i -> String.format("int: %d", i);
        
        // 3. 带有 when 守卫条件的类型匹配
        case String s when s.isBlank() -> "empty string";
        case String s -> String.format("string content: %s", s);
        
        // 4. Record 类型解构匹配
        case Point(int x, int y) -> String.format("coordinate: %d, %d", x, y);
        
        // 5. 兜底默认分支
        default -> "unknown type";
    };
}
```

---

## 13. Scoped Values 作用域值

作用域值（Scoped Value）在 JDK 21 作为预览特性引入，是为**虚拟线程（Virtual Thread）**量身定制的单向线程上下文传递方案。

### ThreadLocal 的局限性

在传统的多线程模型中，`ThreadLocal` 用于存储线程独享的数据。然而，在虚拟线程时代，虚拟线程的启动量可能达到百万级。

如果继续使用 `ThreadLocal`：
1. **内存开销巨大**：`ThreadLocal` 内部维护的是一个 `ThreadLocalMap`，如果每个虚拟线程都持有一份较大的上下文对象，会导致堆内存迅速被撑爆。
2. **可变性风险**：`ThreadLocal` 支持 `set()` 修改，很难控制上下文在多层级调用中的数据一致性。
3. **内存泄漏**：如果不显式调用 `remove()`，在复用线程池的情况下容易导致内存泄漏。

### Scoped Value 的优势

- **单向只读传递**：数据一旦通过 `ScopedValue.where(KEY, VALUE).run(() -> { ... })` 绑定，在其执行作用域内就是只读的，子方法无法篡改。
- **超轻量**：它不是将数据存储在线程的 Map 里，而是通过栈帧的调用关系链以常量级别进行查找。
- **自动清除**：随着 `run()` 作用域的退出，绑定关系自动解除并被 GC 回收，不存在泄露风险，极大降低了百万级虚拟线程并发时的物理内存损耗。

---

## 14. Leyden 项目对启动速度的意义

Leyden 项目（Project Leyden）是 Java 平台针对启动慢、热身时间长这一核心缺陷所做的系统级重构。

- **工作机制**：在 Java 26 中，Leyden 引入了“AOT 缓存（AOT Cache）”。它不仅在运行前编译部分热点代码为原生机器码，更能将运行时垃圾回收器（GC）、类加载器以及 JIT 预热产生的临时对象状态，固化为一个持久化的静态快照缓存。
- **意义**：以往的 GraalVM 虽快，但存在动态特性限制（如对反射和 CGLIB 的支持不友好）。Leyden 项目与传统 JVM 保持 100% 兼容。在开启 Leyden AOT 缓存后，微服务和 Serverless 容器的启动时间能从数秒级压缩到数十毫秒，且无需热身即可达到最优吞吐量，为云原生 Serverless 带来了革命性的冷启动提速。

---

## 15. Java 26 标准 HTTP/3 支持

在 Java 26 中，JEP 517 正式让内置的标准 `HttpClient` 提供了对 **HTTP/3（基于 QUIC 协议）** 的全面支持。

- **解决的问题**：传统的 HTTP/2 在网络出现丢包时，会导致 TCP 队头阻塞（Head-of-Line Blocking），影响传输速度。而 HTTP/3 基于 UDP/QUIC 协议，各个流（Stream）之间完全独立，单个丢包不会阻塞其他数据流。
- **对 Java 生态的意义**：高并发的微服务通信在网络环境抖动（如云原生跨可用区、跨机房调用）时，可以无缝切换为 HTTP/3，从而实现更低的时延、更短的握手时间（QUIC 的 0-RTT 连接建立），这极大地改善了大规模微服务集群之间的通信吞吐和弱网抗抖动能力。
