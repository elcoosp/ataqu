# VISTA Drill-Down & Cross-App Dashboards Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to click on a chart segment to view raw underlying data, and provide pre-aggregated cross-app dashboards (e.g., Revenue + Inventory).

**Architecture:** Create materialized views in PostgreSQL refreshed every 15 minutes by a background worker. Add an endpoint in VISTA to fetch raw rows for a specific metric and dimension (drill-down), and an endpoint to fetch combined views.

**Tech Stack:** Rust, SeaORM, Axum, PostgreSQL Materialized Views.

---

## File Structure
- **Create:** `crates/ataqu-infra-migration/src/m20250101_000012_create_vista_views.rs`
- **Modify:** `crates/ataqu-application/src/vista_service.rs`
- **Modify:** `crates/ataqu-api/src/handlers/vista.rs`
- **Modify:** `crates/ataqu-bin/src/main.rs` (Add refresher worker)

---

### Task 1: Create Materialized Views

**Files:**
- Create: `crates/ataqu-infra-migration/src/m20250101_000012_create_vista_views.rs`

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
            -- Cross-App: Revenue + Inventory
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
git add crates/ataqu-infra-migration/src/m20250101_000012_create_vista_views.rs
git commit -m "feat(db): add cross-app materialized view"
```

---

### Task 2: VISTA Service & Repository for Drill-Down

**Files:**
- Modify: `crates/ataqu-application/src/vista_service.rs`
- Modify: `crates/ataqu-infra-repositories/src/vista_repo_impl.rs`

- [ ] **Step 1: Write repository method for drill-down**

```rust
// In crates/ataqu-infra-repositories/src/vista_repo_impl.rs
pub async fn get_raw_data_points(
    &self,
    tenant_id: &TenantId,
    metric: &str,
    dimension: &str,
    limit: u64,
) -> Result<Vec<serde_json::Value>, sea_orm::DbErr> {
    // Note: In a real app, map `metric` to specific table queries securely
    // For this plan, we stub a generic query to the deals table for "revenue"
    if metric == "revenue" {
        let sql = format!(
            r#"SELECT id, title, amount, status
               FROM collab_crm.deals
               WHERE tenant_id = $1 AND status = 'won'
               LIMIT $2"#
        );
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            &sql,
            vec![tenant_id.as_uuid().into(), (limit as i64).into()],
        );
        let rows = self.db.query_all(stmt).await?;
        Ok(rows.into_iter().map(|r| serde_json::to_value(r).unwrap_or_default()).collect())
    } else {
        Ok(vec![])
    }
}
```

- [ ] **Step 2: Add service method**

```rust
// In crates/ataqu-application/src/vista_service.rs
pub async fn get_drill_down_data(
    &self,
    tenant_id: TenantId,
    metric: &str,
    dimension: &str,
    limit: u64,
) -> VistaResult<Vec<serde_json::Value>> {
    self.repo
        .get_raw_data_points(&tenant_id, metric, dimension, limit)
        .await
        .map_err(VistaServiceError::Repository)
}
```

- [ ] **Step 3: Commit**

```bash
git add crates/ataqu-application/src/vista_service.rs crates/ataqu-infra-repositories/src/vista_repo_impl.rs
git commit -m "feat(vista): add drill-down repository and service methods"
```

---

### Task 3: API Endpoints & Background Refresher

**Files:**
- Modify: `crates/ataqu-api/src/handlers/vista.rs`
- Modify: `crates/ataqu-bin/src/main.rs`

- [ ] **Step 1: Add API Endpoint**

```rust
// In crates/ataqu-api/src/handlers/vista.rs
#[derive(Debug, Deserialize)]
pub struct DrillDownParams {
    pub metric: String,
    pub dimension: String,
    pub limit: Option<u64>,
}

pub async fn get_drill_down(
    State(state): State<AppState>,
    auth: AuthContext,
    Query(params): Query<DrillDownParams>,
) -> ApiResult<Json<Vec<serde_json::Value>>> {
    let data = state
        .vista_service
        .get_drill_down_data(
            auth.tenant_id,
            &params.metric,
            &params.dimension,
            params.limit.unwrap_or(100),
        )
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(data))
}
```
*Add route:* `.route("/data-points/:metric/drill-down", get(get_drill_down))`

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
git commit -m "feat(vista): add drill-down endpoint and 15m refresher worker"
```
