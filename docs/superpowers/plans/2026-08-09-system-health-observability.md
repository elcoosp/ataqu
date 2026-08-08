# System Health & Observability Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a native `/api/v1/health/status` endpoint that aggregates outbox lag, pending events, and DB pool usage into a single JSON payload, cached for 5 seconds.

**Architecture:** Create a `HealthRepository` in the infra layer using raw SQL via SeaORM. Create a `HealthService` in the application layer to structure the payload. Wire it into a public API route in `ataqu-api` with a Moka cache.

**Tech Stack:** Rust, Axum, SeaORM, sqlx, Moka cache.

---

## File Structure
- **Overwrite:** `crates/ataqu-infra-repositories/src/health_repo.rs` (Plan 0 created this as empty)
- **Overwrite:** `crates/ataqu-application/src/health_service.rs` (Plan 0 created this as empty)
- **Overwrite:** `crates/ataqu-api/src/handlers/health.rs` (Plan 0 created this as empty)
- **Modify:** `crates/ataqu-bin/src/main.rs` (Replace `todo!()` stubs with real initialization)

---

### Task 1: Health Metrics Repository

**Files:**
- Overwrite: `crates/ataqu-infra-repositories/src/health_repo.rs`

- [ ] **Step 1: Write the failing test**

```rust
// crates/ataqu-infra-repositories/src/health_repo.rs
use sea_orm::{ConnectionTrait, DatabaseBackend, DatabaseConnection, Statement};

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
        let stmt = Statement::from_sql_and_values(DatabaseBackend::Postgres, sql, vec![]);
        let result = self.db.query_one(stmt).await?.unwrap();
        let lag: i64 = result.try_get("", "lag")?;
        Ok(lag.max(0) as u64)
    }

    pub async fn get_pending_outbox_count(&self) -> Result<u64, sea_orm::DbErr> {
        let sql = r#"SELECT COUNT(*) as count FROM core.outbox WHERE status = 'pending'"#;
        let stmt = Statement::from_sql_and_values(DatabaseBackend::Postgres, sql, vec![]);
        let result = self.db.query_one(stmt).await?.unwrap();
        let count: i64 = result.try_get("", "count")?;
        Ok(count as u64)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sea_orm::Database;

    #[tokio::test]
    async fn test_get_outbox_metrics() {
        let db_url = std::env::var("DATABASE_TEST_URL")
            .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5433/ataqu_test".to_string());

        let db = match Database::connect(&db_url).await {
            Ok(db) => db,
            Err(_) => {
                eprintln!("Skipping test_get_outbox_metrics: DB not available.");
                return;
            }
        };

        let repo = HealthRepository::new(db);

        let lag = repo.get_outbox_lag_seconds().await.unwrap();
        assert!(lag >= 0);

        let count = repo.get_pending_outbox_count().await.unwrap();
        assert!(count >= 0);
    }
}
```

- [ ] **Step 2: Run test to verify it passes**

Run: `cargo nextest run -p ataqu-infra-repositories test_get_outbox_metrics`
Expected: PASS (or skip if DB offline)

- [ ] **Step 3: Commit**

```bash
git add crates/ataqu-infra-repositories/src/health_repo.rs
git commit -m "feat(infra): implement HealthRepository"
```

---

### Task 2: Health Application Service

**Files:**
- Overwrite: `crates/ataqu-application/src/health_service.rs`

- [ ] **Step 1: Write implementation and tests**

```rust
// crates/ataqu-application/src/health_service.rs
use async_trait::async_trait;
use serde::Serialize;
use std::sync::Arc;

#[async_trait]
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

        let outbox_status = if lag > 5 || pending > 1000 { "degraded" } else { "nominal" };
        let overall_status = if outbox_status == "nominal" { "nominal" } else { "degraded" };

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

// Adapter to implement the app trait using the concrete infra repo
use ataqu_infra_repositories::health_repo::HealthRepository;

pub struct HealthRepoAdapter(pub HealthRepository);

#[async_trait]
impl HealthRepoTrait for HealthRepoAdapter {
    async fn get_outbox_lag_seconds(&self) -> Result<u64, String> {
        self.0.get_outbox_lag_seconds().await.map_err(|e| e.to_string())
    }
    async fn get_pending_outbox_count(&self) -> Result<u64, String> {
        self.0.get_pending_outbox_count().await.map_err(|e| e.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use mockall::mock;

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
        let mut mock_repo = MockHealthRepo::new();
        mock_repo.expect_get_outbox_lag_seconds().returning(|| Ok(0));
        mock_repo.expect_get_pending_outbox_count().returning(|| Ok(0));

        let service = HealthService::new(Arc::new(mock_repo));
        let health = service.get_system_health().await.unwrap();

        assert_eq!(health.status, "nominal");
    }
}
```

- [ ] **Step 2: Run test to verify it passes**

Run: `cargo nextest run -p ataqu-application test_get_system_health_nominal`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add crates/ataqu-application/src/health_service.rs
git commit -m "feat(app): implement HealthService"
```

---

### Task 3: API Endpoint & Wiring

**Files:**
- Overwrite: `crates/ataqu-api/src/handlers/health.rs`
- Modify: `crates/ataqu-bin/src/main.rs` (Replace stubs)

- [ ] **Step 1: Implement API Handler**

```rust
// crates/ataqu-api/src/handlers/health.rs
use axum::{extract::State, response::Json};
use crate::{AppState, error::ApiResult};

pub async fn get_system_health(
    State(state): State<AppState>,
) -> ApiResult<Json<serde_json::Value>> {
    if let Some(cached) = state.health_cache.get("system_health") {
        return Ok(Json(cached));
    }

    let health = state.health_service.get_system_health().await
        .map_err(|e| crate::error::ApiResponseError::internal(&e))?;

    let json_val = serde_json::to_value(&health).unwrap();
    state.health_cache.insert("system_health".to_string(), json_val.clone());

    Ok(Json(json_val))
}
```

- [ ] **Step 2: Replace stubs in `main.rs`**

Find the `health_service` stub in `crates/ataqu-bin/src/main.rs` and replace it with:
```rust
let health_repo = Arc::new(ataqu_application::health_service::HealthRepoAdapter(
    ataqu_infra_repositories::health_repo::HealthRepository::new(pools.core.clone())
));
let health_service = Arc::new(ataqu_application::health_service::HealthService::new(health_repo));
```
*(Ensure the `health_cache` stub is already initialized as `Arc::new(moka::sync::Cache::builder().time_to_live(Duration::from_secs(5)).build())` from Plan 0. If not, update it).*

- [ ] **Step 3: Run check & Commit**

Run: `cargo check --workspace`
Expected: PASS

```bash
git add crates/ataqu-api/src/handlers/health.rs crates/ataqu-bin/src/main.rs
git commit -m "feat(api): wire /api/v1/health/status endpoint"
```
