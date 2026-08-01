# TASK-063: Domain: GDPR Saga & Registry

## Execution Boundaries
 - `crates/ataqu-domain-gdpr/src/*`

## Step-by-Step Implementation Details
 1. Implement compile-time table registry (macro or const array) for all tables with `tenant_id`.\n2. Implement GDPR deletion saga state machine.\n3. Sequentially delete tenant data from all schemas and S3 idempotently.\n4. Store `trace_id` in DB for observability.

## Success Criteria & Verification
 - [ ] CI test verifies 100% table coverage.\n- [ ] Saga executes sequentially and rolls back on failure.
