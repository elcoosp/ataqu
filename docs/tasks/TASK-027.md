# TASK-027: Repo + Migration: SOND

## Execution Boundaries
 - `crates/ataqu-infra-migration/src/m_sond.rs`
- `crates/ataqu-infra-repositories/src/sond_repo.rs`

## Step-by-Step Implementation Details
 1. Create migrations: `collab_ops.forms`, `collab_ops.submissions` with RLS.
2. Implement `SondRepository`.
3. Use `transactional_batch_insert` for form submissions.

## Success Criteria & Verification
 - [ ] Submissions batch insert safely via helper.
