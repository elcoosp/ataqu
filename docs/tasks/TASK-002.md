# TASK-002: ataqu-kernel: Core Types & Traits

## Execution Boundaries
 - `crates/ataqu-kernel/src/*`

## Step-by-Step Implementation Details
 1. Define `TenantId(Uuid)` with a private inner field and `as_uuid()` method (ADR-024).
2. Define `Identifiable` trait returning `Uuid`.
3. Define `IdGenerator` trait (Send+Sync) with `new_uuid_v7()`.
4. Define `Clock` trait (Send+Sync) with `now() -> SystemTime`.
5. Define `DomainError` and `RepositoryError` enums.

## Success Criteria & Verification
 - [ ] All types compile and are Send+Sync.
- [ ] TenantId field is private.
- [ ] Traits are defined exactly as specified.
