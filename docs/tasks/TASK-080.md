# TASK-080: VISTA Drill-Down & Cross-App Dashboards

## Objective
Allow users to click on a chart segment to view raw underlying data, and provide pre-aggregated cross-app dashboards (e.g., Revenue + Inventory).

## Execution Boundaries
- `crates/ataqu-infra-migration/src/m20250101_000012_create_vista_views.rs` (overwrite)
- `crates/ataqu-domain-vista/src/repository.rs` (modify)
- `crates/ataqu-infra-repositories/src/vista_repo_impl.rs` (modify)
- `crates/ataqu-application/src/vista_service.rs` (modify)
- `crates/ataqu-api/src/handlers/vista.rs` (modify)
- `crates/ataqu-bin/src/main.rs` (modify)

## Step-by-Step Implementation Details

1. **Create materialized views** for cross‑app dashboards (e.g., `vista.cross_app_revenue_inventory`) with a background refresher.

2. **Add repository methods** for drill‑down (`get_raw_data_points`) and cross‑app views (`get_cross_app_view`).

3. **Implement service methods** `get_drill_down_data` and `get_cross_app_dashboard`.

4. **Add API endpoints**:
   - `POST /api/v1/vista/drill-down` – returns raw data for a given metric/dimension.
   - `GET /api/v1/vista/cross-app` – returns combined view data.

5. **Add materialized view refresher worker** in `main.rs` that runs every 15 minutes.

## Success Criteria & Verification
- [ ] Migration creates materialized views.
- [ ] Repository methods return correct data.
- [ ] Service methods handle tenant isolation and validation.
- [ ] API endpoints return appropriate JSON.
- [ ] Worker refreshes views without errors.
- [ ] `cargo check --workspace` passes.
