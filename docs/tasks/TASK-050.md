# TASK-050: App Service: VISTA (Analytics Orchestration)

## Execution Boundaries
 - `crates/ataqu-application/src/vista_service.rs`\n- `crates/ataqu-domain-vista/src/*` (READ-ONLY)\n- `crates/ataqu-infra-repositories/src/vista_*.rs` (READ-ONLY)

## Step-by-Step Implementation Details
 1. Implement `VistaService` to process outbox events and update aggregation tables.\n2. Implement SSE streaming setup for real-time KPIs.\n3. Follow strict idempotency flow (ADR-017).

## Success Criteria & Verification
 - [ ] Aggregation updates are idempotent.\n- [ ] SSE stream setup compiles.
