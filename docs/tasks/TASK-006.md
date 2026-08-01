# TASK-006: ataqu-infra-migration: Core Schema & Outbox

## Execution Boundaries (STRICT)
 crates/ataqu-infra-migration/src/m20250101_000001_core.rs

## Step-by-Step Implementation Details
 1. Create `app_schema` ENUM ('core', 'collab_crm', 'collab_ops', 'vault', 'dial', 'vista').\n2. Create `core.outbox` table: id (BIGSERIAL), schema (app_schema), event_type (TEXT), payload (JSONB), status (TEXT default 'pending'), attempts (INT), locked_until, vista_consumed_at, created_at, completed_at.\n3. Create `core.idempotency_records` table: command_id (UUID PK), status, response_body (JSONB).\n4. Enable RLS on `core.outbox`. Create policies restricting INSERT by schema role.\n5. Grant USAGE on `core.outbox_id_seq` to all domain roles.\n6. Grant column-level UPDATE (status, attempts, locked_until) to `dispatcher_role`.

## Success Criteria & Verification
 - [ ] Migration runs successfully against Postgres 18.4.\n- [ ] RLS policies exist and prevent cross-schema inserts.\n- [ ] Sequence grants allow domain roles to insert.
