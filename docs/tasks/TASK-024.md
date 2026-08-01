# TASK-024: Repo + Migration: PIVOT

## Execution Boundaries (STRICT)
 crates/ataqu-infra-migration/src/m_pivot.rs\n- crates/ataqu-infra-repositories/src/pivot_repo.rs

## Step-by-Step Implementation Details
 1. Create migrations: `collab_ops.documents`, `collab_ops.databases` with `tsvector` generated column and GIN index (ADR-009).\n2. Implement `PivotRepository` using SeaORM.\n3. Implement raw SQL escape hatch for tsvector search if needed.

## Success Criteria & Verification
 - [ ] Migration includes GIN index on tsvector.\n- [ ] Search queries use the index.
