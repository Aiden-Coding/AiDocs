---
title: 五、Spring 生态与 Boot 4.0
sidebar_label: 5. Spring 生态与 Boot 4.0
sidebar_position: 5
---

# 五、Spring 生态与 Boot 4.0

本章涵盖 Spring 核心原理、循环依赖解密、声明式事务失效场景以及 Spring Boot 4.0 颠覆性的底层变化。

---

## 34. Bean 生命周期与三级缓存机制

### IoC 容器启动与 Bean 生命周期

Spring IoC 容器启动的核心方法是 `AbstractApplicationContext.refresh()`。Bean 的生命周期可归纳为以下四个主要阶段：

1. **实例化（Instantiation）**：
   - 容器通过反射机制，根据 `BeanDefinition` 创建 Bean 实例的物理对象（类似于执行 `new` 操作）。
2. **属性赋值（Populate）**：
   - 依赖注入（DI）发生在此阶段，容器根据属性声明将其他依赖的 Bean（如 `@Autowired` 修饰的属性）注入到当前实例中。
3. **初始化（Initialization）**：
   - **Aware 接口回调**：注入 `BeanFactory`、`ApplicationContext`、`BeanName` 等容器上下文。
   - **BeanPostProcessor 前置处理**：调用所有注册的 `postProcessBeforeInitialization` 方法。
   - **执行初始化方法**：如果 Bean 实现了 `InitializingBean` 接口，调用 `afterPropertiesSet()` 方法；或执行自定义的 `@PostConstruct` 方法、`init-method`。
   - **BeanPostProcessor 后置处理**：调用所有注册的 `postProcessAfterInitialization` 方法。**Spring AOP 代理的创建即发生在此阶段**。
4. **销毁（Destruction）**：
   - 容器关闭时，执行 `@PreDestroy` 或 `DisposableBean.destroy()` 方法进行资源释放。

### 三级缓存解决循环依赖

Spring 使用三级缓存（均为 `Map` 结构）来解决属性注入时的**单例（Singleton）**循环依赖问题。

#### 三级缓存定义

- **一级缓存（`singletonObjects`）**：存放完全初始化好的、立即可用的成品单例 Bean。
- **二级缓存（`earlySingletonObjects`）**：存放提前暴露的、尚未进行属性注入的“半成品”半初始化 Bean。
- **三级缓存（`singletonFactories`）**：存放 Bean 的工厂对象（`ObjectFactory<?>`），用于延迟创建代理对象。

#### 解决循环依赖的流转流程（以 A 与 B 循环依赖为例）

1. 实例化 A，在将 A 的“早期引用”包装为 `ObjectFactory` 放入三级缓存中。
2. A 开始属性填充，发现依赖 B，于是去获取 B。
3. 发现 B 不在一级缓存中，于是开始实例化 B，同样把 B 的 `ObjectFactory` 放入三级缓存。
4. B 填充属性时，发现依赖 A。B 依次查找一级、二级缓存，均未命中，但命中了三级缓存中 A 的 `ObjectFactory`。
5. B 调用 A 的 `ObjectFactory.getObject()`。在此步骤中，如果 A 需要进行 AOP，会提前在此阶段执行 AOP 生成 **A 的早期代理对象**；如果不需要，则返回普通的 A 实例。
6. A 的早期代理对象（或普通实例）被放入二级缓存，同时将 A 从三级缓存中移除。
7. B 成功注入 A 的早期代理引用，顺利完成初始化，并将自己（成品 B）放入一级缓存。
8. B 返回给 A。A 注入成品 B，继续执行后续生命周期，最终将 A（或 A 的代理对象）放入一级缓存，循环依赖完美解决。

#### 为什么三级缓存中构造器注入的循环依赖无解

- 构造器注入发生于**实例化阶段**。在实例化完成之前，Spring 甚至无法将该 Bean 的 `ObjectFactory` 提前放入三级缓存中。
- 当 A 正在执行构造函数需要 B 时，B 还没有任何途径获取到 A 的“半成品”物理指针，导致整个初始化链陷入死锁，只能抛出 `BeanCurrentlyInCreationException`。

