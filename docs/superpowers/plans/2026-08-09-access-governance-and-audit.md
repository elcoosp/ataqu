# Access Governance & Audit Log Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a cross-app permission matrix and a unified audit log that records all mutations across all 10 apps.

**Architecture:** Create a new `core.permissions` table and a `core.audit_logs` table (partitioned by month). Inject an `AuditLogger` into the application services to record mutations transactionally. Expose endpoints in AEGIS for viewing the matrix and logs.

**Tech Stack:** Rust, SeaORM, Axum, PostgreSQL.

---

## File Structure
- **Create:** `crates/ataqu-infra-migration/src/m20250101_000011_create_audit_and_permissions.rs`
- **Create:** `crates/ataqu-infra-repositories/src/audit_repo.rs`
- **Modify:** `crates/ataqu-infra-repositories/src/lib.rs`
- **Create:** `crates/ataqu-application/src/audit_service.rs`
- **Modify:** `crates/ataqu-application/src/lib.rs`
- **Modify:** `crates/ataqu-domain-aegis/src/repository.rs` (Add audit/permission traits)
- **Modify:** `crates/ataqu-application/src/aegis_service.rs` (Implement methods)
- **Modify:** `crates/ataqu-api/src/handlers/aegis.rs` (Add endpoints)

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

Add `Box::new(Migration),` to the `vec![]` in `crates/ataqu-infra-migration/src/lib.rs`.

- [ ] **Step 3: Run migration**

Run: `cargo run --bin migrator`
Expected: Success

- [ ] **Step 4: Commit**

```bash
git add crates/ataqu-infra-migration/
git commit -m "feat(db): add permissions and audit_logs tables"
```

---

### Task 2: Audit & Permission Repository

**Files:**
- Create: `crates/ataqu-infra-repositories/src/audit_repo.rs`
- Modify: `crates/ataqu-infra-repositories/src/lib.rs`

- [ ] **Step 1: Write implementation for AuditRepository**

```rust
// crates/ataqu-infra-repositories/src/audit_repo.rs
use sea_orm::{ConnectionTrait, DatabaseBackend, DatabaseConnection, Statement, Value};
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
            DatabaseBackend::Postgres,
            sql,
            vec![
                tenant_id.into(),
                user_id.into(),
                action.into(),
                app.into(),
                entity_type.map(|s| s.to_string()).into(),
                entity_id.into(),
                old_value.into(),
                new_value.into(),
            ],
        );
        self.db.execute(stmt).await?;
        Ok(())
    }

    pub async fn list_logs(&self, tenant_id: Uuid, limit: u64, offset: u64) -> Result<Vec<Value>, sea_orm::DbErr> {
        let sql = r#"
            SELECT * FROM core.audit_logs
            WHERE tenant_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        "#;
        let stmt = Statement::from_sql_and_values(
            DatabaseBackend::Postgres,
            sql,
            vec![tenant_id.into(), (limit as i64).into(), (offset as i64).into()],
        );
        let rows = self.db.query_all(stmt).await?;
        Ok(rows.into_iter().map(|r| serde_json::to_value(r).unwrap_or_default()).collect())
    }
}
```

- [ ] **Step 2: Export module**

```rust
// crates/ataqu-infra-repositories/src/lib.rs
pub mod audit_repo;
```

- [ ] **Step 3: Commit**

```bash
git add crates/ataqu-infra-repositories/src/audit_repo.rs crates/ataqu-infra-repositories/src/lib.rs
git commit -m "feat(infra): add AuditRepository"
```

---

### Task 3: API Endpoints for Matrix & Logs

**Files:**
- Modify: `crates/ataqu-domain-aegis/src/repository.rs`
- Modify: `crates/ataqu-application/src/aegis_service.rs`
- Modify: `crates/ataqu-api/src/handlers/aegis.rs`

- [ ] **Step 1: Add trait methods to AEGIS domain**

