# TASK-071: Access Governance & Audit Log Implementation

## Objective
Implement a cross‑app permission matrix (`core.permissions`) and a unified audit log (`core.audit_logs`) that records all mutations across all 10 apps. Expose endpoints in AEGIS for viewing the matrix and logs, and inject an `AuditLogger` into application services.

## Execution Boundaries
- `crates/ataqu-infra-migration/src/m20250101_000011_create_audit_and_permissions.rs` (overwrite)
- `crates/ataqu-infra-repositories/src/audit_repo.rs` (overwrite)
- `crates/ataqu-domain-aegis/src/repository.rs` (modify)
- `crates/ataqu-application/src/aegis_service.rs` (modify)
- `crates/ataqu-api/src/handlers/aegis.rs` (modify)
- `crates/ataqu-bin/src/main.rs` (modify)

## Step-by-Step Implementation Details

1. **Implement the database migration**
   Create `core.permissions` and `core.audit_logs` (partitioned by month) with appropriate columns and indexes. Enable RLS if needed.

2. **Implement `AuditRepository`**
   In `ataqu-infra-repositories/src/audit_repo.rs`, provide `append_log` and `list_logs` methods using raw SQL or SeaORM.

3. **Add trait to AEGIS domain**
   Define `AuditRepositoryTrait` in `ataqu-domain-aegis/src/repository.rs`.

4. **Extend `AegisService`**
   Inject the audit repository and implement `get_audit_logs` and `get_permission_matrix`.

5. **Add API handlers**
   In `ataqu-api/src/handlers/aegis.rs`, add `GET /audit-log` and `GET /permission-matrix` routes (admin‑only).

6. **Replace stubs in `main.rs`**
   Instantiate the concrete `AuditRepository` and pass it via an adapter to `AegisService`.

## Success Criteria & Verification
- [ ] Migration creates the tables and partitions.
- [ ] `append_log` writes to the correct partition and returns `Ok`.
- [ ] `list_logs` returns paginated rows.
- [ ] Admin endpoints return correct data; non‑admins receive 403.
- [ ] `cargo check --workspace` passes.
