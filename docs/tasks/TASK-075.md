# TASK-075: Onboarding & Changelog Implementation

## Objective
Implement a persistent onboarding activation tracker (`core.onboarding_progress`) and a transparent in‑app changelog (`core.changelog`) with API endpoints.

## Execution Boundaries
- `crates/ataqu-infra-migration/src/m20250101_000014_create_onboarding_and_changelog.rs` (overwrite)
- `crates/ataqu-application/src/onboarding_service.rs` (overwrite)
- `crates/ataqu-application/src/changelog_service.rs` (overwrite)
- `crates/ataqu-api/src/handlers/onboarding.rs` (overwrite)
- `crates/ataqu-api/src/handlers/changelog.rs` (overwrite)
- `crates/ataqu-bin/src/main.rs` (modify)

## Step-by-Step Implementation Details

1. **Implement migration**
   Create `core.onboarding_progress` (tenant_id PK, tasks_completed JSONB, last_active_at) and `core.changelog` (id, version, date, title, description, category, breaking_change).

2. **Implement `OnboardingService`**
   Provide `get_status` and `complete_task`. Use raw SQL or SeaORM.

3. **Implement `ChangelogService`**
   Provide `list_entries(limit)` returning the most recent changelog entries.

4. **Implement API handlers**
   - `GET /onboarding/status` (authenticated)
   - `POST /onboarding/task-complete` (authenticated)
   - `GET /changelog` (public, no auth)

5. **Replace stubs in `main.rs`**
   Instantiate both services with the `core` database connection and inject into `AppState`.

## Success Criteria & Verification
- [ ] Migration creates tables.
- [ ] Onboarding status returns correct progress.
- [ ] Marking a task complete updates the record.
- [ ] Changelog endpoint returns the correct entries.
- [ ] `cargo check --workspace` passes.
