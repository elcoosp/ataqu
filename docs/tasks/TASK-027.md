# TASK-027: Repo + Migration: SOND

## Execution Boundaries (STRICT)
 crates/ataqu-infra-migration/src/m_sond.rs\n- crates/ataqu-infra-repositories/src/sond_repo.rs

## Step-by-Step Implementation Details
 1. Create migrations: `collab_ops.forms`, `collab_ops.submissions` with RLS.\n2. Implement `SondRepository`.\n3. Use `transactional_batch_insert` for form submissions.

## Success Criteria & Verification
 - [ ] Submissions batch insert safely via helper.
