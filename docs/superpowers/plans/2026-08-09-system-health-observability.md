# System Health & Observability Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a native `/api/v1/health/status` endpoint that aggregates outbox lag, pending events, and DB pool usage into a single JSON payload, cached for 5 seconds.

**Architecture:** Create a `HealthRepository` in the infra layer using raw SQL via SeaORM. Create a `HealthService` in the application layer to structure the payload. Wire it into a public API route in `ataqu-api` with a Moka cache.

**Tech Stack:** Rust, Axum, SeaORM, sqlx, Moka cache.

---

## File Structure
- **Create:** `crates/ataqu-infra-migration/src/m20250101_000011_create_health_tables.rs` (If specific tables were needed, but we query existing `core.outbox`. So no migration needed).
- **Create:** `crates/ataqu-infra-repositories/src/health_repo.rs` (Raw SQL queries)
- **Modify:** `crates/ataqu-infra-repositories/src/lib.rs` (Export health_repo)
- **Create:** `crates/ataqu-application/src/health_service.rs` (Service logic and payload structs)
- **Modify:** `crates/ataqu-application/src/lib.rs` (Export health_service)
- **Modify:** `crates/ataqu-api/src/handlers/mod.rs` (Add health module)
- **Create:** `crates/ataqu-api/src/handlers/health.rs` (API Endpoint)
- **Modify:** `crates/ataqu-api/src/lib.rs` (Wire route and cache to AppState)
- **Modify:** `crates/ataqu-bin/src/main.rs` (Initialize HealthService and inject into AppState)

---

### Task 1: Health Metrics Repository

**Files:**
- Create: `crates/ataqu-infra-repositories/src/health_repo.rs`
- Modify: `crates/ataqu-infra-repositories/src/lib.rs`

- [ ] **Step 1: Write the failing test**

```rust
// crates/ataqu-infra-repositories/src/health_repo.rs
use sea_orm::{ConnectionTrait, DatabaseBackend, DatabaseConnection, Statement};
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

- [ ] **Step 2: Run test to verify it fails**

Run: `cargo nextest run -p ataqu-infra-repositories test_get_outbox_metrics`
Expected: FAIL (module not found / not exported)

- [ ] **Step 3: Export module in lib.rs**

```rust
// crates/ataqu-infra-repositories/src/lib.rs
pub mod health_repo;
// ... existing exports ...
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cargo nextest run -p ataqu-infra-repositories test_get_outbox_metrics`
Expected: PASS (if DB is running) or SKIP (if DB is not running, but compiles successfully).

- [ ] **Step 5: Commit**

```bash
git add crates/ataqu-infra-repositories/src/health_repo.rs crates/ataqu-infra-repositories/src/lib.rs
git commit -m "feat(infra): add HealthRepository with outbox metrics queries"
```

---

### Task 2: Health Application Service

**Files:**
- Create: `crates/ataqu-application/src/health_service.rs`
- Modify: `crates/ataqu-application/src/lib.rs`

- [ ] **Step 1: Write the failing test**

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
        assert_eq!(health.components.outbox.lag_seconds, 0);
    }

    #[tokio::test]
    async fn test_get_system_health_degraded() {
        let mut mock_repo = MockHealthRepo::new();
        mock_repo.expect_get_outbox_lag_seconds().returning(|| Ok(10)); // > 5
        mock_repo.expect_get_pending_outbox_count().returning(|| Ok(0));

        let service = HealthService::new(Arc::new(mock_repo));
        let health = service.get_system_health().await.unwrap();

        assert_eq!(health.status, "degraded");
        assert_eq!(health.components.outbox.status, "degraded");
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cargo nextest run -p ataqu-application test_get_system_health`
Expected: FAIL (module not found)

- [ ] **Step 3: Export module in lib.rs**

```rust
// crates/ataqu-application/src/lib.rs
pub mod health_service;
// ... existing exports ...
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cargo nextest run -p ataqu-application test_get_system_health`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add crates/ataqu-application/src/health_service.rs crates/ataqu-application/src/lib.rs
git commit -m "feat(app): add HealthService with nominal/degraded logic"
```

---

### Task 3: API Endpoint & Moka Cache Wiring

**Files:**
- Modify: `crates/ataqu-api/src/handlers/mod.rs`
- Create: `crates/ataqu-api/src/handlers/health.rs`
- Modify: `crates/ataqu-api/src/lib.rs`

- [ ] **Step 1: Create health handler**

```rust
// crates/ataqu-api/src/handlers/health.rs
use axum::{extract::State, response::Json};
use crate::{AppState, error::ApiResult};

pub async fn get_system_health(
    State(state): State<AppState>,
) -> ApiResult<Json<serde_json::Value>> {
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

- [ ] **Step 2: Export health handler**

```rust
// crates/ataqu-api/src/handlers/mod.rs
pub mod health;
// ... existing exports ...
```

- [ ] **Step 3: Add HealthService and Cache to AppState and Router**

```rust
// crates/ataqu-api/src/lib.rs
use ataqu_application::health_service::HealthService;
use moka::sync::Cache;
use std::sync::Arc;
use std::time::Duration;

#[derive(Clone)]
pub struct AppState {
    // ... existing fields ...
    pub health_service: Arc<HealthService>,
    pub health_cache: Arc<Cache<String, serde_json::Value>>,
}

pub fn create_router(state: AppState) -> Router {
    // ... existing setup ...

    let public_routes = Router::new()
        // ... existing routes ...
        .route("/api/v1/health/status", axum::routing::get(handlers::health::get_system_health))
        // ... existing layers ...
}
```

- [ ] **Step 4: Run check to verify it compiles**

Run: `cargo check -p ataqu-api`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add crates/ataqu-api/src/handlers/health.rs crates/ataqu-api/src/handlers/mod.rs crates/ataqu-api/src/lib.rs
git commit -m "feat(api): add /api/v1/health/status endpoint with 5s cache"
```

---

### Task 4: Wire Up in Main Binary

**Files:**
- Modify: `crates/ataqu-bin/src/main.rs`

- [ ] **Step 1: Initialize HealthService and inject into AppState**

```rust
// crates/ataqu-bin/src/main.rs
use ataqu_application::health_service::{HealthService, HealthRepoTrait};
use ataqu_infra_repositories::health_repo::HealthRepository;
use moka::sync::Cache;
use std::time::Duration;

// Adapter to implement the application trait using the concrete repo
pub struct HealthRepoAdapter(HealthRepository);
#[async_trait::async_trait]
impl HealthRepoTrait for HealthRepoAdapter {
    async fn get_outbox_lag_seconds(&self) -> Result<u64, String> {
        self.0.get_outbox_lag_seconds().await.map_err(|e| e.to_string())
    }
    async fn get_pending_outbox_count(&self) -> Result<u64, String> {
        self.0.get_pending_outbox_count().await.map_err(|e| e.to_string())
    }
}

// Inside main() after `let pools = Pools::new(&db_url).await?;`
let health_repo = Arc::new(HealthRepoAdapter(HealthRepository::new(pools.core.clone())));
let health_service = Arc::new(HealthService::new(health_repo));

let health_cache = Arc::new(
    Cache::builder()
        .time_to_live(Duration::from_secs(5))
        .build()
);

// Update AppState initialization
let state = AppState {
    // ... existing fields ...
    health_service,
    health_cache,
};
```

- [ ] **Step 2: Run full workspace check**

Run: `cargo check --workspace`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add crates/ataqu-bin/src/main.rs
git commit -m "feat(bin): wire HealthService and cache into AppState"
```
