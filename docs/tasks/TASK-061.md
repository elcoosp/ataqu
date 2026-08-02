# TASK-061: Binary: Tokio Runtime & Host Routing

## Execution Boundaries
 - `crates/ataqu-bin/src/main.rs`\n- `crates/ataqu-bin/src/routes.rs`

## Step-by-Step Implementation Details
 1. Initialize Tokio multi-threaded runtime.\n2. Initialize `Pools` and all Application Services.\n3. Setup Axum router with Host-based routing (e.g., `crm.ataqu.com` -> CINQ handlers).\n4. Serve static SPA files from `apps/*/dist` via `tower_http::services::ServeDir`.\n5. Listen on port 443.

## Success Criteria & Verification
 - [ ] Binary compiles and starts.\n- [ ] Host-based routing successfully directs traffic to the correct app handlers.