```rust
// In crates/ataqu-domain-aegis/src/repository.rs
#[async_trait]
pub trait AuditRepositoryTrait: Send + Sync {
    async fn append_log(&self, tenant_id: Uuid, user_id: Uuid, action: &str, app: &str, entity_type: Option<&str>, entity_id: Option<Uuid>, old_value: Option<serde_json::Value>, new_value: Option<serde_json::Value>) -> Result<(), String>;
    async fn list_logs(&self, tenant_id: Uuid, limit: u64, offset: u64) -> Result<Vec<serde_json::Value>, String>;
}
```

- [ ] **Step 2: Implement in AegisService**

```rust
// In crates/ataqu-application/src/aegis_service.rs
pub struct AegisService {
    // ... existing fields ...
    audit_repo: Arc<dyn ataqu_domain_aegis::repository::AuditRepositoryTrait + Send + Sync>,
}

impl AegisService {
    // Update constructor to accept audit_repo

    pub async fn get_audit_logs(&self, tenant_id: Uuid, limit: u64, offset: u64) -> Result<Vec<serde_json::Value>, AegisServiceError> {
        self.audit_repo.list_logs(tenant_id, limit, offset).await
            .map_err(|e| AegisServiceError::Internal(e))
    }

    pub async fn get_permission_matrix(&self, tenant_id: Uuid) -> Result<serde_json::Value, AegisServiceError> {
        // For v1, we return a simple list of users with their roles.
        // A full matrix would query the permissions table.
        let users = self.repo.list_users(tenant_id).await?;
        Ok(serde_json::to_value(users).unwrap_or_default())
    }
}
```

- [ ] **Step 3: Add API Handlers**

```rust
// In crates/ataqu-api/src/handlers/aegis.rs
pub async fn get_audit_log(
    State(state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<Json<Vec<serde_json::Value>>> {
    if !auth.has_role("admin") {
        return Err(ApiResponseError::Forbidden("Admin access required".to_string()));
    }
    let logs = state.aegis_service.get_audit_logs(auth.tenant_id.as_uuid(), 100, 0).await
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
    let matrix = state.aegis_service.get_permission_matrix(auth.tenant_id.as_uuid()).await
        .map_err(map_aegis_error)?;
    Ok(Json(matrix))
}
```
*Add routes:*
`.route("/audit-log", get(get_audit_log))`
`.route("/permission-matrix", get(get_permission_matrix))`

- [ ] **Step 4: Wire up in main.rs**

```rust
// In crates/ataqu-bin/src/main.rs
use ataqu_infra_repositories::audit_repo::AuditRepository;

// Implement the trait adapter
pub struct AuditRepoAdapter(AuditRepository);
#[async_trait::async_trait]
impl ataqu_domain_aegis::repository::AuditRepositoryTrait for AuditRepoAdapter {
    async fn append_log(&self, tenant_id: Uuid, user_id: Uuid, action: &str, app: &str, entity_type: Option<&str>, entity_id: Option<Uuid>, old_value: Option<serde_json::Value>, new_value: Option<serde_json::Value>) -> Result<(), String> {
        self.0.append_log(tenant_id, user_id, action, app, entity_type, entity_id, old_value, new_value).await.map_err(|e| e.to_string())
    }
    async fn list_logs(&self, tenant_id: Uuid, limit: u64, offset: u64) -> Result<Vec<serde_json::Value>, String> {
        self.0.list_logs(tenant_id, limit, offset).await.map_err(|e| e.to_string())
    }
}

// Inside main():
let audit_repo = Arc::new(AuditRepoAdapter(AuditRepository::new(pools.core.clone())));
// Pass `audit_repo` to `AegisService::new`
```

- [ ] **Step 5: Run check & Commit**

Run: `cargo check --workspace`
Expected: PASS

```bash
git add crates/ataqu-domain-aegis/src/repository.rs crates/ataqu-application/src/aegis_service.rs crates/ataqu-api/src/handlers/aegis.rs crates/ataqu-bin/src/main.rs
git commit -m "feat(api): add audit log and permission matrix endpoints"
```
