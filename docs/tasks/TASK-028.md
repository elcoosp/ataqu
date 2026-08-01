# TASK-028: Repo + Migration: VAULT

## Execution Boundaries
 - `crates/ataqu-infra-migration/src/m_vault.rs`
- `crates/ataqu-infra-repositories/src/vault_repo.rs`

## Step-by-Step Implementation Details
 1. Create migrations: `vault.products`, `vault.variants` with `CHECK (stock_quantity >= 0)` constraint (ADR-023).
2. Implement `InventoryRepository`.
3. Implement atomic stock updates: `UPDATE ... SET stock_quantity = stock_quantity - $1 WHERE id = $2 AND stock_quantity >= $1`.

## Success Criteria & Verification
 - [ ] DB constraint prevents negative stock.
- [ ] Atomic update prevents race conditions.
