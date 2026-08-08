# Plan 0: Scaffolding for Parallel Execution

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pre-wire all shared files (migrations, lib.rs, AppState, main.rs) so that Plans 1-10 can be executed in parallel without git conflicts.

**Architecture:** Add empty stubs, module declarations, and placeholder AppState fields. This is a setup task; no business logic is implemented here.

**Tech Stack:** Rust, SeaORM, Axum.

---

### Task 1: Register All Migrations

**Files:**
- Create: `crates/ataqu-infra-migration/src/m20250101_000011_create_audit_and_permissions.rs` (Empty stub)
- Create: `crates/ataqu-infra-migration/src/m20250101_000012_create_vista_views.rs` (Empty stub)
- Create: `crates/ataqu-infra-migration/src/m20250101_000013_create_shopify_integrations.rs` (Empty stub)
- Create: `crates/ataqu-infra-migration/src/m20250101_000014_create_onboarding_and_changelog.rs` (Empty stub)
- Create: `crates/ataqu-infra-migration/src/m20250101_000015_create_establishments.rs` (Empty stub)
- Create: `crates/ataqu-infra-migration/src/m20250101_000016_create_workflow_runs.rs` (Empty stub)
- Modify: `crates/ataqu-infra-migration/src/lib.rs`

- [ ] **Step 1: Create empty migration stubs**

For each file above, create it with the standard SeaORM migration boilerplate but with empty `up` and `down` bodies:

```rust
// Example for m20250101_000011_create_audit_and_permissions.rs
use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20250101_000011_create_audit_and_permissions"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, _manager: &SchemaManager) -> Result<(), DbErr> {
        Ok(())
    }

    async fn down(&self, _manager: &SchemaManager) -> Result<(), DbErr> {
        Ok(())
    }
}
```

- [ ] **Step 2: Register all migrations in lib.rs**

```rust
// crates/ataqu-infra-migration/src/lib.rs
// Add all new migrations to the vec![]
mod m20250101_000011_create_audit_and_permissions;
mod m20250101_000012_create_vista_views;
mod m20250101_000013_create_shopify_integrations;
mod m20250101_000014_create_onboarding_and_changelog;
mod m20250101_000015_create_establishments;
mod m20250101_000016_create_workflow_runs;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            // ... existing migrations ...
            Box::new(m20250101_000011_create_audit_and_permissions::Migration),
            Box::new(m20250101_000012_create_vista_views::Migration),
            Box::new(m20250101_000013_create_shopify_integrations::Migration),
            Box::new(m20250101_000014_create_onboarding_and_changelog::Migration),
            Box::new(m20250101_000015_create_establishments::Migration),
            Box::new(m20250101_000016_create_workflow_runs::Migration),
        ]
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add crates/ataqu-infra-migration/
git commit -m "chore(db): scaffold all migration stubs"
```

---

### Task 2: Add Module Declarations

**Files:**
- Modify: `crates/ataqu-infra-repositories/src/lib.rs`
- Modify: `crates/ataqu-application/src/lib.rs`
- Modify: `crates/ataqu-api/src/handlers/mod.rs`
- Modify: `crates/ataqu-domain-cinq/src/lib.rs`
- Modify: `crates/ataqu-domain-vault/src/lib.rs`

- [ ] **Step 1: Add `pub mod` to all lib.rs files**

```rust
// crates/ataqu-infra-repositories/src/lib.rs
pub mod health_repo;
pub mod audit_repo;

// crates/ataqu-application/src/lib.rs
pub mod health_service;
pub mod shopify_service;
pub mod onboarding_service;
pub mod changelog_service;

// crates/ataqu-api/src/handlers/mod.rs
pub mod health;
pub mod onboarding;
pub mod changelog;

// crates/ataqu-domain-cinq/src/lib.rs
pub mod establishment;

// crates/ataqu-domain-vault/src/lib.rs
pub mod shopify;
```

- [ ] **Step 2: Create empty files for the new modules**

Run `touch` for all the new files declared above so the workspace compiles.

- [ ] **Step 3: Commit**

```bash
git add crates/ataqu-infra-repositories/src/lib.rs crates/ataqu-application/src/lib.rs crates/ataqu-api/src/handlers/mod.rs crates/ataqu-domain-cinq/src/lib.rs crates/ataqu-domain-vault/src/lib.rs
# Add the empty files too
git commit -m "chore: scaffold module declarations"
```

---

### Task 3: Scaffold AppState and Main Wiring

**Files:**
- Modify: `crates/ataqu-api/src/lib.rs`
- Modify: `crates/ataqu-bin/src/main.rs`

- [ ] **Step 1: Add placeholder fields to AppState**

```rust
// crates/ataqu-api/src/lib.rs
#[derive(Clone)]
pub struct AppState {
    // ... existing fields ...
    pub health_service: Arc<ataqu_application::health_service::HealthService>,
    pub health_cache: Arc<moka::sync::Cache<String, serde_json::Value>>,
    pub audit_repo: Arc<dyn ataqu_domain_aegis::repository::AuditRepositoryTrait + Send + Sync>,
    pub s3_service: Arc<ataqu_infra_storage::s3_service::S3Service>,
    pub idempotency_guard: Arc<dyn ataqu_application::pause_service::IdempotencyPort + Send + Sync>,
    pub onboarding_service: Arc<ataqu_application::onboarding_service::OnboardingService>,
    pub changelog_service: Arc<ataqu_application::changelog_service::ChangelogService>,
}
```

- [ ] **Step 2: Add placeholder initialization in main.rs**

```rust
// crates/ataqu-bin/src/main.rs
// Inside main(), before AppState initialization:

// Health Stubs
let health_service = Arc::new(ataqu_application::health_service::HealthService::new(/* todo!() */));
let health_cache = Arc::new(moka::sync::Cache::builder().build());

// Audit Stub
let audit_repo: Arc<dyn ataqu_domain_aegis::repository::AuditRepositoryTrait + Send + Sync> = Arc::new(/* todo!() */);

// S3 Stub
let s3_service = Arc::new(ataqu_infra_storage::s3_service::S3Service::new("".to_string()).await);

// Idempotency Stub
let idempotency_guard = pause_idempotency.clone();

// Onboarding & Changelog Stubs
let onboarding_service = Arc::new(ataqu_application::onboarding_service::OnboardingService::new(pools.core.clone()));
let changelog_service = Arc::new(ataqu_application::changelog_service::ChangelogService::new(pools.core.clone()));

// Update AppState initialization to include these stubs
let state = AppState {
    // ... existing fields ...
    health_service,
    health_cache,
    audit_repo,
    s3_service,
    idempotency_guard,
    onboarding_service,
    changelog_service,
};
```

*Note: The workspace will NOT compile at this stage due to `todo!()` and missing trait implementations. That is expected for scaffolding.*

- [ ] **Step 3: Commit**

```bash
git add crates/ataqu-api/src/lib.rs crates/ataqu-bin/src/main.rs
git commit -m "chore(api/bin): scaffold AppState and main.rs placeholders"
```
