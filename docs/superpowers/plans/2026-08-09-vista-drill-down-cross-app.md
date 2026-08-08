# VISTA Drill-Down & Cross-App Dashboards Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to click on a chart segment to view raw underlying data, and provide pre-aggregated cross-app dashboards (e.g., Revenue + Inventory).

**Architecture:** Create materialized views in PostgreSQL refreshed every 15 minutes by a background worker. Add an endpoint in VISTA to fetch raw rows for a specific metric and dimension (drill-down), and an endpoint to fetch combined views.

**Tech Stack:** Rust, SeaORM, Axum, PostgreSQL Materialized Views.

---

## File Structure
- **Create:** `crates/ataqu-infra-migration/src/m20250101_000012_create_vista_views.rs`
- **Modify:** `crates/ataqu-domain-vista/src/repository.rs` (Add trait methods)
- **Modify:** `crates/ataqu-infra-repositories/src/vista_repo_impl.rs` (Implement methods)
- **Modify:** `crates/ataqu-application/src/vista_service.rs` (Add service methods)
- **Modify:** `crates/ataqu-api/src/handlers/vista.rs` (Add endpoints)
- **Modify:** `crates/ataqu-bin/src/main.rs` (Add refresher worker)

---

### Task 1: Create Materialized Views

**Files:**
- Create: `crates/ataqu-infra-migration/src/m20250101_000012_create_vista_views.rs`
- Modify: `crates/ataqu-infra-migration/src/lib.rs`

- [ ] **Step 1: Write the migration**

```rust
// crates/ataqu-infra-migration/src/m20250101_000012_create_vista_views.rs
use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20250101_000012_create_vista_views"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.get_connection().execute_unprepared(
            r#"
            CREATE MATERIALIZED VIEW vista.cross_app_revenue_inventory AS
            SELECT
                c.tenant_id,
                date_trunc('day', c.updated_at) AS day,
                COUNT(c.id) AS deals_won,
                SUM(c.amount) AS revenue,
                AVG(v.stock_quantity) AS avg_stock
            FROM collab_crm.deals c
            LEFT JOIN vault.variants v ON v.tenant_id = c.tenant_id
            WHERE c.status = 'won'
            GROUP BY c.tenant_id, date_trunc('day', c.updated_at);

            CREATE UNIQUE INDEX idx_cross_app_rev_inv ON vista.cross_app_revenue_inventory (tenant_id, day);
            "#
        ).await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.get_connection().execute_unprepared(
            r#"DROP MATERIALIZED VIEW vista.cross_app_revenue_inventory;"#
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
git commit -m "feat(db): add cross-app materialized view"
```

---

### Task 2: VISTA Repository & Service for Drill-Down

**Files:**
- Modify: `crates/ataqu-domain-vista/src/repository.rs`
- Modify: `crates/ataqu-infra-repositories/src/vista_repo_impl.rs`
- Modify: `crates/ataqu-application/src/vista_service.rs`

- [ ] **Step 1: Add trait methods**

```rust
// In crates/ataqu-domain-vista/src/repository.rs
#[async_trait]
pub trait VistaRepository: Send + Sync {
    // ... existing methods ...
    async fn get_raw_data_points(&self, tenant_id: &ataqu_kernel::TenantId, metric: &str, limit: u64) -> Result<Vec<serde_json::Value>, ataqu_kernel::RepositoryError>;
    async fn get_cross_app_view(&self, tenant_id: &ataqu_kernel::TenantId, view_name: &str) -> Result<Vec<serde_json::Value>, ataqu_kernel::RepositoryError>;
}
```

- [ ] **Step 2: Implement in infra**

