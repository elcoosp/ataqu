# TASK-052: API Handler: CINQ

## Execution Boundaries
 - `crates/ataqu-api/src/handlers/cinq.rs`\n- `crates/ataqu-application/src/cinq_service.rs` (READ-ONLY)

## Step-by-Step Implementation Details
 1. Implement Axum handlers for contacts, deals, pipeline, activities, search, CSV import/export, email tracking.\n2. Extract `Idempotency-Key`.\n3. Map errors to HTTP codes.

## Success Criteria & Verification
 - [ ] All routes are defined.\n- [ ] CSV import handles multipart/form-data.
