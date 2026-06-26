# Spring IoC 与 AOP 源码级解析

Spring 框架是 Java 企业级开发的事实标准。在高级面试中，Spring 的底层源码（如 Bean 的生命周期、三级缓存解决循环依赖、AOP 动态代理）是必考的硬核内容。

---

## 一、 Spring Bean 的生命周期

Spring Bean 的生命周期非常复杂，但可以概括为四个核心阶段：**实例化 -> 属性赋值 -> 初始化 -> 销毁**。

```mermaid
graph TD
    A[实例化 Instantiation] --> B[属性赋值 Populate]
    B --> C[初始化 Initialization]
    C --> D[销毁 Destruction]
```

### 1. 详细生命周期链路

1. **实例化（Instantiation）**：
   - 对应方法：`createBeanInstance()`。通过反射或工厂方法创建 Bean 实例。
2. **属性赋值（Populate）**：
   - 对应方法：`populateBean()`。进行依赖注入（DI），填充 Bean 的属性。
3. **初始化（Initialization）**：
   - **Aware 接口回调**：如果 Bean 实现了 `BeanNameAware`、`BeanFactoryAware` 等接口，Spring 会回调对应方法，注入容器上下文。
   - **BeanPostProcessor 前置处理**：执行所有已注册的 `BeanPostProcessor` 的 `postProcessBeforeInitialization()` 方法。
   - **初始化方法回调**：
     - 如果实现了 `InitializingBean` 接口，执行 `afterPropertiesSet()`。
     - 如果配置了自定义的 `init-method`，执行该初始化方法。
   - **BeanPostProcessor 后置处理**：执行所有已注册的 `BeanPostProcessor` 的 `postProcessAfterInitialization()` 方法。**AOP 动态代理通常就是在此阶段生成的。**
4. **销毁（Destruction）**：
   - 当容器关闭时，触发销毁流程：
     - 如果实现了 `DisposableBean` 接口，执行 `destroy()`。
     - 如果配置了自定义的 `destroy-method`，执行该方法。

---

## 二、 三级缓存与循环依赖

循环依赖是指两个或多个 Bean 互相持有对方的引用，例如 Class A 依赖 Class B，Class B 又依赖 Class A。

Spring 默认支持**单例（Singleton）**作用域下的**属性注入**循环依赖，而不支持构造器注入的循环依赖。Spring 是通过**三级缓存**机制来解决这个问题的。

### 1. 三级缓存的定义

在 `DefaultSingletonBeanRegistry` 类中，定义了以下三个 Map：

```java
// 一级缓存：存放完全初始化好的单例 Bean（可以直接使用的成品）
private final Map<String, Object> singletonObjects = new ConcurrentHashMap<>(256);

// 二级缓存：存放早期暴露的单例 Bean（已经实例化但尚未填充属性、未初始化的半成品）
private final Map<String, Object> earlySingletonObjects = new ConcurrentHashMap<>(16);

// 三级缓存：存放单例工厂对象（ObjectFactory），用于生成早期暴露的 Bean 或者是其 AOP 代理对象
private final Map<String, ObjectFactory<?>> singletonFactories = new HashMap<>(16);
```

### 2. 解决循环依赖的核心流程

假设 A 和 B 互相依赖：

```mermaid
sequenceDiagram
    autonumber
    participant Spring as Spring 容器
    participant A as Bean A (半成品)
    participant B as Bean B (半成品)

    Spring->>A: 1. 实例化 A (放入三级缓存 singletonFactories)
    Spring->>A: 2. 属性赋值 A (发现依赖 B)
    A->>Spring: 3. getBean(B)
    Spring->>B: 4. 实例化 B (放入三级缓存 singletonFactories)
    Spring->>B: 5. 属性赋值 B (发现依赖 A)
    B->>Spring: 6. getBean(A) (从缓存中查找)
    Spring->>B: 7. 从三级缓存获取 A 的 ObjectFactory 并调用 getObject()
    Note over Spring, B: 若 A 有 AOP 代理，则在此处生成 A 的代理对象并放入二级缓存
    B->>Spring: 8. 注入 A (半成品/代理对象)
    Spring->>B: 9. 初始化 B 成功 (放入一级缓存 singletonObjects)
    Spring->>A: 10. 注入 B (成品)
    Spring->>A: 11. 初始化 A 成功 (放入一级缓存 singletonObjects)
```

