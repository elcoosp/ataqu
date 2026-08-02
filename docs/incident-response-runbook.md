# 🚨 ATAQU INCIDENT RESPONSE RUNBOOK — Version 2.3
### The "Calm Predator" Crisis Protocol (Phase 1 – PostgreSQL + SeaORM + Raw SQL)

> **Executive Note:** Systems fail. PostgreSQL will hiccup, the outbox relay will lag, and VPS nodes will crash. How a company responds to failure defines its brand. Ataqu’s brand promises "Radical Transparency" and "Engineering Competence." Therefore, we do not hide outages behind "degraded performance" PR speak. We acknowledge failures instantly, fix them with deterministic engineering precision, and publish the raw technical truth within 24 hours. Panic is bloat. This runbook ensures that at 3:00 AM, any engineer or on‑call founder knows exactly what to do without thinking.

---

## 1. INCIDENT SEVERITY MATRIX

Every alert triggered by our monitoring stack (Prometheus/Grafana/Sentry) is assigned a severity level. The severity dictates the response time, the communication protocol, and who gets paged.

### SEV-1: Critical (The System is Bleeding)
*   **Definition:** Complete outage of a core binary (`ataqu-server`) or primary database (PostgreSQL down, disk full). Data loss or silent data corruption is occurring. Auth (AEGIS) is down.
*   **Response Time:** Acknowledge alert in < 5 minutes. Start mitigation in < 15 minutes.
*   **Paging:** PagerDuty directly calls the On‑Call Engineer and the CTO.
*   **Examples:** PostgreSQL service down; WAL disk full; `wal-g` restore failure; VPS OOM killing the process; `email_tracking_recovery_failed_total` > 0 (P0).

### SEV-2: High (Major Degradation)
*   **Definition:** A core subsystem is failing, but the primary API is up. Users are heavily impacted, but no data loss is occurring.
*   **Response Time:** Acknowledge in < 15 minutes. Start mitigation in < 30 minutes.
*   **Paging:** PagerDuty pages the On‑Call Engineer (Slack + Push).
*   **Examples:** Outbox relay lag (>1000 events); FTS search timeouts; connection pool exhaustion; idempotency advisory lock timeouts; Moka cache approaching capacity; email tracking spill depth > 0 for 5 min; batch ingestion transient error aborts.

### SEV-3: Medium (Minor Degradation)
*   **Definition:** A non‑critical background process is failing, or a single tenant is experiencing isolated issues.
*   **Response Time:** Acknowledge in < 1 hour (during business hours).
*   **Paging:** Slack notification to `#eng-alerts` channel. No PagerDuty.
*   **Examples:** VISTA aggregation worker lagging; GDPR saga retry failure; SPARK heartbeat delays; `idempotency_records` partition count not increasing (partition creation task stuck).

---

## 2. ROLES & RESPONSIBILITIES

During a SEV‑1 or SEV‑2 incident, strict roles are assigned to prevent thrashing.

1.  **Incident Commander (IC):** Drives the response. Does *not* write code. Declares the incident open/closed, assigns roles, and dictates the external communication strategy. (Default: CTO or Lead Engineer).
2.  **Responder(s):** The engineers actively investigating logs, querying the database, and deploying fixes. They report only to the IC.
3.  **Scribe:** Updates the public Status Page (`status.ataqu.so`) and the internal incident Slack thread with timestamps. (Can be the IC if team is small).

---

## 3. THE 5‑PHASE RESPONSE LIFECYCLE

### Phase 1: Detection & Acknowledgment
*   **Trigger:** Alert fires.
*   **Action:** On‑Call Engineer acknowledges the alert in PagerDuty.
*   **Comms:** On‑Call posts in `#incidents` Slack channel: `[SEV-1] Acknowledged. Investigating [Brief Description].`
*   **Public:** If SEV‑1/SEV‑2, Scribe immediately updates `status.ataqu.so` to "Investigating" with a plain‑English description.

### Phase 2: Triage & Isolation
*   **Action:** Responder identifies the failing component. The primary goal is not a permanent fix, but *isolation* to stop the bleeding.
*   **Example:** If the database is locked by a long-running transaction, the Responder terminates the offending session to save the core API.

### Phase 3: Mitigation
*   **Action:** Apply the fix (e.g., increase VPS RAM, clear the DLQ, revert a bad deployment, restart PostgreSQL).
*   **Verification:** Responder confirms via Grafana dashboards that error rates have dropped and latency is back to baseline.

