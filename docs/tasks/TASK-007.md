# TASK-007: ataqu-infra-pools: Connection Setup

## Execution Boundaries
 - `crates/ataqu-infra-pools/src/*`

## Step-by-Step Implementation Details
 1. Create a `Pools` struct holding 6 `sea_orm::DatabaseConnection` (max 5 conns each), 1 `sqlx::PgPool` (max 3 conns), 1 admin `sea_orm::DatabaseConnection` (max 2 conns).
2. Implement a `new(database_url: &str)` constructor that initializes all pools with their respective roles.
3. Total connections must equal 35 (ADR-018).

## Success Criteria & Verification
 - [ ] `Pools::new()` connects to DB without exceeding 35 connections.
- [ ] Each pool uses the correct DB role.