---

## 35. AOP 原理与声明式事务失效

### AOP 底层实现机制

Spring AOP 的底层是基于动态代理实现的，共有两种技术实现方式：

- **JDK 动态代理**：
  - **前提**：目标类必须实现**接口**。
  - **实现**：利用 `java.lang.reflect.Proxy` 动态生成目标接口的实现类字节码，并通过 `InvocationHandler` 进行方法拦截。
- **CGLIB 动态代理**：
  - **前提**：目标类没有实现接口，或者显式配置了强制使用 CGLIB（`proxy-target-class=true`）。
  - **实现**：利用 ASM 字节码生成框架，在运行期动态生成目标类的**子类**，并重写父类的方法来进行拦截。
  - **限制**：由于是生成子类重写，因此目标类不能由 `final` 修饰，目标方法也不能是 `final` 或 `private`。

### @Transactional 事务失效的典型场景

声明式事务是基于 AOP 代理实现的。如果调用没有经过代理对象，或者异常被吞掉，事务就会失效。

1. **类内部自调用**：
   - **现象**：类中非事务方法 A 直接通过 `this.B()` 调用同一个类中的事务方法 B。
   - **根因**：`this` 代表当前目标对象本身，而非 Spring 增强后的代理对象，因此方法 B 不会触发任何 AOP 拦截，事务逻辑无法切入。
   - **解决**：通过 `AopContext.currentProxy()` 获取当前代理对象调用，或将方法 B 拆分到其他 Service 类中。
2. **方法非 `public` 修饰**：
   - **现象**：事务方法声明为 `private` 或 `protected`。
   - **根因**：Spring 事务拦截器（`TransactionInterceptor`）在解析事务属性时，会默认过滤掉非 `public` 的方法，直接忽略事务增强。
3. **异常被捕获（吞掉）**：
   - **现象**：在事务方法中使用了 `try-catch` 包裹了业务逻辑，且在 `catch` 块中没有重新抛出异常，或者只记录了日志。
   - **根因**：Spring 必须捕获到未处理的异常才能触发事务回滚。如果异常在方法内部被吃掉，AOP 事务管理器会认为方法成功执行，照常提交事务。
4. **回滚异常类型不匹配**：
   - **现象**：方法抛出了 Checked Exception（如 `IOException`），事务未回滚。
   - **根因**：Spring 默认只在遇到 RuntimeException 和 Error 时回滚事务。若需对受检异常进行回滚，必须显式配置 `@Transactional(rollbackFor = Exception.class)`。
5. **事务传播级别（Propagation）误用**：
   - **现象**：配置了 `NOT_SUPPORTED` 或 `NEVER` 级别，导致事务挂起或直接以非事务方式运行，无法回滚。

---

## 36. Spring Boot 自动配置原理

Spring Boot 的自动配置（Auto-Configuration）实现了“约定大于配置”的核心理念。

### 核心实现原理

1. **启动类入口 `@SpringBootApplication`**：
   - 该注解是一个复合注解，核心是 **`@EnableAutoConfiguration`**。
2. **加载自动配置类选择器**：
   - `@EnableAutoConfiguration` 内部通过 `@Import({AutoConfigurationImportSelector.class})` 导入了一个自动配置类导入选择器。
3. **扫描配置文件加载全限定名**：
   - 在选择器中，会调用 `SpringFactoriesLoader` 来扫描 Classpath 下所有 Jar 包中的 `META-INF/spring.factories`（Spring Boot 3.0 之前）或全新的 **`META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`**（Spring Boot 3.0 起）配置文件。
   - 该配置文件中配置了成百上千个官方或第三方编写好的自动配置类（如 `DataSourceAutoConfiguration`）的全限定名。
4. **按条件装配（Conditional On...）**：
   - 每个自动配置类上都标注了大量的 `@Conditional` 条件注解（如 `@ConditionalOnClass` 表示当 Classpath 中存在某个类时才装配；`@ConditionalOnMissingBean` 表示当容器中没有用户自定义的该 Bean 时才装配）。
   - Spring 容器在初始化时会解析这些条件注解，只有条件完全匹配的自动配置类才会被真正加载并注册到 IoC 容器中，从而实现开箱即用。

