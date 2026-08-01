# TASK-068: CI: Pipeline & Lints

## Execution Boundaries
 - `.github/workflows/ci.yml`\n- `scripts/lints/explain_query_plan.sh`\n- `scripts/lints/pii_lint.sh`

## Step-by-Step Implementation Details
 1. Setup GitHub Actions: `cargo fmt`, `cargo clippy -- -D warnings`, `cargo test`.\n2. `pnpm biome`, `pnpm tsc`, `pnpm test`.\n3. Implement `EXPLAIN QUERY PLAN` CI lint (fail on Seq Scan for tables > 10k rows).\n4. Implement PII lint (fail if `infra-pii-access` is enabled outside approved crates).\n5. Implement Entity Boundary lint (fail if `sea_orm::Model` appears in domain crates).

## Success Criteria & Verification
 - [ ] All quality gates pass on PR.\n- [ ] Custom lints execute correctly.
