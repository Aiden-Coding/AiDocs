---
title: "Actix Web：从路由到 MySQL 事务"
sidebar_position: 96
---

# Actix Web：从路由到 MySQL 事务

前面的章节从 TCP 和 HTTP 协议出发，手动实现了一个基础 Web 服务器。实际项目通常会使用 Web 框架处理请求分发、数据提取和响应生成。本章使用 Actix Web 构建一个小型 JSON API，并通过 SQLx 访问 MySQL。

示例包含路径参数、JSON 请求与响应、应用共享状态、错误处理，以及在一个事务中同时创建用户和审计记录。代码面向学习与本地运行；生产服务还需补充身份认证、输入校验、迁移管理和限流等措施。

## 创建项目并添加依赖

创建二进制项目：

```console
cargo new actix-mysql-demo
cd actix-mysql-demo
```

项目的关键部分如下：

```text
actix-mysql-demo/
├── Cargo.toml
└── src/
    └── main.rs
```

在 `Cargo.toml` 中添加依赖：

```toml
[dependencies]
actix-web = "4"
env_logger = "0.11"
log = "0.4"
serde = { version = "1", features = ["derive"] }
sqlx = { version = "0.8", default-features = false, features = ["macros", "mysql", "runtime-tokio-rustls"] }
thiserror = "2"
```

Actix Web 提供 HTTP 服务和请求处理；SQLx 使用 Tokio 运行时与 MySQL 驱动执行异步查询；Serde 负责 JSON 序列化与反序列化；`thiserror` 定义应用错误类型；`env_logger` 和 `log` 用于请求日志及数据库错误日志。示例使用运行时 SQL 查询，不需要在编译时连接数据库。首次运行 `cargo run` 时，Cargo 会解析版本约束并生成 `Cargo.lock`；应用项目应将锁文件纳入版本控制。

Actix Web 基于 Tokio，但会替应用建立运行时，因此入口使用 `#[actix_web::main]`，不需要再手动创建 Tokio runtime。处理函数是 `async fn`，遇到数据库 I/O 时 `.await` 会让出执行权，不会像同步线程那样一直阻塞等待。

## 准备 MySQL 表

在 MySQL 中创建数据库和表。事务要求相关表使用支持事务的存储引擎；这里显式使用 InnoDB：

```sql
CREATE DATABASE actix_demo
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE actix_demo;

CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE = InnoDB;

CREATE TABLE user_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  event_type VARCHAR(32) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_user_events_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE = InnoDB;
```

`users.email` 的唯一索引保证并发请求也不能插入重复邮箱；不能只依赖先查询“邮箱是否存在”的应用逻辑，因为两个请求可能同时通过检查。外键保证审计记录引用真实用户。InnoDB 才支持此处需要的事务与外键约束。

通过环境变量提供连接地址，避免将用户名和密码写进源代码或提交到版本控制。下面是 PowerShell 的本地开发示例；运行前将占位符换成实际数据库凭据，若凭据含特殊字符则需进行 URL 编码：

```powershell
$env:DATABASE_URL = "mysql://<user>:<password>@127.0.0.1:3306/actix_demo"
$env:RUST_LOG = "info"
cargo run
```

运行前可先用 MySQL 客户端验证数据库、表和账号权限均已准备好。服务启动时会建立连接池；如果连接失败，程序会在启动阶段返回错误，而不是启动后让每个请求都以数据库错误失败。部署环境应通过密钥管理系统注入 `DATABASE_URL`，不要把含凭据的连接字符串写入仓库或日志。

## 定义请求、响应与错误类型

把下面分段代码按顺序合并到 `src/main.rs`。`User` 同时用于 SQLx 行映射和 JSON 序列化；`CreateUser` 表示客户端提交的数据。`#[derive(FromRow)]` 让 SQLx 根据查询列名填充结构体字段，`#[derive(Serialize)]` 则让 Actix 将结构体序列化为 JSON：

