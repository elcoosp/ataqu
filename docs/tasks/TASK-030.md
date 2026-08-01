# TASK-030: Repo + Migration: VISTA

## Execution Boundaries
 - `crates/ataqu-infra-migration/src/m_vista.rs`
- `crates/ataqu-infra-repositories/src/vista_repo.rs`

## Step-by-Step Implementation Details
 1. Create migrations: `vista.aggregations` table with stateful cursor tracking.
2. Implement `VistaRepository`.
3. Implement polling logic: `SELECT * FROM core.outbox WHERE vista_consumed_at IS NULL AND status = 'completed' FOR UPDATE SKIP LOCKED`.
4. Update `vista_consumed_at` on processing. Move to DLQ on failure.

## Success Criteria & Verification
 - [ ] Repo polls outbox using `SKIP LOCKED`.
- [ ] Cursor updates correctly without payload modification.
