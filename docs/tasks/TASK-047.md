# TASK-047: App Service: SOND (Forms Orchestration)

## Execution Boundaries
 - `crates/ataqu-application/src/sond_service.rs`\n- `crates/ataqu-domain-sond/src/*` (READ-ONLY)\n- `crates/ataqu-infra-repositories/src/sond_*.rs` (READ-ONLY)

## Step-by-Step Implementation Details
 1. Implement `SondService` for form submissions.\n2. Use `transactional_batch_insert` for large form submissions.\n3. Trigger outbox events for SPARK (e.g., FormSubmitted).\n4. Follow strict idempotency flow (ADR-017).

## Success Criteria & Verification
 - [ ] Submissions batch insert safely.\n- [ ] Outbox events are appended.
