# Onboarding & Changelog Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a persistent onboarding activation tracker and a transparent in-app changelog.

**Architecture:** Create `core.onboarding_progress` and `core.changelog` tables. Expose endpoints to fetch/update onboarding tasks and list changelog entries.

**Tech Stack:** Rust, SeaORM, Axum.

---

## File Structure
- **Create:** `crates/ataqu-infra-migration/src/m20250101_000014_create_onboarding_and_changelog.rs`
- **Create:** `crates/ataqu-application/src/onboarding_service.rs`
- **Create:** `crates/ataqu-application/src/changelog_service.rs`
- **Modify:** `crates/ataqu-api/src/handlers/mod.rs` (Add `onboarding` and `changelog` modules)
- **Create:** `crates/ataqu-api/src/handlers/onboarding.rs`
- **Create:** `crates/ataqu-api/src/handlers/changelog.rs`

---

### Task 1: Database Migration

**Files:**
- Create: `crates/ataqu-infra-migration/src/m20250101_000014_create_onboarding_and_changelog.rs`

- [ ] **Step 1: Write the migration file**

```rust
// crates/ataqu-infra-migration/src/m20250101_000014_create_onboarding_and_changelog.rs
use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20250101_000014_create_onboarding_and_changelog"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.get_connection().execute_unprepared(
            r#"
            CREATE TABLE core.onboarding_progress (
                tenant_id UUID PRIMARY KEY,
                tasks_completed JSONB NOT NULL DEFAULT '[]'::jsonb,
                last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            CREATE TABLE core.changelog (
                id BIGSERIAL PRIMARY KEY,
                version TEXT NOT NULL,
                date DATE NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                category TEXT NOT NULL CHECK (category IN ('new', 'improved', 'fixed', 'deprecated')),
                breaking_change BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            "#
        ).await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.get_connection().execute_unprepared(
            r#"
            DROP TABLE core.changelog;
            DROP TABLE core.onboarding_progress;
            "#
        ).await?;
        Ok(())
    }
}
```

- [ ] **Step 2: Run migration**

Run: `cargo run --bin migrator`
Expected: Success

- [ ] **Step 3: Commit**

```bash
git add crates/ataqu-infra-migration/
git commit -m "feat(db): add onboarding and changelog tables"
```

---

### Task 2: Onboarding Service & API

**Files:**
- Create: `crates/ataqu-application/src/onboarding_service.rs`
- Create: `crates/ataqu-api/src/handlers/onboarding.rs`

- [ ] **Step 1: Write OnboardingService**

```rust
// crates/ataqu-application/src/onboarding_service.rs
use sea_orm::{ConnectionTrait, DatabaseConnection, DbBackend, Statement};
use serde::{Serialize, Deserialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct OnboardingStatus {
    pub tenant_id: Uuid,
    pub tasks_completed: Vec<String>,
    pub progress_percentage: f64,
}

pub struct OnboardingService {
    db: DatabaseConnection,
}

impl OnboardingService {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn get_status(&self, tenant_id: Uuid) -> Result<OnboardingStatus, String> {
        let sql = "SELECT tasks_completed FROM core.onboarding_progress WHERE tenant_id = $1";
        let stmt = Statement::from_sql_and_values(DbBackend::Postgres, sql, vec![tenant_id.into()]);

        let tasks: Vec<String> = if let Some(row) = self.db.query_one(stmt).await.map_err(|e| e.to_string())? {
            let json: serde_json::Value = row.try_get("", "tasks_completed").map_err(|e| e.to_string())?;
            serde_json::from_value(json).unwrap_or_default()
        } else {
            vec![]
        };

        let total_tasks = 5.0;
        let completed = tasks.len() as f64;
        let progress = (completed / total_tasks) * 100.0;

        Ok(OnboardingStatus {
            tenant_id,
            tasks_completed: tasks,
            progress_percentage: progress,
        })
    }

    pub async fn complete_task(&self, tenant_id: Uuid, task: &str) -> Result<(), String> {
        let sql = r#"
            INSERT INTO core.onboarding_progress (tenant_id, tasks_completed)
            VALUES ($1, $2::jsonb)
            ON CONFLICT (tenant_id) DO UPDATE
            SET tasks_completed = core.onboarding_progress.tasks_completed || $2::jsonb,
                last_active_at = NOW()
        "#;
        let task_json = serde_json::json!([task]);
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            sql,
            vec![tenant_id.into(), task_json.into()],
        );
        self.db.execute(stmt).await.map_err(|e| e.to_string())?;
        Ok(())
    }
}
```

