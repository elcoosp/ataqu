# TASK-026: Repo + Migration: TEMPO

## Execution Boundaries
 - `crates/ataqu-infra-migration/src/m_tempo.rs`
- `crates/ataqu-infra-repositories/src/tempo_repo.rs`

## Step-by-Step Implementation Details
 1. Create migrations: `collab_ops.bookings` with `ends_at TIMESTAMPTZ GENERATED ALWAYS AS (starts_at + duration) STORED`.
2. Implement `TempoRepository`.
3. Implement no-show detection query: `SELECT ... WHERE ends_at < NOW() - interval '24 hours'` (ADR-032).
4. Implement OAuth token storage.

## Success Criteria & Verification
 - [ ] `ends_at` is a stored generated column.
- [ ] No-show query is sargable and bounded.
