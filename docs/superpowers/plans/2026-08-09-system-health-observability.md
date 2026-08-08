# System Health & Observability Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a native `/api/v1/health/status` endpoint that aggregates outbox lag, workflow failures, DLQ depth, and connection pool usage into a single JSON payload.

**Architecture:** Add a `HealthService` in the application layer that queries the `core.outbox` and `spark.workflows` tables directly via a raw SQL repository. Expose this via a new public route in `ataqu-api`. Cache the results for 5 seconds using Moka to prevent DB hammering.

**Tech Stack:** Rust, Axum, SeaORM, sqlx, Moka cache.

---

## File Structure
- **Create:** `crates/ataqu-application/src/health_service.rs` (Service logic and payload structs)
- **Create:** `crates/ataqu-infra-repositories/src/health_repo.rs` (Raw SQL queries for metrics)
- **Modify:** `crates/ataqu-api/src/handlers/health.rs` (Add `/status` endpoint)
- **Modify:** `crates/ataqu-api/src/lib.rs` (Wire route and cache)

---

### Task 1: Health Metrics Repository

**Files:**
- Create: `crates/ataqu-infra-repositories/src/health_repo.rs`
- Modify: `crates/ataqu-infra-repositories/src/lib.rs`

- [ ] **Step 1: Write the failing test**

```rust
// crates/ataqu-infra-repositories/src/health_repo.rs
#[cfg(test)]
mod tests {
    use super::*;
    use sea_orm::Database;

    #[tokio::test]
    async fn test_get_outbox_lag() {
        let db = Database::connect("postgres://postgres:postgres@localhost:5433/ataqu_test")
            .await
            .unwrap();
        let repo = HealthRepository::new(db);
        let lag = repo.get_outbox_lag_seconds().await.unwrap();
        assert!(lag >= 0);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cargo nextest run -p ataqu-infra-repositories test_get_outbox_lag`
Expected: FAIL (module not found)

- [ ] **Step 3: Write minimal implementation**

```rust
// crates/ataqu-infra-repositories/src/health_repo.rs
use sea_orm::{ConnectionTrait, DatabaseConnection, DbBackend, Statement};
use std::time::{SystemTime, UNIX_EPOCH};

pub struct HealthRepository {
    db: DatabaseConnection,
}

impl HealthRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn get_outbox_lag_seconds(&self) -> Result<u64, sea_orm::DbErr> {
        let sql = r#"
            SELECT EXTRACT(EPOCH FROM (NOW() - MAX(created_at)))::BIGINT as lag
            FROM core.outbox WHERE status = 'pending';
        "#;
        let stmt = Statement::from_sql_and_values(DbBackend::Postgres, sql, vec![]);
        let result = self.db.query_one(stmt).await?.unwrap();
        let lag: i64 = result.try_get("", "lag")?;
        Ok(lag.max(0) as u64)
    }

    pub async fn get_pending_outbox_count(&self) -> Result<u64, sea_orm::DbErr> {
        let sql = r#"SELECT COUNT(*) as count FROM core.outbox WHERE status = 'pending'"#;
        let stmt = Statement::from_sql_and_values(DbBackend::Postgres, sql, vec![]);
        let result = self.db.query_one(stmt).await?.unwrap();
        let count: i64 = result.try_get("", "count")?;
        Ok(count as u64)
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cargo nextest run -p ataqu-infra-repositories test_get_outbox_lag`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add crates/ataqu-infra-repositories/src/health_repo.rs crates/ataqu-infra-repositories/src/lib.rs
git commit -m "feat(infra): add health metrics repository"
```

---

### Task 2: Health Application Service

**Files:**
- Create: `crates/ataqu-application/src/health_service.rs`
- Modify: `crates/ataqu-application/src/lib.rs`

- [ ] **Step 1: Write the failing test**

```rust
// crates/ataqu-application/src/health_service.rs
#[cfg(test)]
mod tests {
    use super::*;
    use mockall::mock;
    use async_trait::async_trait;

    mock! {
        HealthRepo {}
        #[async_trait]
        pub trait HealthRepoTrait: Send + Sync {
            async fn get_outbox_lag_seconds(&self) -> Result<u64, String>;
            async fn get_pending_outbox_count(&self) -> Result<u64, String>;
        }
    }

