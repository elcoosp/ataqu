# TASK-062: Binary: Background Tasks Wiring

## Execution Boundaries
 - `crates/ataqu-bin/src/workers.rs`

## Step-by-Step Implementation Details
 1. Spawn background tasks using `tokio::task::JoinSet`.\n2. Include: OutboxDispatcher, VISTA Aggregator, cron_worker, no_show_worker, email_tracking_writer, s3_orphan_reaper.\n3. Implement health check endpoint `/health/ready` that monitors the `JoinSet` and returns 503 if any critical task dies.

## Success Criteria & Verification
 - [ ] All workers spawn and log heartbeat.\n- [ ] Health check fails if a worker panics.