### Phase 4: Resolution
*   **Action:** IC declares the incident resolved.
*   **Comms:** Scribe updates `status.ataqu.so` to "Resolved."
*   **Cleanup:** Responder ensures all DLQs are drained and no orphaned processes remain.

### Phase 5: The Post‑Mortem (The Radical Transparency Mandate)
*   **Timeline:** Within 24 hours of resolution.
*   **Format:** A markdown document published to the Engineering Blog.
*   **Content:**
    1.  **Summary:** What happened, in 2 sentences.
    2.  **Impact:** How many users were affected, for how long.
    3.  **Root Cause:** The exact technical failure.
    4.  **Timeline:** UTC timestamps of detection, mitigation, and resolution.
    5.  **Action Items:** GitHub issues linked to specific PRs.

---

## 4. ARCHITECTURE‑SPECIFIC PLAYBOOKS

When an alert fires, the Responder uses these specific playbooks to diagnose and mitigate.

### Playbook A: AEGIS / Auth Fail‑Closed (503 Errors Globally)
**Symptom:** Global 503 Service Unavailable. Grafana shows AEGIS rejecting all requests.
**Root Cause:** `moka` cache is unavailable (OOM) or the `core` schema session table is locked by a long-running transaction.
**Mitigation Steps:**
1.  SSH into the VPS.
2.  Check `moka` cache memory usage.
3.  Check for long-running transactions: `SELECT pid, now() - xact_start AS duration, query FROM pg_stat_activity WHERE state = 'active' AND xact_start < now() - interval '30 seconds';`
4.  Terminate the offending session: `SELECT pg_terminate_backend(pid);`
5.  Restart the `ataqu-server` binary only if necessary: `systemctl restart ataqu-server`.
6.  *Do not* disable the fail‑closed mechanism under any circumstances.

### Playbook B: Outbox Relay Lag (`ataqu_outbox_notify_lag_seconds > 2s`)
**Symptom:** Cross‑app integrations (SPARK, CINQ -> DIAL) are delayed.
**Root Cause:** The `LISTEN/NOTIFY` dispatcher is not receiving notifications; the safety-net poll may be failing.
**Mitigation Steps:**
1.  Check if the `ataqu-server` binary is running: `systemctl status ataqu-server`.
2.  Look at logs: `journalctl -u ataqu-server -f | grep "outbox"`.
3.  Check the outbox table: `SELECT COUNT(*) FROM core.outbox WHERE status = 'pending' AND (locked_until IS NULL OR locked_until < NOW());`
4.  If the count is high, verify the index: `EXPLAIN ANALYZE SELECT id FROM core.outbox WHERE status = 'pending' ORDER BY id ASC LIMIT 100;` (Should use `idx_outbox_dispatch`).
5.  Check if PostgreSQL `LISTEN` connections are alive: `SELECT pid, application_name FROM pg_stat_activity WHERE application_name LIKE '%listener%';`
6.  If the dispatcher is stuck, restart the binary: `systemctl restart ataqu-server`.
7.  Monitor Grafana to ensure the lag total decreases.

### Playbook C: DLQ Backlog (`ataqu_dlq_poison_message_total > 0`)
**Symptom:** Events are being routed to the Dead Letter Queue.
**Root Cause:** A poison message is failing validation or exhausting 5 retries.
**Mitigation Steps:**
1.  Access the `ataqu-admin` CLI via SSH.
2.  List DLQ events: `ataqu-admin dlq list --limit 10`.
3.  Inspect the `last_error_message`, `last_error_backtrace`, and **`payload`** fields (full payload preserved via `T: Clone` in `transactional_batch_insert`).
4.  *If structural corruption:* Create a hotfix to stop producing the bad payload.
5.  *If transient:* Replay the event: `ataqu-admin dlq replay --id <event_id>`.
6.  Ensure `replay_count < 3` to avoid infinite loops.

