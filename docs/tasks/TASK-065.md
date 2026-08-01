# TASK-065: Tests: Backend Integration

## Execution Boundaries
 - `crates/ataqu-bin/tests/integration.rs`

## Step-by-Step Implementation Details
 1. Use `testcontainers` to spin up Postgres 18.4.\n2. Run migrations.\n3. Test critical flows: AEGIS login, CINQ CRUD, DIAL messaging, SPARK workflow, TEMPO booking, VISTA dashboard.\n4. Verify idempotency: send same request twice, ensure identical response.\n5. Verify RLS: attempt cross-tenant insert, expect failure.

## Success Criteria & Verification
 - [ ] All integration tests pass.\n- [ ] Testcontainers setup works seamlessly.
