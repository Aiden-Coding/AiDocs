---
title: "Mock 测试"
sidebar_position: 113
---

# Mock 测试

## 为什么需要 Mock

单元测试的目标是**孤立地**验证一个模块的逻辑。但业务代码往往依赖数据库、HTTP 客户端、文件系统或时钟等外部资源。这些依赖有以下问题：

- **速度慢**：每个测试都真正访问数据库会让测试套件运行数分钟
- **有副作用**：测试可能修改生产数据
- **不可控**：网络超时或服务不可用会导致测试随机失败

Mock（模拟对象）技术用**受控的假实现**替换真实依赖，让测试快速、可靠且完全可控。

## mockall 基础

`mockall` 是 Rust 生态中最主流的 Mock 库，通过过程宏自动生成 Mock 实现：

```toml
[dev-dependencies]
mockall = "0.13"
```

## 自动生成 Mock

使用 `#[automock]` 属性宏，mockall 会为 trait 自动生成名为 `Mock{TraitName}` 的结构体：

```rust
use mockall::{automock, predicate::*};

#[derive(Debug, PartialEq)]
struct User {
    id: u64,
    name: String,
}

#[derive(Debug)]
struct DbError(String);

#[automock]
trait UserRepository {
    fn find_by_id(&self, id: u64) -> Option<User>;
    fn save(&mut self, user: &User) -> Result<(), DbError>;
}
```

编译后，`MockUserRepository` 会被自动生成，可在测试中直接使用。

## 配置期望（Expectation）

Mock 对象的核心是**期望**（*expectation*）：声明某个方法应该被调用多少次、以什么参数调用、返回什么值：

```rust
struct UserService<R: UserRepository> {
    repo: R,
}

impl<R: UserRepository> UserService<R> {
    fn new(repo: R) -> Self {
        Self { repo }
    }

    fn create_user(&mut self, name: &str) -> Result<(), DbError> {
        let user = User { id: 1, name: name.to_string() };
        self.repo.save(&user)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_user_service() {
        let mut mock_repo = MockUserRepository::new();

        mock_repo
            .expect_save()
            .with(predicate::always())   // 接受任何参数
            .times(1)                    // 必须恰好调用一次
            .returning(|_| Ok(()));      // 返回成功

        let mut service = UserService::new(mock_repo);
        service.create_user("Alice").unwrap();
        // 测试结束时，mockall 会自动验证 expect_save 是否被调用了恰好 1 次
    }

    #[test]
    fn test_find_existing_user() {
        let mut mock_repo = MockUserRepository::new();

        mock_repo
            .expect_find_by_id()
            .with(predicate::eq(42u64))  // 仅接受参数 42
            .times(1)
            .returning(|id| Some(User { id, name: "Bob".to_string() }));

        let result = mock_repo.find_by_id(42);
        assert_eq!(result.unwrap().name, "Bob");
    }
}
```

## 常用 Predicate

`mockall::predicate` 提供了一套组合式的参数匹配器：

| Predicate | 含义 |
|-----------|------|
| `predicate::eq(val)` | 参数等于指定值 |
| `predicate::always()` | 匹配任意参数 |
| `predicate::function(\|x\| x > 0)` | 自定义判断函数 |
| `predicate::str::contains("foo")` | 字符串包含子串 |

## 模拟返回错误路径

测试错误处理逻辑同样重要，Mock 让这变得非常简单：

```rust
#[test]
fn test_create_user_propagates_db_error() {
    let mut mock_repo = MockUserRepository::new();

    mock_repo
        .expect_save()
        .times(1)
        .returning(|_| Err(DbError("connection lost".to_string())));

    let mut service = UserService::new(mock_repo);
    let result = service.create_user("Charlie");
    assert!(result.is_err());
}
```

## 设计建议：依赖注入让 Mock 成为可能

Mock 能够生效的前提是代码遵循**依赖注入**原则：依赖通过 trait 对象或泛型参数传入，而不是在内部硬编码创建。

```rust
// 难以 Mock：内部直接构造依赖
fn get_user(id: u64) -> Option<User> {
    let db = PostgresDb::connect("postgres://localhost/prod");
    db.query_user(id)
}

// 易于 Mock：通过泛型接受依赖
fn get_user<R: UserRepository>(repo: &R, id: u64) -> Option<User> {
    repo.find_by_id(id)
}
```

这也是「面向接口编程」在 Rust 中的体现。
