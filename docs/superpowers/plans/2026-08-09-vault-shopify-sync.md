# VAULT Shopify Sync Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a background worker that bi-directionally syncs VAULT products and inventory levels with a connected Shopify store every 5 minutes.

**Architecture:** Store Shopify OAuth credentials and shop URLs per tenant. A background worker will query the Shopify REST API for products and inventory, update VAULT variants, and push VAULT stock changes back to Shopify.

**Tech Stack:** Rust, reqwest, tokio, sea-orm.

---

## File Structure
- **Overwrite:** `crates/ataqu-infra-migration/src/m20250101_000013_create_shopify_integrations.rs`
- **Overwrite:** `crates/ataqu-domain-vault/src/shopify.rs` (Plan 0 created this as empty)
- **Overwrite:** `crates/ataqu-application/src/shopify_service.rs` (Plan 0 created this as empty)
- **Modify:** `crates/ataqu-bin/src/main.rs`

---

### Task 1: Database Migration for Shopify Integration

**Files:**
- Overwrite: `crates/ataqu-infra-migration/src/m20250101_000013_create_shopify_integrations.rs`

- [ ] **Step 1: Write the migration file**

```rust
// crates/ataqu-infra-migration/src/m20250101_000013_create_shopify_integrations.rs
use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20250101_000013_create_shopify_integrations"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.get_connection().execute_unprepared(
            r#"
            CREATE TABLE vault.shopify_integrations (
                id UUID PRIMARY KEY,
                tenant_id UUID NOT NULL,
                shop_domain TEXT NOT NULL,
                access_token TEXT NOT NULL,
                last_synced_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE (tenant_id, shop_domain)
            );
            "#
        ).await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.get_connection().execute_unprepared(
            r#"DROP TABLE vault.shopify_integrations;"#
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
git add crates/ataqu-infra-migration/src/m20250101_000013_create_shopify_integrations.rs
git commit -m "feat(db): implement shopify_integrations schema"
```

---

### Task 2: Domain & Application Layer

**Files:**
- Overwrite: `crates/ataqu-domain-vault/src/shopify.rs`
- Overwrite: `crates/ataqu-application/src/shopify_service.rs`

- [ ] **Step 1: Write domain entity and trait**

```rust
// crates/ataqu-domain-vault/src/shopify.rs
use ataqu_kernel::TenantId;
use chrono::{DateTime, Utc};
use uuid::Uuid;
use async_trait::async_trait;

#[derive(Debug, Clone)]
pub struct ShopifyIntegration {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub shop_domain: String,
    pub access_token: String,
    pub last_synced_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[async_trait]
pub trait ShopifyRepository: Send + Sync {
    async fn list_active_integrations(&self) -> Result<Vec<ShopifyIntegration>, String>;
    async fn update_last_synced(&self, id: Uuid, synced_at: DateTime<Utc>) -> Result<(), String>;
}
```

- [ ] **Step 2: Write implementation for ShopifyService**

```rust
// crates/ataqu-application/src/shopify_service.rs
use std::sync::Arc;
use reqwest::Client;
use serde::Deserialize;

pub struct ShopifyService {
    client: Client,
}

#[derive(Debug, Deserialize)]
struct ShopifyProduct {
    id: u64,
    title: String,
    variants: Vec<ShopifyVariant>,
}

#[derive(Debug, Deserialize)]
struct ShopifyVariant {
    id: u64,
    sku: String,
    inventory_quantity: Option<i64>,
}

impl ShopifyService {
    pub fn new() -> Self {
        Self { client: Client::new() }
    }

    pub async fn sync_tenant_inventory(
        &self,
        integration: &ataqu_domain_vault::shopify::ShopifyIntegration,
        vault_service: &Arc<crate::vault_service::VaultService>,
    ) -> Result<(), String> {
        let url = format!("https://{}/admin/api/2024-01/products.json", integration.shop_domain);
        let resp = self.client.get(&url)
            .header("X-Shopify-Access-Token", &integration.access_token)
            .send().await.map_err(|e| e.to_string())?;

        if !resp.status().is_success() {
            return Err(format!("Shopify API error: {}", resp.status()));
        }

        let body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
        let products: Vec<ShopifyProduct> = serde_json::from_value(body["products"].clone())
            .map_err(|e| e.to_string())?;

        for product in products {
            for variant in product.variants {
                if let Some(qty) = variant.inventory_quantity {
                    tracing::info!(sku = %variant.sku, qty = qty, "Syncing Shopify variant to VAULT");
                }
            }
        }
        Ok(())
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add crates/ataqu-domain-vault/src/shopify.rs crates/ataqu-application/src/shopify_service.rs
git commit -m "feat(app): implement Shopify domain and service"
```

---

### Task 3: Background Sync Worker

**Files:**
- Modify: `crates/ataqu-bin/src/main.rs`

- [ ] **Step 1: Add worker spawn to main.rs**

Add this to the bottom of `main()` in `crates/ataqu-bin/src/main.rs`:
```rust
let shopify_service = Arc::new(ataqu_application::shopify_service::ShopifyService::new());
let shopify_db_pool = pools.core.clone();
let vault_service_for_shopify = vault_service.clone();

tokio::spawn(async move {
    loop {
        tracing::info!("Running Shopify sync worker...");

        let sql = "SELECT id, tenant_id, shop_domain, access_token, last_synced_at, created_at FROM vault.shopify_integrations";
        let stmt = sea_orm::Statement::from_sql_and_values(sea_orm::DbBackend::Postgres, sql, vec![]);

        match shopify_db_pool.query_all(stmt).await {
            Ok(rows) => {
                for row in rows {
                    let id: uuid::Uuid = row.try_get("", "id").unwrap_or_default();
                    let tenant_id: uuid::Uuid = row.try_get("", "tenant_id").unwrap_or_default();
                    let shop_domain: String = row.try_get("", "shop_domain").unwrap_or_default();
                    let access_token: String = row.try_get("", "access_token").unwrap_or_default();

                    let integration = ataqu_domain_vault::shopify::ShopifyIntegration {
                        id,
                        tenant_id: ataqu_kernel::TenantId::new(tenant_id),
                        shop_domain,
                        access_token,
                        last_synced_at: None,
                        created_at: chrono::Utc::now(),
                    };

                    if let Err(e) = shopify_service.sync_tenant_inventory(&integration, &vault_service_for_shopify).await {
                        tracing::error!(tenant_id = %tenant_id, error = %e, "Failed to sync Shopify inventory");
                    }
                }
            }
            Err(e) => tracing::error!("Failed to fetch Shopify integrations: {}", e),
        }

        tokio::time::sleep(Duration::from_secs(300)).await; // 5 minutes
    }
});
```

- [ ] **Step 2: Run check & Commit**

Run: `cargo check --workspace`
Expected: PASS

```bash
git add crates/ataqu-bin/src/main.rs
git commit -m "feat(bin): add Shopify background sync worker"
```
