# TASK-022: Repo + Migration: CINQ

## Execution Boundaries
 - `crates/ataqu-infra-migration/src/m_cinq.rs`
- `crates/ataqu-infra-repositories/src/cinq_contact_repo.rs`
- `crates/ataqu-infra-repositories/src/cinq_deal_repo.rs`

## Step-by-Step Implementation Details
 1. Create migrations: `collab_crm.contacts` and `collab_crm.deals` with JSONB `custom_fields`.
2. Implement JSONB 3-tier query (ADR-030): exact match (`@>`), single-field (`->> ILIKE`), cross-field (`jsonb_each_text` with rate limit guard).
3. Implement Email Tracking Writer with bounded channel and atomic JSONL spill (nanos+uuid, process exactly once, ADR-031).
4. Use `transactional_batch_insert` for CSV import.

## Success Criteria & Verification
 - [ ] JSONB Tier 3 returns 429 when rate limit exceeded.
- [ ] JSONL spill creates non-overwriting files and recovers exactly once.
- [ ] CSV import uses generic helper.
