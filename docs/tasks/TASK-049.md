# TASK-049: App Service: PAUSE (HR Orchestration)

## Execution Boundaries
 - `crates/ataqu-application/src/pause_service.rs`\n- `crates/ataqu-domain-pause/src/*` (READ-ONLY)\n- `crates/ataqu-infra-repositories/src/pause_*.rs` (READ-ONLY)

## Step-by-Step Implementation Details
 1. Implement `PauseService` for employee onboarding and leave requests.\n2. Emit `EmployeeCreatedV1` to outbox for CINQ projection.\n3. Follow strict idempotency flow (ADR-017).

## Success Criteria & Verification
 - [ ] Employee creation emits outbox event.\n- [ ] Idempotency flow is strictly followed.
