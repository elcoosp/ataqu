# TASK-064: Admin: UDS CLI

## Execution Boundaries
 - `crates/ataqu-admin/src/*`

## Step-by-Step Implementation Details
 1. Implement CLI binary using `clap`.\n2. Connect to server via Unix Domain Socket (UDS) with `0600` permissions (ADR-008).\n3. Commands: tenant management, GDPR deletion trigger, diagnostics.\n4. Every command writes an audit event to `core.audit_logs` before executing.

## Success Criteria & Verification
 - [ ] CLI connects via UDS.\n- [ ] Audit events are written transactionally.
