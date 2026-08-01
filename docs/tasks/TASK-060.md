# TASK-060: API Handler: VISTA

## Execution Boundaries
 - `crates/ataqu-api/src/handlers/vista.rs`\n- `crates/ataqu-application/src/vista_service.rs` (READ-ONLY)

## Step-by-Step Implementation Details
 1. Implement Axum handlers for dashboards, KPIs, charts, filters, export.\n2. Implement SSE endpoint for real-time updates.\n3. Extract `Idempotency-Key`.

## Success Criteria & Verification
 - [ ] SSE endpoint streams correctly without buffering.
