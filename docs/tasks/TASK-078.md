# TASK-078: System Health & Observability

## Objective
Implement a native `/api/v1/health/status` endpoint that aggregates outbox lag, pending events, and DB pool usage into a single JSON payload, cached for 5 seconds.

## Execution Boundaries
- `crates/ataqu-infra-repositories/src/health_repo.rs` (overwrite)
- `crates/ataqu-application/src/health_service.rs` (overwrite)
- `crates/ataqu-api/src/handlers/health.rs` (overwrite)
- `crates/ataqu-bin/src/main.rs` (modify)

## Step-by-Step Implementation Details

1. **Implement `HealthRepository`**
   In `ataqu-infra-repositories/src/health_repo.rs`, provide `get_outbox_lag_seconds()` and `get_pending_outbox_count()` using raw SQL.

2. **Implement `HealthService`**
   In `ataqu-application/src/health_service.rs`, provide `get_system_health()` that returns a structured `SystemHealth` struct with status, timestamp, and components.

3. **Implement API handler**
   In `ataqu-api/src/handlers/health.rs`, add `GET /api/v1/health/status` that uses a Moka cache (5s TTL) and returns the JSON.

4. **Replace stubs in `main.rs`**
   Instantiate the repository and service, wire the cache, and add to `AppState`.

## Success Criteria & Verification
- [ ] Health repository queries the outbox correctly.
- [ ] Health service aggregates metrics and returns a valid payload.
- [ ] API endpoint returns cached responses and updates every 5 seconds.
- [ ] `cargo check --workspace` passes.
