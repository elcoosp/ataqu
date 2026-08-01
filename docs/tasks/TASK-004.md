# TASK-004: ataqu-contracts: AEGIS & CINQ Events

## Execution Boundaries (STRICT)
 crates/ataqu-contracts/src/aegis.rs\n- crates/ataqu-contracts/src/cinq.rs

## Step-by-Step Implementation Details
 1. Define Commands and Events for AEGIS (CreateUser, UserCreated, Authenticate, MfaSetup).\n2. Define Commands and Events for CINQ (CreateContact, ContactCreated, UpdateDeal, DealUpdated).\n3. All structs must derive `Serialize`, `Deserialize`, `Clone`, `Debug`.\n4. Add them to `crates/ataqu-contracts/src/lib.rs`.

## Success Criteria & Verification
 - [ ] Events and Commands compile.\n- [ ] No external dependencies required besides serde.
