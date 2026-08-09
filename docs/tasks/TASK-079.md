# TASK-079: VAULT Shopify Sync

## Objective
Implement a background worker that bi‑directionally syncs VAULT products and inventory levels with a connected Shopify store every 5 minutes.

## Execution Boundaries
- `crates/ataqu-infra-migration/src/m20250101_000013_create_shopify_integrations.rs` (overwrite)
- `crates/ataqu-domain-vault/src/shopify.rs` (overwrite)
- `crates/ataqu-application/src/shopify_service.rs` (overwrite)
- `crates/ataqu-bin/src/main.rs` (modify)

## Step-by-Step Implementation Details

1. **Create migration** for `vault.shopify_integrations` (id, tenant_id, shop_domain, access_token, last_synced_at, created_at).

2. **Define domain entity** `ShopifyIntegration` and `ShopifyRepository` trait with `list_active_integrations` and `update_last_synced`.

3. **Implement `ShopifyService`** with `sync_tenant_inventory` that fetches products from Shopify API and updates VAULT.

4. **Add background worker in `main.rs`** that runs every 5 minutes, fetches all active integrations, and calls `sync_tenant_inventory` for each.

## Success Criteria & Verification
- [ ] Migration creates the table.
- [ ] Domain entity and trait compile.
- [ ] Shopify service can fetch products and parse them.
- [ ] Background worker runs and processes integrations.
- [ ] `cargo check --workspace` passes.
