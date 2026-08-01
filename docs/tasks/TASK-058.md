# TASK-058: API Handler: VAULT

## Execution Boundaries
 - `crates/ataqu-api/src/handlers/vault.rs`\n- `crates/ataqu-application/src/vault_service.rs` (READ-ONLY)

## Step-by-Step Implementation Details
 1. Implement Axum handlers for products, variants, stock, movements, alerts.\n2. Extract `Idempotency-Key`.

## Success Criteria & Verification
 - [ ] Routes are defined.
