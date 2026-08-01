# TASK-042: App Service: CINQ (CRM Orchestration)

## Execution Boundaries
 - `crates/ataqu-application/src/cinq_service.rs`\n- `crates/ataqu-domain-cinq/src/*` (READ-ONLY)\n- `crates/ataqu-infra-repositories/src/cinq_*.rs` (READ-ONLY)

## Step-by-Step Implementation Details
 1. Implement `CinqService` orchestrating contacts, deals, and CSV import.\n2. For CSV import: call pure domain validation -> delegate to `transactional_batch_insert` via repo -> map `BatchResult` to HTTP response (200 with DLQ payloads).\n3. Implement Email Tracking dispatch (bounded channel).\n4. Consume PAUSE `EmployeeCreatedV1` projection events to auto-create CINQ contacts.\n5. Follow strict idempotency flow (ADR-017).

## Success Criteria & Verification
 - [ ] CSV import returns successfully processed rows and failed rows.\n- [ ] Cross-domain projection consumer is implemented.\n- [ ] Idempotency flow is strictly followed.
