# TASK-005: ataqu-contracts: DIAL & VAULT Events

## Execution Boundaries (STRICT)
 crates/ataqu-contracts/src/dial.rs\n- crates/ataqu-contracts/src/vault.rs

## Step-by-Step Implementation Details
 1. Define Commands and Events for DIAL (CreateChannel, SendMessage, MessageSent).\n2. Define Commands and Events for VAULT (CreateProduct, UpdateStock, StockAdjusted).\n3. All structs must derive `Serialize`, `Deserialize`, `Clone`, `Debug`.

## Success Criteria & Verification
 - [ ] Events and Commands compile.
