# Access Governance & Audit Log Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a cross-app permission matrix and a unified audit log that records all mutations across all 10 apps.

**Architecture:** Create a new `core.permissions` table and a `core.audit_logs` table (partitioned by month). Inject an `AuditLogger` into the application services to record mutations transactionally. Expose endpoints in AEGIS for viewing the matrix and logs.

**Tech Stack:** Rust, SeaORM, Axum, PostgreSQL.

---

## File Structure
- **Create:** `crates/ataqu-infra-migration/src/m20250101_000011_create_audit_and_permissions.rs`
- **Create:** `crates/ataqu-infra-repositories/src/audit_repo.rs`
- **Create:** `crates/ataqu-application/src/audit_service.rs`
- **Modify:** `crates/ataqu-api/src/handlers/aegis.rs`

---

### Task 1: Database Migration for Audit & Permissions

**Files:**
- Create: `crates/ataqu-infra-migration/src/m20250101_000011_create_audit_and_permissions.rs`
- Modify: `crates/ataqu-infra-migration/src/lib.rs`

- [ ] **Step 1: Write the migration file**

```rust
// crates/ataqu-infra-migration/src/m20250101_000011_create_audit_and_permissions.rs
use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20250101_000011_create_audit_and_permissions"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create core.permissions
        manager.get_connection().execute_unprepared(
            r#"
            CREATE TABLE core.permissions (
                id BIGSERIAL PRIMARY KEY,
                tenant_id UUID NOT NULL,
                user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
                app TEXT NOT NULL,
                role TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE (tenant_id, user_id, app)
            );
            CREATE INDEX idx_permissions_tenant_user ON core.permissions (tenant_id, user_id);

            -- Create core.audit_logs (partitioned by month)
            CREATE TABLE core.audit_logs (
                id BIGSERIAL,
                tenant_id UUID NOT NULL,
                user_id UUID NOT NULL,
                action TEXT NOT NULL,
                app TEXT NOT NULL,
                entity_type TEXT,
                entity_id UUID,
                old_value JSONB,
                new_value JSONB,
                ip_address INET,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                PRIMARY KEY (id, created_at)
            ) PARTITION BY RANGE (created_at);

            -- Create initial partition
            CREATE TABLE core.audit_logs_2026_08 PARTITION OF core.audit_logs
            FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
            CREATE INDEX idx_audit_logs_tenant ON core.audit_logs (tenant_id, created_at DESC);
            "#
        ).await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.get_connection().execute_unprepared(
            r#"
            DROP TABLE core.audit_logs;
            DROP TABLE core.permissions;
            "#
        ).await?;
        Ok(())
    }
}
```

- [ ] **Step 2: Add to migrator lib.rs**

Add `Box::new(Migration),` to the `vec![]` in `lib.rs`.

- [ ] **Step 3: Run migration**

Run: `cargo run --bin migrator`
Expected: Success

- [ ] **Step 4: Commit**

```bash
git add crates/ataqu-infra-migration/
git commit -m "feat(db): add permissions and audit_logs tables"
```

---

### Task 2: Audit Repository & Service

**Files:**
- Create: `crates/ataqu-infra-repositories/src/audit_repo.rs`
- Create: `crates/ataqu-application/src/audit_service.rs`

- [ ] **Step 1: Write implementation for AuditRepository**

```rust
// crates/ataqu-infra-repositories/src/audit_repo.rs
use sea_orm::{ConnectionTrait, DatabaseConnection, DbBackend, Statement};
use uuid::Uuid;
use serde_json::Value;

pub struct AuditRepository {
    db: DatabaseConnection,
}

impl AuditRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn append_log(
        &self,
        tenant_id: Uuid,
        user_id: Uuid,
        action: &str,
        app: &str,
        entity_type: Option<&str>,
        entity_id: Option<Uuid>,
        old_value: Option<Value>,
        new_value: Option<Value>,
    ) -> Result<(), sea_orm::DbErr> {
        let sql = r#"
            INSERT INTO core.audit_logs
            (tenant_id, user_id, action, app, entity_type, entity_id, old_value, new_value)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        "#;
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            sql,
            vec![
                tenant_id.into(),
                user_id.into(),
                action.into(),
                app.into(),
                entity_type.into(),
                entity_id.into(),
                old_value.into(),
                new_value.into(),
            ],
        );
        self.db.execute(stmt).await?;
        Ok(())
    }
}
```

- [ ] **Step 2: Write AuditService**

```rust
// crates/ataqu-application/src/audit_service.rs
use std::sync::Arc;
use uuid::Uuid;
use serde_json::Value;

#[async_trait::async_trait]
pub trait AuditPort: Send + Sync {
    async fn append(&self, tenant_id: Uuid, user_id: Uuid, action: &str, app: &str, entity_type: Option<&str>, entity_id: Option<Uuid>, old_value: Option<Value>, new_value: Option<Value>) -> Result<(), String>;
}

pub struct AuditService {
    repo: Arc<dyn AuditPort>,
}

impl AuditService {
    pub fn new(repo: Arc<dyn AuditPort>) -> Self {
        Self { repo }
    }

    // Helper method used by other services
    pub async fn log_action(&self, tenant_id: Uuid, user_id: Uuid, action: &str, app: &str, entity_id: Option<Uuid>, new_value: Option<Value>) -> Result<(), String> {
        self.repo.append(tenant_id, user_id, action, app, Some("entity"), entity_id, None, new_value).await
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add crates/ataqu-infra-repositories/src/audit_repo.rs crates/ataqu-application/src/audit_service.rs
git commit -m "feat(app): add audit repository and service"
```

---

### Task 3: API Endpoints for Matrix & Logs

**Files:**
- Modify: `crates/ataqu-api/src/handlers/aegis.rs`

- [ ] **Step 1: Write the failing test for audit log endpoint**

*(Assume standard API integration test setup)*

- [ ] **Step 2: Write minimal implementation**

```rust
// In crates/ataqu-api/src/handlers/aegis.rs
pub async fn get_audit_log(
    State(state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<Json<Vec<serde_json::Value>>> {
    if !auth.has_role("admin") {
        return Err(ApiResponseError::Forbidden("Admin access required".to_string()));
    }

    let logs = state.aegis_service.get_audit_logs(auth.tenant_id.as_uuid(), 100, 0)
        .await
        .map_err(map_aegis_error)?;

    Ok(Json(logs))
}

pub async fn get_permission_matrix(
    State(state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<Json<serde_json::Value>> {
    if !auth.has_role("admin") {
        return Err(ApiResponseError::Forbidden("Admin access required".to_string()));
    }

    let matrix = state.aegis_service.get_permission_matrix(auth.tenant_id.as_uuid())
        .await
        .map_err(map_aegis_error)?;

    Ok(Json(matrix))
}
```
*Add routes:*
`.route("/audit-log", get(get_audit_log))`
`.route("/permission-matrix", get(get_permission_matrix))`

- [ ] **Step 3: Run test to verify it passes**

Run: `cargo nextest run -p ataqu-api`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add crates/ataqu-api/src/handlers/aegis.rs
git commit -m "feat(api): add audit log and permission matrix endpoints"
```
