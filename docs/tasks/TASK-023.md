# TASK-023: Repo + Migration: DIAL

## Execution Boundaries
 - `crates/ataqu-infra-migration/src/m_dial.rs`
- `crates/ataqu-infra-repositories/src/dial_repo.rs`

## Step-by-Step Implementation Details
 1. Create migrations: `dial.channels`, `dial.messages` with RLS.
2. Implement `DialMessageRepository` using `transactional_batch_insert` for messages.
3. Implement `InMemoryPresenceStore` using `DashMap`. It must track `ConnectionId` internally but expose only `TenantId`/`UserId` via the trait (ADR-028).

## Success Criteria & Verification
 - [ ] Messages batch insert safely.
- [ ] Presence store maps internal IDs without leaking to domain.
