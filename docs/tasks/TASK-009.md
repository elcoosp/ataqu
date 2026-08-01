# TASK-009: ataqu-infra-outbox: Dispatcher

## Execution Boundaries
 - `crates/ataqu-infra-outbox/src/*`

## Step-by-Step Implementation Details
 1. Implement `OutboxDispatcher` using `sqlx::PgListener` on channel `outbox_event`.
2. On notification, execute static SQL: `SELECT * FROM core.outbox WHERE status = 'pending' ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 100`.
3. Process events. Update `status = 'completed'` or `status = 'dlq'` (after 5 attempts).
4. Only update tracking columns, NEVER payload (ADR-002).

## Success Criteria & Verification
 - [ ] Uses `PgListener` on dedicated sqlx pool.
- [ ] Polls with `FOR UPDATE SKIP LOCKED`.
- [ ] DLQ triggers after 5 attempts.
