# TASK-004: ataqu-contracts: AEGIS & CINQ Events

## Execution Boundaries
 - `crates/ataqu-contracts/src/aegis.rs`
- `crates/ataqu-contracts/src/cinq.rs`

## Step-by-Step Implementation Details
 1. Define Commands and Events for AEGIS (CreateUser, UserCreated, Authenticate, MfaSetup).
2. Define Commands and Events for CINQ (CreateContact, ContactCreated, UpdateDeal, DealUpdated).
3. All structs must derive `Serialize`, `Deserialize`, `Clone`, `Debug`.
4. Add them to `crates/ataqu-contracts/src/lib.rs`.

## Success Criteria & Verification
 - [ ] Events and Commands compile.
- [ ] No external dependencies required besides serde.