```rust
// In crates/ataqu-infra-repositories/src/vista_repo_impl.rs
use sea_orm::{ConnectionTrait, DatabaseBackend, Statement};
use ataqu_kernel::{TenantId, RepositoryError};

pub struct VistaRepositoryImpl {
    db: sea_orm::DatabaseConnection,
}

impl VistaRepositoryImpl {
    // ... existing methods ...

    pub async fn get_raw_data_points(&self, tenant_id: &TenantId, metric: &str, limit: u64) -> Result<Vec<serde_json::Value>, RepositoryError> {
        if metric == "revenue" {
            let sql = r#"
                SELECT id, title, amount, status
                FROM collab_crm.deals
                WHERE tenant_id = $1 AND status = 'won'
                LIMIT $2
            "#;
            let stmt = Statement::from_sql_and_values(
                DatabaseBackend::Postgres,
                sql,
                vec![tenant_id.as_uuid().into(), (limit as i64).into()],
            );
            let rows = self.db.query_all(stmt).await.map_err(|e| RepositoryError::Database(e.to_string()))?;
            Ok(rows.into_iter().map(|r| serde_json::to_value(r).unwrap_or_default()).collect())
        } else {
            Ok(vec![])
        }
    }

    pub async fn get_cross_app_view(&self, tenant_id: &TenantId, view_name: &str) -> Result<Vec<serde_json::Value>, RepositoryError> {
        if view_name == "revenue_inventory" {
            let sql = r#"SELECT * FROM vista.cross_app_revenue_inventory WHERE tenant_id = $1"#;
            let stmt = Statement::from_sql_and_values(
                DatabaseBackend::Postgres,
                sql,
                vec![tenant_id.as_uuid().into()],
            );
            let rows = self.db.query_all(stmt).await.map_err(|e| RepositoryError::Database(e.to_string()))?;
            Ok(rows.into_iter().map(|r| serde_json::to_value(r).unwrap_or_default()).collect())
        } else {
            Ok(vec![])
        }
    }
}
```

- [ ] **Step 3: Add service methods**

```rust
// In crates/ataqu-application/src/vista_service.rs
pub async fn get_drill_down_data(&self, tenant_id: TenantId, metric: &str, limit: u64) -> VistaResult<Vec<serde_json::Value>> {
    self.repo.get_raw_data_points(&tenant_id, metric, limit).await.map_err(VistaServiceError::Repository)
}

pub async fn get_cross_app_dashboard(&self, tenant_id: TenantId, view_name: &str) -> VistaResult<Vec<serde_json::Value>> {
    self.repo.get_cross_app_view(&tenant_id, view_name).await.map_err(VistaServiceError::Repository)
}
```

- [ ] **Step 4: Commit**

```bash
git add crates/ataqu-domain-vista/src/repository.rs crates/ataqu-infra-repositories/src/vista_repo_impl.rs crates/ataqu-application/src/vista_service.rs
git commit -m "feat(vista): add drill-down and cross-app repository and service methods"
```

---

### Task 3: API Endpoints & Background Refresher

**Files:**
- Modify: `crates/ataqu-api/src/handlers/vista.rs`
- Modify: `crates/ataqu-bin/src/main.rs`

- [ ] **Step 1: Add API Endpoints**

```rust
// In crates/ataqu-api/src/handlers/vista.rs
#[derive(Debug, Deserialize)]
pub struct DrillDownParams {
    pub metric: String,
    pub limit: Option<u64>,
}

pub async fn get_drill_down(
    State(state): State<AppState>,
    auth: AuthContext,
    Query(params): Query<DrillDownParams>,
) -> ApiResult<Json<Vec<serde_json::Value>>> {
    let data = state.vista_service.get_drill_down_data(auth.tenant_id, &params.metric, params.limit.unwrap_or(100)).await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(data))
}

#[derive(Debug, Deserialize)]
pub struct CrossAppParams {
    pub view: String,
}

pub async fn get_cross_app(
    State(state): State<AppState>,
    auth: AuthContext,
    Query(params): Query<CrossAppParams>,
) -> ApiResult<Json<Vec<serde_json::Value>>> {
    let data = state.vista_service.get_cross_app_dashboard(auth.tenant_id, &params.view).await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(data))
}
```
*Add routes:*
`.route("/data-points/:metric/drill-down", get(get_drill_down))`
`.route("/cross-app", get(get_cross_app))`

- [ ] **Step 2: Add Materialized View Refresher Worker**

```rust
// In crates/ataqu-bin/src/main.rs
tokio::spawn(async move {
    loop {
        tracing::info!("Refreshing VISTA materialized views...");
        let sql = "REFRESH MATERIALIZED VIEW CONCURRENTLY vista.cross_app_revenue_inventory";
        let stmt = sea_orm::Statement::from_sql_and_values(sea_orm::DbBackend::Postgres, sql, vec![]);
        if let Err(e) = pools.core.execute(stmt).await {
            tracing::error!("Failed to refresh VISTA views: {}", e);
        }
        tokio::time::sleep(Duration::from_secs(900)).await; // 15 minutes
    }
});
```

- [ ] **Step 3: Run tests & Commit**

Run: `cargo nextest run --workspace`
Expected: PASS

```bash
git add crates/ataqu-api/src/handlers/vista.rs crates/ataqu-bin/src/main.rs
git commit -m "feat(vista): add drill-down and cross-app endpoints + 15m refresher worker"
```
