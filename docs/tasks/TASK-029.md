# TASK-029: Repo + Migration: PAUSE

## Execution Boundaries (STRICT)
 crates/ataqu-infra-migration/src/m_pause.rs\n- crates/ataqu-infra-repositories/src/pause_repo.rs

## Step-by-Step Implementation Details
 1. Create migrations: `collab_ops.employees`, `collab_ops.leave_requests` with RLS.\n2. Implement `PauseRepository`.\n3. Ensure employee creation appends `EmployeeCreatedV1` to `core.outbox` in the same transaction.

## Success Criteria & Verification
 - [ ] Repo implements trait.\n- [ ] Outbox append occurs in same SeaORM transaction.