---

## 37. Spring Boot 4.0 重磅新特性

Spring Boot 4.0 在 JDK 21+ 与 Jakarta EE 11 的大背景下进行了激进且彻底的升级。

### 一键开启虚拟线程

- **配置**：

  ```properties
  spring.threads.virtual.enabled=true
  ```

- **效果**：开启该配置后，Tomcat 的请求处理线程池会自动切换为虚拟线程。更重要的是，`@Async` 异步方法、定时任务（`@Scheduled`）、Spring Integration 以及大部分内置阻塞组件，都会**自动使用虚拟线程执行**，无需修改任何代码，使得传统的 Servlet 架构能轻易抗住百万级并发。

### 原生 API 版本控制

- **新功能**：引入了全新的原生 HTTP 路由版本控制。
- **写法**：

  ```java
  @GetMapping(value = "/users", version = "1")
  public List<UserV1> getUsersV1() { ... }
  
  @GetMapping(value = "/users", version = "2")
  public List<UserV2> getUsersV2() { ... }
  ```

- 支持通过 Request Header、Query Parameter 或 URL Path 自动路由解析对应版本，免去了老版本中手工编写拦截器或重写映射关系的繁琐逻辑。

### 声明式 HTTP 客户端

- **新功能**：正式支持 **`@HttpServiceClient`** 注解。
- **定位**：可直接替代第三方 OpenFeign。开发者只需声明一个 Java 接口并在其上定义 HTTP 请求注解，Spring 4.0 会在运行期自动为其生成网络请求的动态代理实现，原生集成了 WebClient 与最新的 HTTP/3。

### 内置服务器与底层库强力升级

- **Jakarta EE 11 与 Servlet 6.1 独占支持**：Spring Boot 4.0 全面支持 Jakarta EE 11 规范。
- **独占内置容器**：仅支持 Tomcat 11 和 Jetty 12.1。**完全移除了对 Undertow 服务器的支持**（因其在 Servlet 6.1 及最新的 Jakarta EE 11 的支持进度上落后）。
- **Jackson 3 默认集成**：默认采用全新重写、性能大幅提升且完美支持 Java 21 Record 序列化的 Jackson 3 库。
- **JSpecify 空安全支持**：全面引入 JSpecify 标准的 `@NullMarked` 与 `@Nullable` 注解，使得 Java 与 Kotlin 混编时的空安全检查能达到编译期级别的绝对安全。

### GraalVM 原生镜像生产级优化

- **表现**：Spring Boot 4.0 配合 GraalVM 原生镜像的构建速度提升了 50%，运行时内存占用降低了 60%。
- **启动时间**：从传统 JVM 的 500ms 级别直接压缩到了 **50ms 以内**，这使得 Java 应用无需再忍受冷启动的痛楚，完美匹配 Serverless 和 Kubernetes 容器极致扩缩容的需求。

---

## 38. Spring Boot 3 到 4 迁移要点

由于 Spring Boot 4.0 进行了一系列的“破坏性”底层升级，企业级项目从旧版本升级时，需要重点关注以下迁移细节。

1. **彻底废除 `javax.*` 命名空间**：
   - 所有的 Servlet、JPA、Validation 依赖包名必须全部全局替换为 **`jakarta.*`**。
2. **内置容器与 Undertow 迁移**：
   - 如果原有项目强依赖了 Undertow，必须将其替换为 Tomcat 11 或 Jetty 12.1，并对定制的嵌入式容器参数进行重写适配（Servlet 6.1 移除了部分不安全的传统 API）。
3. **JDK 强依赖提升**：
   - 运行环境最低要求提升至 **JDK 21**，推荐直接使用 JDK 25。
4. **第三方依赖库兼容**：
   - 许多旧版 starter（特别是基于 spring.factories 自动配置的包）会由于不兼容新的 imports 文件机制及 Jakarta 命名空间而失效，必须将其全部升级至支持 Spring Boot 4 / Jakarta EE 11 的最新大版本。