```rust
use actix_web::{
    http::StatusCode, middleware::Logger, web, App, HttpResponse, HttpServer, ResponseError,
};
use serde::{Deserialize, Serialize};
use sqlx::{mysql::MySqlPoolOptions, FromRow, MySqlPool};

struct AppState {
    pool: MySqlPool,
}

#[derive(Debug, FromRow, Serialize)]
struct User {
    id: u64,
    name: String,
    email: String,
}

#[derive(Deserialize)]
struct CreateUser {
    name: String,
    email: String,
}

#[derive(Deserialize)]
struct ListUsersQuery {
    limit: Option<u32>,
    offset: Option<u32>,
}

#[derive(Debug, thiserror::Error)]
enum ApiError {
    #[error("数据库操作失败")]
    Database(#[from] sqlx::Error),
    #[error("用户不存在")]
    NotFound,
    #[error("请求数据无效")]
    BadRequest,
}

#[derive(Serialize)]
struct ErrorBody {
    message: &'static str,
}

impl ResponseError for ApiError {
    fn status_code(&self) -> StatusCode {
        match self {
            Self::Database(_) => StatusCode::INTERNAL_SERVER_ERROR,
            Self::NotFound => StatusCode::NOT_FOUND,
            Self::BadRequest => StatusCode::BAD_REQUEST,
        }
    }

    fn error_response(&self) -> HttpResponse {
        if let Self::Database(error) = self {
            log::error!("数据库请求失败: {error}");
        }

        let message = match self {
            Self::Database(_) => "数据库操作失败",
            Self::NotFound => "用户不存在",
            Self::BadRequest => "请求数据无效",
        };

        HttpResponse::build(self.status_code()).json(ErrorBody { message })
    }
}
```

Actix 的 `ResponseError` trait 把领域错误转换为 HTTP 响应。错误体保持一致，便于客户端处理；数据库错误细节写入服务端日志，响应不暴露 SQL、表名或连接信息。`#[from]` 让 `?` 自动把 `sqlx::Error` 转成 `ApiError::Database`。例如，查询没有返回记录时不是数据库故障，因此显式转换为 `NotFound`，而连接中断或 SQL 执行失败则由 `?` 传播为 `500`。

请求结构体描述 JSON 形状，但不代表数据已通过业务校验。下一步单独验证去除首尾空白后的值及其长度，避免空名称或超过数据库列宽的内容进入 SQL 层：

```rust
fn validate_create_user(input: &CreateUser) -> Result<(&str, &str), ApiError> {
    let name = input.name.trim();
    let email = input.email.trim();

    if name.is_empty()
        || email.is_empty()
        || name.chars().count() > 100
        || email.chars().count() > 254
    {
        return Err(ApiError::BadRequest);
    }

    Ok((name, email))
}
```

这里检查的是基本业务约束，不是完整的邮箱格式验证。真实系统应根据产品需求选择明确的校验规则，并在 API 层将校验错误映射成可区分字段的响应。

## 添加处理函数与路由

Actix Web 用提取器把 URL 和请求体转换成有类型的数据。`web::Path<u64>` 提取路径参数，`web::Json<CreateUser>` 解析 JSON；无法解析的请求会被框架拒绝。

