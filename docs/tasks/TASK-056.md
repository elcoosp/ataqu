# TASK-056: API Handler: TEMPO

## Execution Boundaries
 - `crates/ataqu-api/src/handlers/tempo.rs`\n- `crates/ataqu-application/src/tempo_service.rs` (READ-ONLY)

## Step-by-Step Implementation Details
 1. Implement Axum handlers for bookings, availability, calendars, no-show detection.\n2. Extract `Idempotency-Key`.

## Success Criteria & Verification
 - [ ] Routes are defined.
