# Multi-Context Entities (CINQ Establishments) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow a CINQ Company to have multiple Establishments (different SIRET/address), selectable at transaction time when creating a Deal.

**Architecture:** Create an `establishments` table in `collab_crm`. Update the `Deal` entity to optionally link to an `establishment_id`. Expose CRUD endpoints for establishments.

**Tech Stack:** Rust, SeaORM, Axum, PostgreSQL.

---

## File Structure
- **Overwrite:** `crates/ataqu-infra-migration/src/m20250101_000015_create_establishments.rs`
- **Overwrite:** `crates/ataqu-domain-cinq/src/establishment.rs` (Plan 0 created this as empty)
- **Modify:** `crates/ataqu-domain-cinq/src/repository.rs`
- **Modify:** `crates/ataqu-domain-cinq/src/deal.rs`
- **Modify:** `crates/ataqu-infra-repositories/src/cinq_repo_impl.rs`
- **Modify:** `crates/ataqu-application/src/cinq_service.rs`
- **Modify:** `crates/ataqu-api/src/handlers/cinq.rs`

---

### Task 1: Database Migration for Establishments

**Files:**
- Overwrite: `crates/ataqu-infra-migration/src/m20250101_000015_create_establishments.rs`

- [ ] **Step 1: Write the migration file**

```rust
// crates/ataqu-infra-migration/src/m20250101_000015_create_establishments.rs
use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20250101_000015_create_establishments"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.get_connection().execute_unprepared(
            r#"
            CREATE TABLE collab_crm.establishments (
                id UUID PRIMARY KEY,
                tenant_id UUID NOT NULL,
                company_name TEXT NOT NULL,
                siret TEXT,
                address TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            ALTER TABLE collab_crm.deals
            ADD COLUMN establishment_id UUID REFERENCES collab_crm.establishments(id);
            "#
        ).await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.get_connection().execute_unprepared(
            r#"
            ALTER TABLE collab_crm.deals DROP COLUMN establishment_id;
            DROP TABLE collab_crm.establishments;
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
git add crates/ataqu-infra-migration/src/m20250101_000015_create_establishments.rs
git commit -m "feat(db): implement establishments schema"
```

---

### Task 2: Domain & Repository Layer

**Files:**
- Overwrite: `crates/ataqu-domain-cinq/src/establishment.rs`
- Modify: `crates/ataqu-domain-cinq/src/repository.rs`
- Modify: `crates/ataqu-domain-cinq/src/deal.rs`
- Modify: `crates/ataqu-infra-repositories/src/cinq_repo_impl.rs`

- [ ] **Step 1: Write Establishment Domain Entity**

```rust
// crates/ataqu-domain-cinq/src/establishment.rs
use ataqu_kernel::TenantId;
use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq)]
pub struct Establishment {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub company_name: String,
    pub siret: Option<String>,
    pub address: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
```

- [ ] **Step 2: Add `establishment_id` to Deal**

```rust
// In crates/ataqu-domain-cinq/src/deal.rs
// Add to Deal struct:
pub establishment_id: Option<Uuid>,

// Add to CreateDealCommand:
pub establishment_id: Option<Uuid>,
```

- [ ] **Step 3: Add Repository Trait and Implement**

```rust
// In crates/ataqu-domain-cinq/src/repository.rs
#[async_trait]
pub trait EstablishmentRepository: Send + Sync {
    async fn save_establishment(&self, est: &crate::establishment::Establishment) -> Result<(), String>;
    async fn list_establishments(&self, tenant_id: &ataqu_kernel::TenantId) -> Result<Vec<crate::establishment::Establishment>, String>;
}
```

```rust
// In crates/ataqu-infra-repositories/src/cinq_repo_impl.rs
// Add implementation for EstablishmentRepository trait
```

- [ ] **Step 4: Commit**

```bash
git add crates/ataqu-domain-cinq/ crates/ataqu-infra-repositories/src/cinq_repo_impl.rs
git commit -m "feat(cinq): implement establishment domain and repo"
```

---

### Task 3: Application Service & API

**Files:**
- Modify: `crates/ataqu-application/src/cinq_service.rs`
- Modify: `crates/ataqu-api/src/handlers/cinq.rs`

- [ ] **Step 1: Add Service Methods**

```rust
// In crates/ataqu-application/src/cinq_service.rs
pub async fn create_establishment(&self, cmd: CreateEstablishmentCommand) -> CinqResult<Establishment> {
    let id = self.id_gen.new_uuid_v7();
    let now: chrono::DateTime<chrono::Utc> = self.clock.now().into();
    let est = Establishment {
        id,
        tenant_id: cmd.tenant_id,
        company_name: cmd.company_name,
        siret: cmd.siret,
        address: cmd.address,
        created_at: now,
        updated_at: now,
    };
    self.est_repo.save_establishment(&est).await.map_err(CinqServiceError::Repository)?;
    Ok(est)
}

pub async fn list_establishments(&self, tenant_id: TenantId) -> CinqResult<Vec<Establishment>> {
    self.est_repo.list_establishments(&tenant_id).await.map_err(CinqServiceError::Repository)
}
```

- [ ] **Step 2: Add API Handlers**

```rust
// In crates/ataqu-api/src/handlers/cinq.rs
#[derive(Debug, Deserialize)]
pub struct CreateEstablishmentRequest {
    pub company_name: String,
    pub siret: Option<String>,
    pub address: Option<String>,
}

pub async fn create_establishment(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(payload): Json<CreateEstablishmentRequest>,
) -> ApiResult<(StatusCode, Json<serde_json::Value>)> {
    let cmd = CreateEstablishmentCommand {
        tenant_id: auth.tenant_id,
        company_name: payload.company_name,
        siret: payload.siret,
        address: payload.address,
    };
    let est = state.cinq_service.create_establishment(cmd).await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok((StatusCode::CREATED, Json(serde_json::to_value(est).unwrap())))
}

pub async fn list_establishments(
    State(state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<Json<Vec<serde_json::Value>>> {
    let ests = state.cinq_service.list_establishments(auth.tenant_id).await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(ests.into_iter().map(serde_json::to_value).unwrap().collect()))
}
```
*Add routes:* `.route("/establishments", post(create_establishment).get(list_establishments))`

- [ ] **Step 3: Run check & Commit**

Run: `cargo check --workspace`
Expected: PASS

```bash
git add crates/ataqu-application/src/cinq_service.rs crates/ataqu-api/src/handlers/cinq.rs
git commit -m "feat(api): implement establishment endpoints"
```
