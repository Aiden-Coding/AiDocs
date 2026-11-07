---
title: Java 构建与测试实践
sidebar_label: 构建与测试
sidebar_position: 8
---

# Java 构建与测试实践

本文介绍 Java 项目从依赖管理、编译打包到自动化测试的基本工作流。示例以 Maven 为主；Gradle 使用相同的分层思路，具体任务由插件和构建脚本配置。

## 1. 项目结构与依赖管理

常见 Maven 项目使用以下目录约定：

```text
src/main/java       生产代码
src/main/resources  生产资源
src/test/java       测试代码
src/test/resources  测试资源
pom.xml             项目与构建配置
```

依赖由坐标 `groupId`、`artifactId` 和 `version` 唯一标识。直接依赖应由项目明确声明；传递依赖通过依赖树检查，避免仅为解决冲突而盲目排除。多模块项目可用父 POM 统一版本与插件配置，并通过 `dependencyManagement` 管理版本、通过 `modules` 聚合模块。

提交前应检查依赖来源、许可证与安全更新策略。不要将凭据写入 POM 或源码；私有仓库认证放在用户级 Maven 配置或 CI 密钥中。

## 2. Maven 生命周期与常用命令

Maven 生命周期由阶段组成，执行某个阶段时会依次执行此前阶段。日常常用命令：

```bash
mvn test                 # 编译并运行单元测试
mvn verify               # 执行验证阶段及绑定的集成测试
mvn package              # 生成项目制品
mvn dependency:tree      # 查看依赖及传递依赖
```

项目应固定编译目标版本，并在本地与 CI 使用一致的 JDK。Maven Wrapper（`mvnw`）可固定 Maven 发行版，降低开发环境差异。Gradle 项目可用 Gradle Wrapper（`gradlew`）达到同样目的。

## 3. 单元测试与集成测试

单元测试针对小范围逻辑，通常不启动外部服务；集成测试验证多个组件或真实基础设施之间的协作。测试应独立、可重复，并清晰验证输入、输出和副作用。

JUnit 5 常用 `@Test`、`@BeforeEach`、`@ParameterizedTest` 和断言。测试名应描述行为与条件；边界值、异常路径和业务规则都需要覆盖。避免测试只验证实现细节或依赖测试执行顺序。

Mockito 可替代远程客户端、时钟等外部协作者，验证隔离场景下的行为。不要过度 mock 被测对象内部的每一步调用；核心业务测试优先验证可观察结果。需要验证数据库、HTTP 或消息中间件协作时，使用集成测试和可控的测试环境。

示例：

```java
class PriceCalculatorTest {
    @Test
    void appliesDiscountToEligibleOrder() {
        PriceCalculator calculator = new PriceCalculator();

        BigDecimal result = calculator.total(
                new BigDecimal("100.00"), true);

        assertEquals(new BigDecimal("90.00"), result);
    }
}
```

测试金额时应明确小数位和舍入规则，或者按业务契约使用 `compareTo` 断言数值相等，避免 `BigDecimal.equals` 的 scale 差异影响结果。

## 4. 测试分层与数据

- 单元测试验证纯逻辑和单个组件，运行快，适合每次提交执行。
- 集成测试验证数据库、消息系统或服务边界，使用隔离、可重建的数据。
- 端到端测试验证关键用户流程，数量保持精简，避免把所有规则都放在慢速测试中。
- 每个测试准备自己的数据，并在结束后清理；不要依赖共享数据库中的手工状态。
- 时间、随机数和外部网络应通过可替换依赖控制，提升可重复性。

## 5. CI 与质量门禁

最小持续集成流程应在每次变更时检出代码、设置 JDK、运行构建和测试，并保存失败报告。生产分支可增加格式检查、静态分析、依赖漏洞扫描和制品归档。

CI 应使用 Wrapper 和锁定的 JDK 版本；密钥通过 CI 的安全变量注入。失败时优先保留测试报告和构建日志，保证问题可复现。发布流程应从已验证的不可变制品晋级，避免在不同环境重复构建出不同内容。

## 6. 提交前检查

- 本地与 CI 使用相同的 JDK 和 Wrapper 版本。
- 单元测试覆盖正常、边界和预期失败场景。
- 集成测试不依赖个人机器上的服务或未声明的数据状态。
- 依赖版本有明确来源，密钥未进入代码库。
- CI 能在干净环境中完成验证并保存诊断信息。

## 延伸阅读

- [Java 日常开发语言基础](7-java-everyday-development.md)
- [Java 后端知识体系补充路线](6-java-backend-roadmap.md)
- [MyBatis 核心组件与 SQL 执行全流程](../persistence/1-mybatis-core-flow.md)