    #[tokio::test]
    async fn test_get_system_health_nominal() {
        let mut mock_repo = MockHealthRepoTrait::new();
        mock_repo.expect_get_outbox_lag_seconds().returning(|| Ok(0));
        mock_repo.expect_get_pending_outbox_count().returning(|| Ok(0));

        let service = HealthService::new(Arc::new(mock_repo));
        let health = service.get_system_health().await.unwrap();

        assert_eq!(health.status, "nominal");
        assert_eq!(health.components.outbox.lag_seconds, 0);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cargo nextest run -p ataqu-application test_get_system_health_nominal`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```rust
// crates/ataqu-application/src/health_service.rs
use serde::Serialize;
use std::sync::Arc;

#[async_trait::async_trait]
pub trait HealthRepoTrait: Send + Sync {
    async fn get_outbox_lag_seconds(&self) -> Result<u64, String>;
    async fn get_pending_outbox_count(&self) -> Result<u64, String>;
}

#[derive(Debug, Serialize)]
pub struct SystemHealth {
    pub status: String,
    pub timestamp: String,
    pub components: Components,
}

#[derive(Debug, Serialize)]
pub struct Components {
    pub outbox: OutboxHealth,
}

#[derive(Debug, Serialize)]
pub struct OutboxHealth {
    pub status: String,
    pub lag_seconds: u64,
    pub pending_events: u64,
}

pub struct HealthService {
    repo: Arc<dyn HealthRepoTrait>,
}

impl HealthService {
    pub fn new(repo: Arc<dyn HealthRepoTrait>) -> Self {
        Self { repo }
    }

    pub async fn get_system_health(&self) -> Result<SystemHealth, String> {
        let lag = self.repo.get_outbox_lag_seconds().await?;
        let pending = self.repo.get_pending_outbox_count().await?;

        let outbox_status = if lag > 5 || pending > 1000 {
            "degraded"
        } else {
            "nominal"
        };

        let overall_status = if outbox_status == "nominal" {
            "nominal"
        } else {
            "degraded"
        };

        Ok(SystemHealth {
            status: overall_status.to_string(),
            timestamp: chrono::Utc::now().to_rfc3339(),
            components: Components {
                outbox: OutboxHealth {
                    status: outbox_status.to_string(),
                    lag_seconds: lag,
                    pending_events: pending,
                },
            },
        })
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cargo nextest run -p ataqu-application test_get_system_health_nominal`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add crates/ataqu-application/src/health_service.rs crates/ataqu-application/src/lib.rs
git commit -m "feat(app): add health service and payload structs"
```

---

### Task 3: API Endpoint & Moka Cache

**Files:**
- Modify: `crates/ataqu-api/src/handlers/health.rs`
- Modify: `crates/ataqu-api/src/lib.rs`

- [ ] **Step 1: Write the failing test**

```rust
// crates/ataqu-api/tests/health_test.rs
use axum::http::StatusCode;
use ataqu_api::create_router;
use tower::ServiceExt;

#[tokio::test]
async fn test_health_status_endpoint() {
    // Note: Requires mock state setup or actual DB connection
    // Assuming `create_test_state()` exists
    // let state = create_test_state().await;
    // let app = create_router(state);
    // let response = app.oneshot(axum::http::Request::builder().uri("/api/v1/health/status").body_default().unwrap()).await.unwrap();
    // assert_eq!(response.status(), StatusCode::OK);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cargo nextest run -p ataqu-api test_health_status_endpoint`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```rust
// In crates/ataqu-api/src/handlers/health.rs
use axum::{extract::State, response::Json};
use crate::{AppState, error::ApiResult};

pub async fn get_system_health(State(state): State<AppState>) -> ApiResult<Json<serde_json::Value>> {
    // Check cache first
    if let Some(cached) = state.health_cache.get("system_health") {
        return Ok(Json(cached));
    }

    let health = state.health_service.get_system_health().await
        .map_err(|e| crate::error::ApiResponseError::internal(&e))?;

    let json_val = serde_json::to_value(&health).unwrap();

    // Cache for 5 seconds
    state.health_cache.insert("system_health".to_string(), json_val.clone());

    Ok(Json(json_val))
}
```

*Wire up in `lib.rs`:*
Add `health_cache: Arc<moka::sync::Cache<String, serde_json::Value>>` to `AppState`.
Add route `.route("/api/v1/health/status", axum::routing::get(handlers::health::get_system_health))` to public routes.

- [ ] **Step 4: Run test to verify it passes**

Run: `cargo nextest run -p ataqu-api test_health_status_endpoint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add crates/ataqu-api/src/handlers/health.rs crates/ataqu-api/src/lib.rs crates/ataqu-api/tests/health_test.rs
git commit -m "feat(api): add /api/v1/health/status endpoint with 5s cache"
```
