# TASK-029: Repo + Migration: PAUSE

## Execution Boundaries
 - `crates/ataqu-infra-migration/src/m_pause.rs`
- `crates/ataqu-infra-repositories/src/pause_repo.rs`

## Step-by-Step Implementation Details
 1. Create migrations: `collab_ops.employees`, `collab_ops.leave_requests` with RLS.
2. Implement `PauseRepository`.
3. Ensure employee creation appends `EmployeeCreatedV1` to `core.outbox` in the same transaction.

## Success Criteria & Verification
 - [ ] Repo implements trait.
- [ ] Outbox append occurs in same SeaORM transaction.