### Playbook D: PostgreSQL Connection Pool Exhaustion (API Timeouts)
**Symptom:** API requests are timing out. Logs show `sea_orm::Error::Conn(ConnectionError::PoolTimedOut)`.
**Root Cause:** The domain pool (5 connections per schema) or dispatcher pool (3) is exhausted.
**Mitigation Steps:**
1.  Check active connections: `SELECT count(*) FROM pg_stat_activity WHERE application_name LIKE 'ataqu-%';`
2.  Identify long-running queries: `SELECT pid, now() - query_start AS duration, query FROM pg_stat_activity WHERE state = 'active' AND now() - query_start > interval '5 seconds';`
3.  Terminate offending queries: `SELECT pg_terminate_backend(pid);`
4.  If the pool is consistently full, check for connection leaks in the Rust code (ensure all `sea_orm::DatabaseTransaction` are committed or rolled back, and savepoints are released).
5.  Temporarily increase pool sizes in `ataqu-infra-pools` config and reload.
6.  If `max_connections=40` is consistently hit, investigate abnormal traffic patterns.

### Playbook E: Idempotency Advisory Lock Timeouts (`ataqu_idempotency_lock_timeout_total_total > 0`)
**Symptom:** Requests are failing with `503 Service Unavailable` + `Retry-After: 5` due to lock acquisition timeout.
**Root Cause:** A leader is holding the advisory lock for longer than 10 seconds. This could be due to a slow query, a long-running transaction, or a deadlock.
**Mitigation Steps:**
1.  Check the `pg_stat_activity` for sessions holding advisory locks: `SELECT pid, application_name, query, state FROM pg_stat_activity WHERE state != 'idle' AND query LIKE '%pg_advisory_xact_lock%';`
2.  If the leader transaction is stuck, terminate it: `SELECT pg_terminate_backend(pid);`
3.  Verify the `statement_timeout = '5s'` and `idempotency lock timeout = '10s'` are correctly set in the application. Check that the raw SQL uses explicit `::int4` casts: `SELECT pg_advisory_xact_lock($1::int4, $2::int4);`.
4.  If timeouts are frequent, check the domain logic for expensive operations inside the idempotency transaction. Offload non‑critical work to background sagas if possible.
5.  Monitor `ataqu_idempotency_cache_hit_ratio` — a low ratio indicates many first-time requests, which is normal; a sudden drop may indicate cache eviction issues.

### Playbook F: GDPR Deletion Saga Failure (`ataqu_gdpr_deletion_failed_total_total > 0`)
**Symptom:** A GDPR tenant deletion has stalled or failed after retries.
**Root Cause:** The saga encountered a permanent error (e.g., S3 permission issue, DB constraint violation).
**Mitigation Steps:**
1.  **Check the step:** Identify the failing step from the `step` label.
2.  **Inspect state:** Run `ataqu-admin gdpr status --tenant <tenant_id>`.
3.  **If S3 `NoSuchKey` error:** The saga treats this as success (idempotent). Ensure the failure isn't something else.
4.  **Retry manually:** Run `ataqu-admin gdpr retry --tenant <tenant_id>`.
5.  **If retry still fails:** Check the specific step's logs. If it's a transient DB lock, wait and retry. If it's a missing table in the compiled registry, update the registry and redeploy.
6.  **Escalate:** If manual intervention doesn't resolve, escalate to the CTO.

### Playbook G: Email Tracking Spill Depth (`ataqu_email_tracking_spill_depth > 0` for 5+ minutes)
**Symptom:** The `email_tracking_writer_task` is spilling to JSONL due to DB failures, and the recovery task is not draining.
**Root Cause:** The `collab_crm` database is unavailable, or the writer task is blocked.
**Mitigation Steps:**
1.  Check PostgreSQL health: `systemctl status postgresql`.
2.  Verify the `collab_crm` schema is accessible: `psql -d ataqu -c "SELECT 1 FROM collab_crm.email_tracking_events LIMIT 1;"`.
3.  Check the JSONL spill directory: `ls -la /var/lib/ataqu/spill/`.
4.  Look for `tracking_recovering_*.jsonl` files. These are being processed. If there are many, check `ataqu_email_tracking_recovery_failed_total`.
5.  If the spill file is growing, check `ataqu_email_tracking_spill_file_size_bytes` — if it exceeds 10 MB, events are being dropped (`ataqu_email_tracking_dropped_total` will increment).
6.  If the DB is healthy, the recovery task should drain the spill file. If not, restart the server.
7.  If `ataqu_email_tracking_recovery_failed_total` is > 0, investigate the recovery task logs. It may be failing on a specific bad event; manually repair or skip the event.

