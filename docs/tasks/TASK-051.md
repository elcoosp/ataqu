# TASK-051: API Handler: AEGIS

## Execution Boundaries
 - `crates/ataqu-api/src/handlers/aegis.rs`\n- `crates/ataqu-application/src/aegis_service.rs` (READ-ONLY)

## Step-by-Step Implementation Details
 1. Implement Axum handlers: `login`, `sso_callback`, `mfa_setup`, `token_refresh`.\n2. Extract `Idempotency-Key` header and pass to service.\n3. Use `ApiEmail` wrapper for serializing PII in responses (ADR-007).\n4. Map service errors to HTTP status codes (503 for transient, 409 for validation).

## Success Criteria & Verification
 - [ ] Routes parse Idempotency-Key.\n- [ ] PII is serialized via ApiEmail wrapper.\n- [ ] Error responses follow ADR-006.
