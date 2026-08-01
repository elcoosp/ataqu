# TASK-030: Repo + Migration: VISTA

## Execution Boundaries (STRICT)
 crates/ataqu-infra-migration/src/m_vista.rs\n- crates/ataqu-infra-repositories/src/vista_repo.rs

## Step-by-Step Implementation Details
 1. Create migrations: `vista.aggregations` table with stateful cursor tracking.\n2. Implement `VistaRepository`.\n3. Implement polling logic: `SELECT * FROM core.outbox WHERE vista_consumed_at IS NULL AND status = 'completed' FOR UPDATE SKIP LOCKED`.\n4. Update `vista_consumed_at` on processing. Move to DLQ on failure.

## Success Criteria & Verification
 - [ ] Repo polls outbox using `SKIP LOCKED`.\n- [ ] Cursor updates correctly without payload modification.