- [ ] **Step 2: Write API Handler**

```rust
// crates/ataqu-api/src/handlers/onboarding.rs
use axum::{extract::State, response::Json};
use crate::{AppState, error::ApiResult, middleware::AuthContext};

pub async fn get_onboarding_status(
    State(state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<Json<serde_json::Value>> {
    let status = state.onboarding_service.get_status(auth.tenant_id.as_uuid()).await
        .map_err(|e| crate::error::ApiResponseError::internal(&e))?;
    Ok(Json(serde_json::to_value(status).unwrap()))
}
```

- [ ] **Step 3: Commit**

```bash
git add crates/ataqu-application/src/onboarding_service.rs crates/ataqu-api/src/handlers/onboarding.rs
git commit -m "feat(app): add onboarding service and API"
```

---

### Task 3: Changelog Service & API

**Files:**
- Create: `crates/ataqu-application/src/changelog_service.rs`
- Create: `crates/ataqu-api/src/handlers/changelog.rs`

- [ ] **Step 1: Write ChangelogService**

```rust
// crates/ataqu-application/src/changelog_service.rs
use sea_orm::{ConnectionTrait, DatabaseConnection, DbBackend, Statement};
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct ChangelogEntry {
    pub id: i64,
    pub version: String,
    pub date: chrono::NaiveDate,
    pub title: String,
    pub description: String,
    pub category: String,
    pub breaking_change: bool,
}

pub struct ChangelogService {
    db: DatabaseConnection,
}

impl ChangelogService {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn list_entries(&self, limit: u64) -> Result<Vec<serde_json::Value>, String> {
        let sql = "SELECT * FROM core.changelog ORDER BY date DESC LIMIT $1";
        let stmt = Statement::from_sql_and_values(DbBackend::Postgres, sql, vec![(limit as i64).into()]);
        let rows = self.db.query_all(stmt).await.map_err(|e| e.to_string())?;
        Ok(rows.into_iter().map(|r| serde_json::to_value(r).unwrap_or_default()).collect())
    }
}
```

- [ ] **Step 2: Write API Handler**

```rust
// crates/ataqu-api/src/handlers/changelog.rs
use axum::{extract::State, response::Json};
use crate::{AppState, error::ApiResult};

pub async fn get_changelog(
    State(state): State<AppState>,
) -> ApiResult<Json<Vec<serde_json::Value>>> {
    let entries = state.changelog_service.list_entries(10).await
        .map_err(|e| crate::error::ApiResponseError::internal(&e))?;
    Ok(Json(entries))
}
```

- [ ] **Step 3: Export modules and add routes**

```rust
// crates/ataqu-api/src/handlers/mod.rs
pub mod onboarding;
pub mod changelog;

// crates/ataqu-api/src/lib.rs (in private_routes)
.route("/api/onboarding/status", axum::routing::get(handlers::onboarding::get_onboarding_status))
.route("/api/changelog", axum::routing::get(handlers::changelog::get_changelog))
```

- [ ] **Step 4: Wire up in main.rs**

```rust
// In crates/ataqu-bin/src/main.rs
let onboarding_service = Arc::new(ataqu_application::onboarding_service::OnboardingService::new(pools.core.clone()));
let changelog_service = Arc::new(ataqu_application::changelog_service::ChangelogService::new(pools.core.clone()));
// Add to AppState
```

- [ ] **Step 5: Run check & Commit**

Run: `cargo check --workspace`
Expected: PASS

```bash
git add crates/ataqu-application/src/changelog_service.rs crates/ataqu-api/src/handlers/changelog.rs crates/ataqu-api/src/handlers/mod.rs crates/ataqu-api/src/lib.rs crates/ataqu-bin/src/main.rs
git commit -m "feat(app): add changelog service and API"
```
