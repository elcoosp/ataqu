# TASK-054: API Handler: PIVOT

## Execution Boundaries
 - `crates/ataqu-api/src/handlers/pivot.rs`\n- `crates/ataqu-application/src/pivot_service.rs` (READ-ONLY)

## Step-by-Step Implementation Details
 1. Implement Axum handlers for docs, databases, search, relations.\n2. Extract `Idempotency-Key`.

## Success Criteria & Verification
 - [ ] Routes are defined and call service correctly.
