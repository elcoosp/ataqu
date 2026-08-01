# TASK-045: App Service: SPARK (Automation Orchestration)

## Execution Boundaries
 - `crates/ataqu-application/src/spark_service.rs`\n- `crates/ataqu-domain-spark/src/*` (READ-ONLY)\n- `crates/ataqu-infra-repositories/src/spark_*.rs` (READ-ONLY)

## Step-by-Step Implementation Details
 1. Implement `SparkService` for workflow execution.\n2. Acquire fenced leases (atomic UPDATE fence_token = fence_token + 1).\n3. Dispatch actions by appending events to `core.outbox`.\n4. Follow strict idempotency flow (ADR-017).

## Success Criteria & Verification
 - [ ] Fenced lease is acquired in the same transaction.\n- [ ] Actions are dispatched via outbox.
