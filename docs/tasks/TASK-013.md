# TASK-013: Domain: DIAL Pure Logic

## Execution Boundaries
 - `crates/ataqu-domain-dial/src/*`

## Step-by-Step Implementation Details
 1. Implement pure functions for channels, messages, threads, mentions.
2. Define `DialRepository` trait.
3. Define `PresenceStore` trait operating ONLY on `TenantId` and `UserId` (NO `ConnectionId`, ADR-028).

## Success Criteria & Verification
 - [ ] Functions compile.
- [ ] `PresenceStore` trait has zero infrastructure leaks.
