# TASK-044: App Service: PIVOT (Docs Orchestration)

## Execution Boundaries
 - `crates/ataqu-application/src/pivot_service.rs`\n- `crates/ataqu-domain-pivot/src/*` (READ-ONLY)\n- `crates/ataqu-infra-repositories/src/pivot_*.rs` (READ-ONLY)

## Step-by-Step Implementation Details
 1. Implement `PivotService` for docs and databases.\n2. Orchestrate tsvector search execution via raw SQL escape hatch on the transaction.\n3. Follow strict idempotency flow (ADR-017).

## Success Criteria & Verification
 - [ ] Search queries execute without errors.\n- [ ] Idempotency flow is strictly followed.
