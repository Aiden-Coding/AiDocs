---
title: Spring 循环依赖深度进阶解析
hide_title: true
sidebar_label: 循环依赖深度剖析
---

## Spring 循环依赖深度进阶解析

在基础篇中我们了解了三级缓存的概念。本篇将深入源码细节，探讨 Spring 解决循环依赖的边界条件：为什么构造器注入不行？为什么 `@Async` 会导致循环依赖失效？

---

## 一、 为什么构造器注入不支持循环依赖？

Spring 解决循环依赖的核心前提是：**允许对象在属性注入之前，先将一个“半成品”（只有引用地址，未填充属性）暴露出去。**

### 1. 实例化 vs 属性赋值
- **属性注入**（Setter 或 `@Autowired`）：Spring 先调用构造函数实例化 $A$，此时 $A$ 的引用已经存在，可以存入三级缓存，再进行属性注入。
- **构造器注入**：在实例化 $A$ 的过程中，就需要传入 $B$。此时 $A$ 还没有完成实例化，也就无法将自己作为半成品暴露给 $B$。

### 2. 数学模型表示
如果在构造阶段 $A$ 依赖 $B$ ($A \xrightarrow{ctor} B$) 且 $B$ 依赖 $A$ ($B \xrightarrow{ctor} A$)，则形成了一个不可满足的死循环：
$$
\text{Instantiate}(A) \implies \text{need}(B) \implies \text{Instantiate}(B) \implies \text{need}(A) \implies \dots
$$

---

## 二、 三级缓存代码级执行逻辑

位于 `DefaultSingletonBeanRegistry` 中的核心获取逻辑：

```java
protected Object getSingleton(String beanName, boolean allowEarlyReference) {
    // 1. 尝试从一级缓存获取（成品）
    Object singletonObject = this.singletonObjects.get(beanName);
    if (singletonObject == null && isSingletonCurrentlyInCreation(beanName)) {
        // 2. 尝试从二级缓存获取（半成品）
        singletonObject = this.earlySingletonObjects.get(beanName);
        if (singletonObject == null && allowEarlyReference) {
            synchronized (this.singletonObjects) {
                singletonObject = this.singletonObjects.get(beanName);
                if (singletonObject == null) {
                    singletonObject = this.earlySingletonObjects.get(beanName);
                    if (singletonObject == null) {
                        // 3. 从三级缓存获取 ObjectFactory
                        ObjectFactory<?> singletonFactory = this.singletonFactories.get(beanName);
                        if (singletonFactory != null) {
                            // 执行 getObject()，如果是 AOP 代理则在此处生成
                            singletonObject = singletonFactory.getObject();
                            // 升级到二级缓存，并移除三级缓存
                            this.earlySingletonObjects.put(beanName, singletonObject);
                            this.singletonFactories.remove(beanName);
                        }
                    }
                }
            }
        }
    }
    return singletonObject;
}
```

---

## 三、 `@Async` 导致的循环依赖崩溃

这是一个在生产环境下极易触发的经典线上问题。

### 1. 现象
如果 $A$ 和 $B$ 循环依赖，且 $A$ 的某个方法标注了 `@Async`，启动时会报错：
`Bean with name 'A' has been injected into other beans... but has been wrapped which means that other beans do not use the final version of the bean.`

### 2. 崩溃原因
- **AOP 代理时机**：普通的 AOP 代理（如 `@Transactional`）是由 `AnnotationAwareAspectJAutoProxyCreator` 实现的，它支持在三级缓存调用时提前生成代理。
- **`@Async` 代理时机**：`@Async` 是由 `AsyncAnnotationBeanPostProcessor` 实现的。它**不属于**常规 AOP 体系，不会在三级缓存的 `getObject()` 中被调用。
- **结果**：
  1. $B$ 注入了 $A$ 的原始对象（或者早期的普通代理对象）。
  2. $A$ 本身在初始化完成（`initializeBean`）阶段，又被 `@Async` 处理器包装成了一个新的代理对象。
  3. Spring 检查发现注入给 $B$ 的 $A$ 与最终容器里的 $A$ **不是同一个对象**，为了防止逻辑错误，强制抛出异常。

### 3. 黄金避坑方案
- **方法一**：使用 `@Lazy` 注解。在 $B$ 注入 $A$ 时加上 `@Lazy`，这样 $B$ 注入的是一个 $A$ 的代理占位符，直到真正使用时才会去容器取 $A$，避开了循环依赖的即时校验。
- **方法二**：重构代码。循环依赖通常意味着职责划分不清晰，尝试将公共逻辑提取到三级 Service 中。

---

## 四、 总结

三级缓存是 Spring 为了兼容 **Bean 生命周期原则**（代理应在最后阶段生成）与 **循环依赖**（需提前生成代理）之间的精妙权衡。深入理解这一机制，不仅有助于排查启动报错，更能让我们在设计微服务时对组件的隔离性有更深体会。