```rust
async fn list_users(
    state: web::Data<AppState>,
    query: web::Query<ListUsersQuery>,
) -> Result<HttpResponse, ApiError> {
    let limit = query.limit.unwrap_or(20).clamp(1, 100);
    let offset = query.offset.unwrap_or(0);

    let users = sqlx::query_as::<_, User>(
        "SELECT id, name, email FROM users ORDER BY id LIMIT ? OFFSET ?",
    )
    .bind(i64::from(limit))
    .bind(i64::from(offset))
    .fetch_all(&state.pool)
    .await?;

    Ok(HttpResponse::Ok().json(users))
}

async fn get_user(
    state: web::Data<AppState>,
    id: web::Path<u64>,
) -> Result<HttpResponse, ApiError> {
    let user = sqlx::query_as::<_, User>(
        "SELECT id, name, email FROM users WHERE id = ?",
    )
    .bind(id.into_inner())
    .fetch_optional(&state.pool)
    .await?
    .ok_or(ApiError::NotFound)?;

    Ok(HttpResponse::Ok().json(user))
}

async fn create_user(
    state: web::Data<AppState>,
    payload: web::Json<CreateUser>,
) -> Result<HttpResponse, ApiError> {
    let (name, email) = validate_create_user(&payload)?;

    let mut transaction = state.pool.begin().await?;

    let result = sqlx::query("INSERT INTO users (name, email) VALUES (?, ?)")
        .bind(name)
        .bind(email)
        .execute(&mut *transaction)
        .await?;
    let user_id = result.last_insert_id();

    sqlx::query("INSERT INTO user_events (user_id, event_type) VALUES (?, ?)")
        .bind(user_id)
        .bind("created")
        .execute(&mut *transaction)
        .await?;

    transaction.commit().await?;

    Ok(HttpResponse::Created().json(User {
        id: user_id,
        name: name.to_owned(),
        email: email.to_owned(),
    }))
}

#[actix_web::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    env_logger::init_from_env(env_logger::Env::default().default_filter_or("info"));

    let database_url = std::env::var("DATABASE_URL")?;
    let pool = MySqlPoolOptions::new()
        .min_connections(1)
        .max_connections(10)
        .acquire_timeout(std::time::Duration::from_secs(3))
        .connect(&database_url)
        .await?;
    let state = web::Data::new(AppState { pool });

    HttpServer::new(move || {
        App::new()
            .app_data(state.clone())
            .wrap(Logger::default())
            .route("/health", web::get().to(|| async { HttpResponse::Ok().body("ok") }))
            .route("/users", web::get().to(list_users))
            .route("/users/{id}", web::get().to(get_user))
            .route("/users", web::post().to(create_user))
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await?;

    Ok(())
}
```

`web::Data` 将连接池放入应用状态，并通过引用计数在 Actix 的 worker 间共享。`HttpServer::new` 接收应用工厂：每个 worker 会创建自己的 `App`，因此在闭包外创建 `web::Data` 并克隆共享句柄，避免每个 worker 各自新建一组连接池。连接池负责复用数据库连接；不要为每个 HTTP 请求单独建立连接。

池大小需要结合 worker 数、服务副本数和 MySQL 的连接上限设定。这里的 `max_connections(10)` 是单个进程的上限；若部署 4 个副本，理论上最多可占用 40 个连接。`acquire_timeout` 限制请求等待连接的时间，避免数据库连接耗尽时请求无限期排队。生产环境还应按容量设定连接空闲超时、请求超时和并发上限。

`list_users` 演示查询字符串提取器 `web::Query`：客户端可通过 `?limit=10&offset=20` 分页。限制 `limit` 最大值，防止一次读取任意多行；绑定参数而不是将其拼接进 SQL，也避免将客户端输入解释成 SQL 语法。`ORDER BY id` 让分页顺序稳定；没有显式排序的 SQL 查询不保证返回行顺序。

### 请求从路由到响应的过程

以 `GET /users/42` 为例，请求经过以下步骤：

1. Actix 根据 HTTP 方法和路径匹配 `/users/{id}`，并调用 `get_user`。
2. `web::Path<u64>` 把字符串 `"42"` 解析为 `u64`；格式不正确时，提取器在进入处理函数前返回客户端错误。
3. `web::Data<AppState>` 提供共享的连接池句柄。
4. SQLx 从池中取得连接，绑定 `id` 参数并异步执行查询。
5. 找到记录时，将 `User` 序列化为 JSON 并返回 `200`；没有记录时返回统一 JSON 错误体和 `404`。

`web::Json<T>` 也会处理 `Content-Type` 和 JSON 语法错误。上面的领域错误类型没有重写这类提取错误，因此 Actix 会使用自身的错误响应；如果 API 需要所有错误都采用完全一致的响应格式，可配置 JSON 提取器的错误处理函数，把反序列化错误映射到 API 错误类型。

## 验证接口与事务

创建用户：

```console
curl.exe -X POST http://127.0.0.1:8080/users `
  -H "Content-Type: application/json" `
  -d '{"name":"Ada","email":"ada@example.com"}'
```

成功时返回 `201 Created` 和新用户 JSON。再用返回的 ID 查询：

```console
curl http://127.0.0.1:8080/users/1
```

列出用户并分页：

```console
curl "http://127.0.0.1:8080/users?limit=10&offset=0"
```

健康检查：

```console
curl http://127.0.0.1:8080/health
```

