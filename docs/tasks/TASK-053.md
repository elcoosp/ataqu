# TASK-053: API Handler: DIAL

## Execution Boundaries
 - `crates/ataqu-api/src/handlers/dial.rs`\n- `crates/ataqu-application/src/dial_service.rs` (READ-ONLY)

## Step-by-Step Implementation Details
 1. Implement Axum handlers for channels, messages, threads, file uploads, search.\n2. Implement WebSocket upgrade endpoint. On connect, register with `DialService` presence.\n3. Extract `Idempotency-Key`.

## Success Criteria & Verification
 - [ ] WebSocket upgrade executes without hanging.\n- [ ] File upload generates presigned URL.