### Playbook H: No-Show Detection Hook Misses (`no_show_detected_total{reason="hook_missed"}` rate increase)
**Symptom:** Many no-shows are being detected via the fallback worker rather than the WebSocket hook.
**Root Cause:** The frontend `MeetingJoined` WebSocket event is not being sent.
**Mitigation Steps:**
1.  Check the frontend logs for WebSocket errors.
2.  Verify the WebSocket connection is stable.
3.  Check that the `MeetingJoined` event schema matches the backend expectation.
4.  If the issue persists, inspect the `tempo_bookings` table to verify the status is being updated correctly.

### Playbook I: Batch Ingestion Transient Errors (Chunk Failure)
**Symptom:** Batch ingestion fails with a transient error (network drop, DB timeout). The helper aborts the chunk immediately, preserving transaction state.
**Root Cause:** Network issue, temporary DB unavailability.
**Mitigation Steps:**
1.  Check logs for: `"Chunk insert failed, attempting classification"` with `error = ?e`.
2.  If the error is transient (not a unique/FK/check violation), the helper will return `Err(e)` after rolling back the savepoint. The transaction remains in a clean state.
3.  The caller can retry the entire operation (idempotency layer will prevent duplicate processing).
4.  If transient errors are frequent, investigate network stability and DB health.

---

### Playbook J: VPS Scaling / Resource Exhaustion (RAM / CPU)
**Symptom:** Memory usage > 90% OR CPU > 80% sustained for 5+ minutes. API latency increases, p95 > 500ms. OOM killer risk.
**Root Cause:** Tenant growth has exceeded current VPS capacity (8 GB RAM, 8 vCPUs).
**Mitigation Steps:**
1.  **Verify the trigger:** Check Grafana dashboard for `node_memory_MemAvailable_bytes` and `node_cpu_seconds_total`. Confirm that the system is genuinely overloaded (not a temporary spike).
2.  **Snapshot the VPS:** Hetzner snapshot (2 minutes) – ensures rollback capability.
3.  **Stop the VPS:** `systemctl poweroff` or via Hetzner console (1 minute).
4.  **Upgrade the VPS:** In Hetzner, change the server type to the next tier:
    - CX42 (8 GB) → CX52 (16 GB)
    - CX52 (16 GB) → CX62 (32 GB)
    - CX62 (32 GB) → CX72 (64 GB)
5.  **Start the VPS:** Boot the new instance (1 minute).
6.  **Adjust PostgreSQL parameters:** Connect via `psql` and run:
    ```sql
    ALTER SYSTEM SET shared_buffers = '<new_value>';
    ALTER SYSTEM SET work_mem = '<new_value>';
    ALTER SYSTEM SET effective_cache_size = '<new_value>';
    SELECT pg_reload_conf();
    ```
    (Refer to the scaling matrix in `docs/project.md` for exact values.)
7.  **Verify:** Check that the Rust binary restarted correctly and that PostgreSQL is accepting connections. Monitor metrics for 10 minutes to ensure load has dropped.
8.  **Document:** Update the infrastructure documentation with the new VPS type and PostgreSQL settings.
9.  **If the upgrade fails:** Restore from snapshot (rollback in < 15 minutes).

**Escalation:** If the upgrade is not sufficient or fails, escalate to the CTO to consider moving to a distributed architecture (Phase 2 – managed services).

---

## 5. THE PUBLIC COMMUNICATION PROTOCOL

Ataqu does not use corporate PR speak during outages. We state the truth.

| Timeframe | Standard SaaS Status Page | Ataqu Status Page |
|-----------|---------------------------|-------------------|
| **T+0 (Detection)** | "We are investigating reports of elevated latency." | "Investigating: API returning 503s. Connection pool exhausted. Long-running transaction detected." |
| **T+15 (Mitigation)** | "We have identified the issue and are applying a fix." | "Mitigating: Terminated long-running queries. Restarting `ataqu-server`. Monitoring pool usage." |
| **T+45 (Resolution)**| "The issue has been resolved. We apologize for the inconvenience." | "Resolved: Connection pool restored. RCA to follow within 24h." |
| **T+24h (Post‑Mortem)**| *(Silence)* | *[Engineering Blog Post] Root Cause Analysis: Why connection pooling failed and how we patched it.* |

---

### FINAL INCIDENT DIRECTIVE
When the pager goes off, the Calm Predator does not panic. You acknowledge, you isolate, you fix, and you document. If you make a mistake during mitigation that causes data loss, you report it truthfully in the RCA. We do not cover up engineering failures; we weaponize them as public proof that we hold ourselves to a higher standard than the SaaS oligopoly.