### 3. 为什么必须是三级缓存？二级缓存不行吗？

- 如果**没有 AOP**，确实只需要二级缓存。在实例化 A 之后，直接把 A（半成品）放入二级缓存，B 注入 A 时直接从二级缓存拿即可

如果**存在 AOP**，A 需要被代理。按照 Spring 的设计原则，**代理对象应该在 Bean 初始化阶段（AnnotationAwareAspectJAutoProxyCreator）创建**，而不是在实例化阶段创建

但是，如果发生了循环依赖，B 必须在初始化之前就注入 A 的代理对象

**三级缓存的作用**：三级缓存中存放的是 `ObjectFactory`。当 B 需要注入 A 时，B 会调用 A 的 `ObjectFactory.getObject()`。这个工厂方法会判断 A 是否需要被代理：如果需要，就提前创建 A 的代理对象并返回；如果不需要，就返回原始的 A

  因为 `ObjectFactory.getObject()` 每次调用都会生成一个新的代理对象（或者执行一次判断逻辑）。为了保证单例，必须将生成的早期代理对象放入二级缓存中缓存起来，确保后续其他地方注入 A 时拿到的是同一个代理对象。

---

## 三、 Spring AOP 底层原理

Spring AOP 是基于动态代理实现的。在运行时，Spring 会根据目标类是否实现了接口，动态选择使用 **JDK 动态代理** 还是 **CGLIB 动态代理**。

### 1. 代理的选择策略（`DefaultAopProxyFactory`）

```java
public class DefaultAopProxyFactory implements AopProxyFactory, Serializable {
    @Override
    public AopProxy createAopProxy(AdvisedSupport config) throws AopConfigException {
        if (config.isOptimize() || config.isProxyTargetClass() || hasNoUserSuppliedProxyInterfaces(config)) {
            Class<?> targetClass = config.getTargetClass();
            if (targetClass == null) {
                throw new AopConfigException("TargetSource cannot determine target class");
            }
            // 如果目标类是接口，或者目标类是 Proxy 的子类（已经是JDK代理类），依然使用 JDK 动态代理
            if (targetClass.isInterface() || Proxy.isProxyClass(targetClass)) {
                return new JdkDynamicAopProxy(config);
            }
            // 否则，使用 CGLIB 动态代理
            return new ObjenesisCglibAopProxy(config);
        } else {
            // 默认情况下，如果目标类实现了接口，使用 JDK 动态代理
            return new JdkDynamicAopProxy(config);
        }
    }
}
```

### 2. AOP 链式调用与责任链模式

Spring AOP 将切面（Aspect）中的通知（Advice，如 `@Before`、`@After`、`@Around`）统一封装为 **`MethodInterceptor`（方法拦截器）**。

当目标方法被调用时，Spring 会将所有适用于该方法的拦截器组成一个**拦截器链（Interceptor Chain）**，并通过**责任链模式**进行链式调用。

```java
public class ReflectiveMethodInvocation implements MethodInvocation, Cloneable {
    protected final Object proxy;
    protected final Object target;
    protected final Method method;
    protected Object[] arguments;
    private final List<?> interceptorsAndDynamicMethodMatchers;
    // 当前执行的拦截器索引，初始化为 -1
    private int currentInterceptorIndex = -1;

    public Object proceed() throws Throwable {
        // 如果已经执行完了所有的拦截器，直接调用目标方法（通过反射）
        if (this.currentInterceptorIndex == this.interceptorsAndDynamicMethodMatchers.size() - 1) {
            return invokeJoinpoint();
        }

        // 获取下一个拦截器
        Object interceptorOrInterceptionAdvice =
            this.interceptorsAndDynamicMethodMatchers.get(++this.currentInterceptorIndex);

        // 链式调用：将当前 MethodInvocation 对象（this）传给拦截器
        // 拦截器内部会再次调用 invocation.proceed()，从而形成递归调用
        return ((MethodInterceptor) interceptorOrInterceptionAdvice).invoke(this);
    }
}
```

这种基于递归的责任链模式，优雅地实现了前置通知、后置通知、环绕通知以及异常通知的嵌套执行。
