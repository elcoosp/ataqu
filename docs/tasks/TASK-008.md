# TASK-008: ataqu-infra-idempotency: Guard & Moka

## Execution Boundaries
 - `crates/ataqu-infra-idempotency/src/*`

## Step-by-Step Implementation Details
 1. Implement `IdempotencyGuard::acquire(txn, command_id)`.
2. Split UUID into two `i32` values. Execute `SELECT pg_advisory_xact_lock($1::int4, $2::int4)` with a 10s timeout (ADR-006).
3. On timeout, return 503 Service Unavailable.
4. Check `core.idempotency_records`. If completed, return cached response. If in_progress, delete and proceed.
5. Implement bounded `moka::Cache` (10k entries, 7-day TTL, 20MB weigher).

## Success Criteria & Verification
 - [ ] Lock SQL uses explicit `::int4` cast.
- [ ] 503 is returned on 10s timeout.
- [ ] Moka cache is bounded to 10,000 entries.
