# TASK-024: Repo + Migration: PIVOT

## Execution Boundaries
 - `crates/ataqu-infra-migration/src/m_pivot.rs`
- `crates/ataqu-infra-repositories/src/pivot_repo.rs`

## Step-by-Step Implementation Details
 1. Create migrations: `collab_ops.documents`, `collab_ops.databases` with `tsvector` generated column and GIN index (ADR-009).
2. Implement `PivotRepository` using SeaORM.
3. Implement raw SQL escape hatch for tsvector search if needed.

## Success Criteria & Verification
 - [ ] Migration includes GIN index on tsvector.
- [ ] Search queries use the index.
