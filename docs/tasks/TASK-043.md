# TASK-043: App Service: DIAL (Chat Orchestration)

## Execution Boundaries
 - `crates/ataqu-application/src/dial_service.rs`\n- `crates/ataqu-domain-dial/src/*` (READ-ONLY)\n- `crates/ataqu-infra-repositories/src/dial_*.rs` (READ-ONLY)

## Step-by-Step Implementation Details
 1. Implement `DialService` for messaging and presence.\n2. Orchestrate message batch ingestion via `transactional_batch_insert`.\n3. Update `InMemoryPresenceStore` on user connect/disconnect.\n4. Follow strict idempotency flow (ADR-017).

## Success Criteria & Verification
 - [ ] Messages are persisted in batches.\n- [ ] Presence store is updated safely.\n- [ ] Idempotency flow is strictly followed.
