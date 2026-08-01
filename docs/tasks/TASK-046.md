# TASK-046: App Service: TEMPO (Scheduling Orchestration)

## Execution Boundaries
 - `crates/ataqu-application/src/tempo_service.rs`\n- `crates/ataqu-domain-tempo/src/*` (READ-ONLY)\n- `crates/ataqu-infra-repositories/src/tempo_*.rs` (READ-ONLY)

## Step-by-Step Implementation Details
 1. Implement `TempoService` for bookings and event types.\n2. Implement OAuth token refresh saga (ADR-025).\n3. Dispatch no-show detection tasks to `core.scheduled_tasks`.\n4. Follow strict idempotency flow (ADR-017).

## Success Criteria & Verification
 - [ ] OAuth refresh saga compiles.\n- [ ] No-show tasks are scheduled correctly.
