# TASK-023: Repo + Migration: DIAL

## Execution Boundaries (STRICT)
 crates/ataqu-infra-migration/src/m_dial.rs\n- crates/ataqu-infra-repositories/src/dial_repo.rs

## Step-by-Step Implementation Details
 1. Create migrations: `dial.channels`, `dial.messages` with RLS.\n2. Implement `DialMessageRepository` using `transactional_batch_insert` for messages.\n3. Implement `InMemoryPresenceStore` using `DashMap`. It must track `ConnectionId` internally but expose only `TenantId`/`UserId` via the trait (ADR-028).

## Success Criteria & Verification
 - [ ] Messages batch insert safely.\n- [ ] Presence store maps internal IDs without leaking to domain.