查询不存在的 ID 会返回 `404`；空名称或空邮箱会返回 `400`；数据库故障返回通用 `500` 响应，详细原因留在服务端日志中。

可用以下请求检查输入错误和不存在的记录：

```console
curl -i http://127.0.0.1:8080/users/999999
curl -i -X POST http://127.0.0.1:8080/users `
  -H "Content-Type: application/json" `
  -d '{"name":" ","email":"ada@example.com"}'
curl -i -X POST http://127.0.0.1:8080/users `
  -H "Content-Type: application/json" `
  -d '{"name":"Ada","email":"ada@example.com"}'
```

第二次插入相同邮箱会触发唯一索引错误。此简化实现将数据库错误统一作为 `500`，这是因为不能把所有数据库错误都错误地当成客户端问题；完善 API 时，可以针对 MySQL 的重复键错误映射为 `409 Conflict`，并添加测试确认只映射目标约束。

`create_user` 在一次事务中写入 `users` 和 `user_events`。两条语句都成功后才调用 `commit()`；任一步骤提前返回错误而未提交时，SQLx 会在事务释放时回滚。可在数据库中检查两张表：

```sql
SELECT id, name, email FROM users;
SELECT user_id, event_type, created_at FROM user_events;
```

如果要扩展事务中的业务步骤，应继续使用同一个事务执行所有相关查询，并只在所有步骤成功后提交。生产项目还应使用迁移工具管理表结构，并区分可恢复的约束冲突与真正的服务端故障。

### 事务边界与并发注意事项

事务包含“开始、执行语句、提交或回滚”几个阶段。`pool.begin()` 从池中取得一个连接并开启事务；传给 `execute` 的是事务所持有连接的可变借用，所以在 SQLx 0.8 中写作 `.execute(&mut *transaction)`。同一事务中的语句必须顺序执行，提交前其他事务看不到未提交的写入（具体可见性还受隔离级别影响）。

示例刻意把外部副作用排除在事务之外。数据库事务不能自动撤销已经发送的邮件、HTTP 请求或消息；如果业务要求数据库写入与消息发布可靠一致，应考虑事务性 outbox 等模式，而不是在事务中假设跨系统回滚。

MySQL 的死锁是并发事务中可能发生的正常错误，数据库会选择一个事务回滚以解除死锁。服务可针对明确的暂时性错误执行有上限的重试，但重试前必须确认整个操作具备幂等性；不可无条件重试所有 SQL 错误，也不可在事务内执行耗时外部请求。

## 添加基本校验测试

`validate_create_user` 不依赖数据库，可直接进行单元测试。在 `src/main.rs` 末尾添加：

```rust
#[cfg(test)]
mod tests {
    use super::{validate_create_user, ApiError, CreateUser};

    #[test]
    fn trims_valid_user_fields() {
        let input = CreateUser {
            name: " Ada ".to_owned(),
            email: " ada@example.com ".to_owned(),
        };

        assert_eq!(
            validate_create_user(&input).expect("input should be valid"),
            ("Ada", "ada@example.com")
        );
    }

    #[test]
    fn rejects_blank_fields() {
        let input = CreateUser {
            name: "   ".to_owned(),
            email: "ada@example.com".to_owned(),
        };

        assert!(matches!(
            validate_create_user(&input),
            Err(ApiError::BadRequest)
        ));
    }
}
```

运行测试：

```console
cargo test
```

这两个测试覆盖纯输入校验逻辑，不需要 MySQL。数据库读写与事务仍应通过集成测试验证：测试环境准备独立数据库或 schema，在每个测试中使用唯一测试数据，并检查成功提交、重复键失败和事务中途失败后的两张表状态。不要在并行测试间共享会互相覆盖的固定数据。

## 小结

Actix Web 的路由和提取器负责把 HTTP 输入交给类型化的异步处理函数；`web::Data` 适合共享连接池等应用状态；SQLx 提供参数化查询和事务 API。将数据库操作写成参数绑定查询，并让相关写入处于同一个事务中，可减少 SQL 注入风险并保证这些写入的原子性。要把教学示例推进到生产服务，还需处理认证授权、结构化校验错误、数据库迁移、重复键映射、可观测性、超时和优雅停机。
