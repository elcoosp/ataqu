# TASK-048: App Service: VAULT (Inventory Orchestration)

## Execution Boundaries
 - `crates/ataqu-application/src/vault_service.rs`\n- `crates/ataqu-domain-vault/src/*` (READ-ONLY)\n- `crates/ataqu-infra-repositories/src/vault_*.rs` (READ-ONLY)

## Step-by-Step Implementation Details
 1. Implement `VaultService` for stock updates.\n2. Execute atomic stock updates (UPDATE ... SET stock = stock - 1 WHERE stock >= 1).\n3. Emit low-stock alerts via outbox.\n4. Follow strict idempotency flow (ADR-017).

## Success Criteria & Verification
 - [ ] Stock updates are atomic.\n- [ ] Low-stock alerts are emitted.
