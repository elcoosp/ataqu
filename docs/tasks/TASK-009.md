# TASK-009: ataqu-infra-outbox: Dispatcher

## Execution Boundaries (STRICT)
 crates/ataqu-infra-outbox/src/*

## Step-by-Step Implementation Details
 1. Implement `OutboxDispatcher` using `sqlx::PgListener` on channel `outbox_event`.\n2. On notification, execute static SQL: `SELECT * FROM core.outbox WHERE status = 'pending' ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 100`.\n3. Process events. Update `status = 'completed'` or `status = 'dlq'` (after 5 attempts).\n4. Only update tracking columns, NEVER payload (ADR-002).

## Success Criteria & Verification
 - [ ] Uses `PgListener` on dedicated sqlx pool.\n- [ ] Polls with `FOR UPDATE SKIP LOCKED`.\n- [ ] DLQ triggers after 5 attempts.
