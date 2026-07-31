# 🏗️ UNIO PROJECT — MASTER ARCHITECTURE & PROJECT SPECIFICATION (v53.0)

**Version:** 53.0 (Adaptive Resilience, Strict Boundary Contracts, Hardened Fail-Closed States, Compute-Isolated OLAP)
**Date:** 2026-12-10
**Author:** Unio Architecture Team
**Brand Domain:** `unio.so`

> **EXECUTIVE NOTE:** This document is the single, self-contained source of truth for the Unio project. 
> 
> **Architecture v53.0 Changes:** Following a second ruthless principal engineering review of v52.0, critical performance bottlenecks, frontend state deadlocks, and compute contention risks were eradicated. The architecture has been perfected for deterministic, high-throughput distributed systems execution:
> - **ClickHouse `ReplacingMergeTree` + Materialized Views:** The CPU-melting raw `MergeTree` + multi-column `argMax` anti-pattern has been eradicated. VISTA OLAP now strictly utilizes `ReplacingMergeTree(outbox_id)` with `AggregatingMergeTree` materialized views, guaranteeing O(1) CPU-complexity dashboard queries.
> - **Direct WebSocket Ingestion:** The ambiguous DIAL mTLS proxy bottleneck has been eradicated. Clients strictly publish DIAL messages directly over the authenticated WebSocket. Webhooks strictly write to Postgres, relying entirely on native `LISTEN/NOTIFY` for fan-out. Zero proxy hops.
> - **Tombstone-Aware Frontend Catch-Up:** The event queue deadlock on deleted documents has been eradicated. The frontend strictly differentiates between network failures (retry) and `410 Gone` tombstone responses (apply local deletion and resume queue).
> - **Explicit Direct Pools:** All Postgres `LISTEN/NOTIFY` pools strictly bypass Supavisor, explicitly documented in tech stack boundaries.
> - **Scoped Idempotency:** The global Redis fail-closed availability risk has been eradicated. Strict Redis `SET NX` fail-closed logic applies *exclusively* to requests explicitly bearing an `Idempotency-Key` header.
> - **Compute Isolation:** The 32GB VPS CPU contention risk has been eradicated. `systemd` strictly enforces `CPUQuota` to prioritize latency-sensitive API/WebSocket binaries over background data workers.
> - **Per-Domain DB Timeout Isolation:** The shared database CPU starvation risk has been eradicated. `statement_timeout` is strictly enforced per-domain to prevent cross-domain query contention.

---

## 📑 TABLE OF CONTENTS
1. [Executive Summary & Product Strategy](#1-executive-summary--product-strategy)
2. [System Architecture (The Multi-Binary Modular Monolith)](#2-system-architecture-the-multi-binary-modular-monolith)
3. [Core Architectural Decisions (ADRs)](#3-core-architectural-decisions-adrs)
4. [Shared Crates & Resilience Policies](#4-shared-crates--resilience-policies)
5. [Application Specifications (10 Apps)](#5-application-specifications-10-apps)
6. [Product Management, Observability & Compliance](#6-product-management-observability--compliance)
7. [Go-To-Market & Competitive Analysis](#7-go-to-market--competitive-analysis)
8. [Definitive Tech Stack & Frontend Boundaries](#8-definitive-tech-stack--frontend-boundaries)
9. [Master Build Sequence (DAG)](#9-master-build-sequence-dag)

---

## 1. EXECUTIVE SUMMARY & PRODUCT STRATEGY

### 1.1 Vision
Build **Unio**: a monorepo allowing the development, maintenance, and monetization of **10 SaaS applications** in parallel. Unio provides a unified operating system for SMBs, replacing 10+ disjointed tools with a single, natively integrated suite.

### 1.2 Product Strategy
- **Clone** successful SaaS products by taking 80% of their most used features.
- Make them 2x better (performance, UX, reliability via Rust).
- Sell them 3 to 5x cheaper than competitors.
- Create an integrated suite where apps communicate natively via an internal event bus with strict delivery guarantees.

### 1.3 The 10-App Portfolio & Pricing

| App | Category | Clone of | Price | Positioning |
|-----|----------|----------|-------|-------------|
| **PIVOT** | Productivity | Notion + ClickUp | $15/mo | "The productivity suite that doesn't slow you down" |
| **SOND** | Surveys & Forms | SurveyMonkey + Typeform | $15/mo | "Surveys that convert, without breaking the the bank" |
| **DIAL** | Chat & Support | Slack + Intercom | $9/mo | "Your team and your customers, all connected" |
| **SPARK** | Automation | Zapier + Make | $19/mo | "Automation that works, at a discounted price" |
| **TEMPO** | Scheduling | Calendly | $9/mo | "Appointment scheduling that works" |
| **CINQ** | CRM & Sales | HubSpot + Pipedrive | $15/mo | "The simple and powerful sales pipeline" |
| **VAULT** | Inventory | Cin7 + Skubana | $29/mo | "Inventory management that doesn't cost an arm and a leg" |
| **AEGIS** | SSO & Security | 1Password + Okta | $3/mo | "Security for your entire suite in one click" |
| **PAUSE** | HR & Leave | Personio + BreatheHR | $4/mo | "Your teams' well-being, simplified" |
| **VISTA** | Analytics & BI | Metabase + PowerBI | $9/mo | "The overview of all your activity" |

### 1.4 Bundles
- **10 apps Bundle:** $49/mo (vs $200+ for competitors).
- **5 apps Bundle:** $29/mo.
- **1 app:** Individual price ($3-$29 depending on the app).
- **Free Tier:** Unlimited time, basic features, strict usage limits.

---

## 2. SYSTEM ARCHITECTURE (THE MULTI-BINARY MODULAR MONOLITH)

### 2.1 System Overview
Unio is built as a **Multi-Binary Shared-Database Modular Monolith**. The codebase is a single Rust workspace containing 10 independent domain crates. These domains are compiled into five distinct binaries to ensure operational agility and strict fault isolation:
1. `unio-api`: The core Axum HTTP server handling REST, GraphQL, Webhooks. Strictly stateless.
2. `unio-dial-realtime`: The DIAL-specific Axum WebSocket server. Natively and exclusively owns the `dial` schema for reads, writes, and `LISTEN/NOTIFY` fan-out.
3. `unio-event-worker`: Handles the Postgres-to-NATS Relay, async lightweight jobs, and crons. Strictly stateless.
4. `unio-data-worker`: Handles ClickHouse ingestion buffering, heavy data processing, and DLQ reaper. Strictly stateless.
5. `unio-search`: A lightweight, strictly stateless client binary coordinating with the external **Quickwit** distributed search cluster.

Domain crates have **zero direct code dependencies on each other**. Cross-domain communication is handled exclusively via a **Transactional Outbox** relayed to **NATS JetStream**. At runtime, all domains share the `unio_core` database schema for infrastructure concerns (outbox, idempotency, jobs). Schema changes to `unio_core` are governed by a strict cross-domain migration review process.

**Fault Tolerance (Supervisor Pattern, NATS Work-Stealing & Unified JetStream DLQ):**
To prevent a `panic!` in a single domain from tearing down a worker process, the architecture embraces Rust's deterministic panic behavior and utilizes a native Tokio `Supervisor` task pattern. 
*   **NATS Consumer Isolation:** Domain consumers pull events from dedicated NATS JetStream streams. If a consumer task panics, the Supervisor catches the `JoinError`. The message is not ACKed. NATS automatically re-delivers it.
*   **Semantic & Structural Poison Message Handling:** The NATS consumer layer strictly validates both structural integrity (serde deserialization) and semantic integrity (presence of `tenant_id`, `event_id`, required domain fields). If validation fails, or if execution exhausts 5 retries, the Supervisor catches the error, serializes the original payload + error context, publishes it to the dedicated `UNIO_DLQ` JetStream stream, and **ACKs** the original message.
*   **Adaptive Exponential Backpressure NACKs:** If a persistent infrastructure failure occurs, the consumer strictly executes an exponential delayed `Nak` (1s, 2s, 5s, 15s, 30s) to prevent tight infinite redelivery loops and user-visible latency spikes.
*   **Circuit Breaker Failure Modes:** The global circuit breaker tracks domain health in a Redis Hash. If Redis goes down, the Dispatcher **fails closed**. Distributed idempotency strictly relies on Postgres row-level locks.
*   **Timeout Handling & Graceful Cancellation:** If a task exceeds its timeout (30s for domains, 60s for webhooks), the Supervisor explicitly triggers `CancellationToken::cancel()`. The Supervisor waits 2 seconds for a clean exit. If the task is still alive, it forcefully calls `join_handle.abort()` and Nacks the NATS message.
*   **Strict JetStream Retention:** All DLQ and Retry streams (`UNIO_DLQ`, `UNIO_OLAP_RETRY`, `UNIO_OLAP_BUFFER`, `UNIO_SEARCH_DLQ`) strictly enforce `max_age: 7d` and `max_bytes: 1GB` retention policies. JetStream global `max_file_storage` is strictly set to `10GB`. Monitored via `nats_jetstream_disk_usage`.

### 2.2 Database Strategy: Supavisor, Compute Isolation & Idiomatic Transaction Scoping
All 10 apps share a single **Neon Managed PostgreSQL 16** instance via **Supavisor (PgBouncer)** in transaction mode.

*   **Connection Pool Limits, Timeouts & Per-Domain Semaphores:** 
    *   `unio_auth_db_pool` (`max_connections=20`): Dedicated strictly to AEGIS. 
    *   `unio_domain_db_pool` (`max_connections=35`): Shared across all 8 standard domain schemas. Guarded by a global `tokio::sync::Semaphore(30)` to reserve 5 connections for relay/admin operations. Inside the global semaphore, each domain acquisition is bounded by a per-domain `Semaphore(10)` to prevent cross-domain starvation. **Compute Isolation:** Every transaction strictly executes `SET LOCAL statement_timeout = '5s'` to prevent a poorly written query in PIVOT from consuming Postgres CPU/IO and starving CINQ.
    *   `unio_dial_db_pool` (`max_connections=35`): Dedicated strictly to `unio-dial-realtime` for `dial` schema writes and reads.
    *   `unio_relay_direct_pool` (`max_connections=4`): Dedicated direct Neon connection (bypasses Supavisor) strictly for the `LISTEN/NOTIFY` outbox relay.
    *   `unio_dial_listen_pool` (`max_connections=4`): Dedicated direct Neon connection (bypasses Supavisor) strictly for `unio-dial-realtime` `LISTEN dial_messages_notify`.
*   **Infrastructure Role Separation & RLS Boundaries:** `unio_core` transactional tables strictly enforce RLS. 
    *   **SECURITY DEFINER Outbox Boundary:** Domain roles are granted `INSERT ONLY` on `outbox_events`, but must execute the `unio_core.insert_outbox_event` function. This function is `SECURITY DEFINER`, reads `current_setting('app.current_tenant_id')`, explicitly NULL-checks it (`IF current_setting(...) IS NULL THEN RAISE EXCEPTION`), and strictly forces it into the `tenant_id` and `domain` columns. It accepts and stores the W3C `traceparent` string, and executes `PERFORM pg_notify('unio_outbox_notify', '')`.
    *   **Admin Role:** A dedicated `unio_admin_service_account` DB role is explicitly granted `BYPASSRLS` at the database level for narrowly-scoped cross-tenant administrative endpoints. Application-level `SECURITY DEFINER` RLS bypasses are eradicated.
*   **Idiomatic Transaction Scoping:** `unio-db` provides a standard `DomainRepository` trait. The repository implementation explicitly acquires the transaction, executes the GUCs (`SET LOCAL ROLE`, `set_config`, `SET LOCAL statement_timeout`), and returns a wrapped `TenantTransaction` struct. Domain logic executes native `sqlx` macros directly via a `conn()` method, avoiding `Deref` anti-patterns that break `self`-consuming methods like `commit()`.

### 2.3 Infrastructure & Phased Scaling

#### Phase 1: Initial Launch (0-100 Users) — 32GB Hetzner VPS (~$30/mo) + Managed ClickHouse & Quickwit
*Strictly Single-Instance for core binaries. VISTA OLAP offloaded to managed ClickHouse. Search offloaded to a 3-node Quickwit cluster.*
**32GB RAM & CPU Allocation Math (Core VPS):**
*   1 `unio-api` Binary (Axum HTTP): ~4.0 GB RAM (`MemoryMax=4000M`, `CPUQuota=200%`)
*   1 `unio-dial-realtime` Binary (Axum WebSocket): ~2.0 GB RAM (`MemoryMax=2000M`, `CPUQuota=150%`)
*   1 `unio-event-worker` Binary: ~2.0 GB RAM (`MemoryMax=2000M`, `CPUQuota=100%`)
*   1 `unio-data-worker` Binary: ~3.0 GB RAM (`MemoryMax=3000M`, `CPUQuota=100%`)
*   1 `unio-search` Binary: ~0.5 GB RAM (`MemoryMax=500M`, `CPUQuota=50%`)
*   NATS JetStream: ~1.0 GB (`maxmemory=1gb`, `max_file_storage=10gb`, `CPUQuota=50%`)
*   Redis: ~1.0 GB (`maxmemory=1gb`, `noeviction`, `CPUQuota=50%`)
*   Caddy + Vector: ~150 MB RAM
*   OS/Buffer/Page Cache: ~8.0 GB RAM
*   **Total RAM = ~21.6 GB utilized, leaving 10.4GB headroom.**
*   **CPU Contention Strategy:** `systemd` strictly enforces `CPUQuota` to prioritize latency-sensitive `unio-api` and `unio-dial-realtime` binaries over background data workers, preventing p99 latency spikes during heavy VISTA ingestion.
**Degradation Strategy:** If the primary VPS dies, Cloudflare health checks route traffic to a read-only static page. Critical data (Postgres, ClickHouse) is managed by external providers and survives VPS failure. Binary restart is automated via systemd `Restart=always`.

#### Phase 2: Scale-Up (>100 Users) — 64GB VPS / Split Instances
*Trigger:* Active user count reaches 100.
*Action:* Scale Neon compute size. Upgrade VPS to 64GB. `unio-api`, `unio-event-worker`, `unio-data-worker`, and `unio-search` clients are split into separate VPS instances. `unio_domain_db_pool` and `unio_dial_db_pool` increased to `max_connections=50` per instance. `unio-dial-realtime` resync `Semaphore` increased to `30`.

### 2.4 CI/CD Pipeline Strategy
*   **Tool:** GitHub Actions.
*   **Build:** Compiles five `x86_64-unknown-linux-musl` static binaries.
*   **Deployment:** Binaries uploaded via `rsync`. Migrations run via `sqlx migrate run`.
*   **Atomic Deployment:** New binary starts on a temp port. Health check passes. `systemctl restart`. `unio-dial-realtime` uses graceful shutdown (draining WebSocket connections for up to 30s) before restart.

### 2.5 Monitoring & Observability
*   **Logs:** `tracing` -> structured JSON to local files via `tracing-appender`. Vector ships to external drain.
*   **Metrics:** `/metrics` endpoint scraped by external Prometheus.
*   **Tracing:** OpenTelemetry (OTLP). `unio_telemetry::spawn_traced` propagates W3C `traceparent`. The `outbox_events` table persists `traceparent` in a `trace_context` JSONB column. `unio-event-worker` extracts this and injects it as NATS message headers. Frontend TanStack Query interceptors strictly generate and inject `traceparent` headers; `unio-api` validates the format and prepends a server-side root span, linking the client trace as a parent. `unio-dial-realtime` generates server-side OTel spans strictly based on the authenticated WebSocket connection ID, refusing client-spoofed trace contexts.
*   **Standard API Error Contract:** All Axum handlers return a unified `ApiError` struct from `unio-contracts` (`{"error": {"code": "IDEMPOTENCY_RACE", "message": "...", "retry_after": 5}}`), enforced via a global error handling middleware.

---

## 3. CORE ARCHITECTURAL DECISIONS (ADRs)

### ADR-001: Transactional Outbox to NATS JetStream with pg_partman Retention & Unified DLQ
**Status:** Accepted
**Context:** Using Postgres `FOR UPDATE SKIP LOCKED` as a high-throughput message queue causes severe lock contention. Relying exclusively on Postgres `LISTEN/NOTIFY` strands events if the listener connection drops, and breaks behind PgBouncer. Outbox purges using `NOT EXISTS` subqueries cause O(n²) lock contention. Deleting millions of rows in a single transaction causes massive WAL bloat. Embedding physical database replication state checks into application-level cron logic violates the separation of infrastructure and domain.
**Decision:** Decouple the outbox into NATS JetStream immediately after transaction commit. Utilize a dedicated `UNIO_DLQ` JetStream stream for poison messages. Keep workers strictly stateless. Partition the `outbox_events` table by day using native `pg_partman`. Purge old data via O(1) `DROP PARTITION` operations strictly managed by `pg_partman` lifecycle policies. Use a dedicated direct `LISTEN` connection (bypassing Supavisor) to wake up a Supavisor-compatible `FOR UPDATE SKIP LOCKED` poller. Order strictly by `id`. Enforce an index on `(status, id)` per partition. Cap DLQ replays at 3 attempts.
**Implementation:**
1. App A performs a DB transaction. Within this ACID transaction, it executes `SELECT unio_core.insert_outbox_event(...)`. The `SECURITY DEFINER` function strictly NULL-checks the `tenant_id` GUC, enforces `tenant_id`/`domain`, persists `trace_context` JSONB, and executes `PERFORM pg_notify('unio_outbox_notify', '')`. App A commits.
2. **Instant Wake-Up Relay Task (Postgres -> NATS):** 
    *   A dedicated task in `unio-event-worker` acquires a connection from `unio_relay_direct_pool` (max 4 connections: 2 for LISTEN redundancy, 2 for drain), executes `LISTEN unio_outbox_notify`, and awaits notifications.
    *   Upon receiving a notification, a concurrent task acquires a connection from `unio_domain_db_pool` and executes `drain_outbox()`. If the `LISTEN` socket is detected as closed, a dead-letter poller activates with an exponential backoff strictly as a safety net.
    *   **`drain_outbox()`:** Executes `SELECT * FROM outbox_events WHERE status = 'pending' ORDER BY id LIMIT 500 FOR UPDATE SKIP LOCKED`. Batch publishes to `UNIO_EVENTS` via NATS async API, updates to `dispatched`, commits. Strictly backed by the local partition `idx_outbox_status_id (status, id)` index.
3. **Semantic & Structural Poison Message Handling:** At the NATS consumer layer, events are strictly deserialized and validated. If validation fails, or if execution exhausts 5 retries, the Supervisor serializes the payload + error context, publishes it to `UNIO_DLQ`, and **ACKs** the original message.
4. **Database-Native Partition Drops:** `pg_partman` is configured to drop partitions older than 7 days. Zero application-level WAL-lag queries, zero row-scanning locks, zero WAL bloat.
5. **Bounded DLQ Replay:** `outbox_events` includes a `replay_count` column. `POST /api/admin/dlq/{event_id}/replay` rejects events where `replay_count >= 3`. Replays copy the event with a new ID and `traceparent`, preserving the original via Span Links.

### ADR-002: Supavisor & Idiomatic Rust Transaction Scoping
**Status:** Accepted
**Context:** Bypassing Supavisor for direct Neon connections exhausts limits during horizontal scaling. Re-implementing `Executor` traits via proxies breaks native `sqlx` macros. Forcing every repository method to manually execute `SET LOCAL ROLE` and `SELECT set_config(...)` is a massive DRY violation. Using `Deref`/`DerefMut` to hide the transaction breaks when calling `commit(self)`.
**Decision:** Use Supavisor in transaction mode. Abstract the GUC execution behind a standard `DomainRepository` trait that returns a wrapped `TenantTransaction` object with the GUCs pre-configured. Expose the connection explicitly for `sqlx` macros.
**Implementation:**
1. Axum middleware extracts `tenant_id` from the JWT and injects as an `Extension`. No DB connection is acquired.
2. The domain handler calls `repo.begin_tenant_tx(tenant_id).await?`.
3. The repository implementation explicitly manages the transaction and returns the wrapper:
   ```rust
   pub struct TenantTransaction<'a> {
       tx: sqlx::Transaction<'a, Postgres>,
   }

   impl<'a> TenantTransaction<'a> {
       pub async fn begin(pool: &PgPool, tenant_id: Uuid) -> Result<Self> {
           let mut tx = pool.begin().await?;
           sqlx::query("SET LOCAL ROLE unio_pivot_role").execute(&mut *tx).await?;
           sqlx::query("SET LOCAL statement_timeout = '5s'").execute(&mut *tx).await?;
           sqlx::query("SELECT set_config('app.current_tenant_id', $1, true)")
               .bind(tenant_id.to_string())
               .execute(&mut *tx).await?;
           Ok(Self { tx })
       }

       // Explicitly expose the connection for sqlx macros to avoid Deref anti-patterns
       pub fn conn(&mut self) -> &mut sqlx::PgConnection {
           &mut self.tx
       }

       // Explicitly consume self for commit
       pub async fn commit(self) -> Result<()> {
           self.tx.commit().await.map_err(Into::into)
       }
   }
   ```
4. Domain logic uses the transaction flawlessly without infrastructure clutter:
   ```rust
   let mut tx = repo.begin_tenant_tx(tenant_id).await?;
   let result = sqlx::query_as!(PivotDoc, "SELECT * FROM pivot.docs WHERE id = $1", doc_id)
       .fetch_one(tx.conn())
       .await?;
   tx.commit().await?;
   ```
5. Postgres RLS policies on all domain tables enforce `USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)`.

### ADR-003: DIAL Schema Ownership, Native LISTEN/NOTIFY, & Direct WebSocket Ingestion
**Status:** Accepted
**Context:** DIAL requires low-latency WebSocket delivery. Allowing `unio-api` to write to the `dial` schema while `unio-dial-realtime` reads from it creates a cross-binary boundary violation. Executing `SELECT max(id)` before `LISTEN` creates a Time-of-Check to Time-of-Use (TOCTOU) race condition. Relying on client-spoofed `traceparent` headers is a security anti-pattern. Proxying HTTP payloads from `unio-api` to `unio-dial-realtime` via mTLS introduces an unnecessary latency bottleneck and cascading failure risk.
**Decision:** `unio-dial-realtime` strictly owns the `dial` schema (reads and writes). Clients strictly publish DIAL messages directly over the authenticated WebSocket connection. External webhooks strictly write to Postgres via `unio-api`, relying entirely on native `LISTEN/NOTIFY` for fan-out. Postgres is the durable source of truth, using native `BIGSERIAL` for primary keys. A Postgres trigger strictly executes `pg_notify('dial_messages_notify', new.id::text)` on insert. `unio-dial-realtime` strictly executes `LISTEN` and `max(id)` retrieval inside a single read-only Postgres transaction to guarantee zero gap. Clients utilize strict sequence-based gap detection augmented by a 5-second WebSocket Ping/Pong heartbeat. Resync concurrency is strictly bounded per-tenant by `Semaphore(5)`.
**Implementation:**
1. **Instant Delivery & Persistence:** `unio-dial-realtime` receives a message over the authenticated WebSocket, generates a server-side OTel span, inserts into `dial.messages` with `RETURNING id`, inserts an outbox event for cross-domain persistence, and `COMMIT`s. A Postgres `AFTER INSERT` trigger natively executes `pg_notify('dial_messages_notify', NEW.id::text)`. Zero application-level race conditions, zero proxy hops.
2. **O(1) Cold-Start Hydration (TOCTOU Eliminated):** Upon `unio-dial-realtime` startup, the server executes a single read-only transaction utilizing the Supavisor-bypassing `unio_dial_listen_pool`:
   ```sql
   BEGIN READ ONLY;
   LISTEN dial_messages_notify;
   SELECT tenant_id, max(id) FROM dial.messages GROUP BY tenant_id;
   COMMIT;
   ```
3. **Native LISTEN/NOTIFY Fan-Out:** `unio-dial-realtime` acquires a connection from `unio_dial_listen_pool`, executes `LISTEN dial_messages_notify`, and awaits notifications. Upon notification, it fetches the row and natively fans it out to the target tenant's WebSocket channel.
4. **5-Second Heartbeat Gap Detection:** Clients strictly track `last_received_id`. If a message arrives where `id > last_received_id + 1`, the client *immediately* triggers the resync protocol. The server sends a WebSocket Ping every 5 seconds containing the server's current `max(id)`.
5. **Direct Read Resync with Per-Tenant Bounding:** When a client sends `{"type":"resync_check","last_seen_id":N}`, `unio-dial-realtime` generates an internal OTel span mapped to the authenticated connection ID. It executes a direct read-only query: `SELECT max(id) FROM dial.messages WHERE tenant_id = $1`. If a gap is confirmed, it attempts to acquire a permit from a per-tenant `Semaphore(5)`.
    *   **If permit acquired:** Streams the missing messages directly from Postgres to the client. Releases permit. Clients apply jittered backoff (5s ± 2s) for subsequent gaps.
    *   **If permit denied (exhausted):** The server immediately returns `{"type":"resync_failed", "status": 429, "retry_after": 5}`. The client strictly honors the `Retry-After` directive.
6. **Non-Blocking Cascading Failure Broadcast:** If `unio-dial-realtime` detects a Postgres `LISTEN` disconnection, it utilizes a non-blocking `tokio::sync::broadcast` channel to asynchronously fan out `{"type":"service_degraded"}` to all connected WebSocket clients.

### ADR-004: Strict `unio-contracts` Isolation & Tombstone-Aware Sequential Frontend Reconciliation
**Status:** Accepted
**Context:** A global `unio-events` crate creates a god-crate. Tracking a global `last_seen_event_id` in the Root Shell causes permanent state desynchronization. Applying event payloads without buffering limits crashes the browser tab. Fetching missing documents via GET query parameters causes HTTP 414 errors. Unbounded missing document queues risk infinite UI hangs. Quarantining events when documents are missing due to backend deletions permanently bricks the frontend event queue.
**Decision:** Shatter the `unio-events` god-crate. Break the frontend into Vite Module Federation. Abolish Root Shell God State. Cross-domain communication uses a typed `postMessage` Event Bus augmented by a **Cursor-Based State-Event Sync** endpoint strictly owned by each domain. The frontend strictly processes missed events in a **background async queue**. If an event references a missing document, the domain queue strictly pauses all event application until the missing documents are fetched via domain-specific `POST` endpoints strictly bounded to 100 IDs per chunk. The frontend strictly differentiates between network failures (retry) and `410 Gone` tombstones (apply local deletion and resume).
**Implementation:**
1. **Backend:** `unio-contracts` exposes `pub mod events { pub struct CinqDealWon { ... } }`. All outbox events increment a global sequence but are strictly typed with their `domain`. Contracts and shared UI components are strictly semantically versioned to prevent cross-deployment runtime serialization crashes.
2. **Strict Domain-Specific Reconciliation Endpoints:** When a remote module mounts, it calls `/api/pivot/sync?state_cursor=...&event_cursor=N`. The PIVOT domain handler executes a single Postgres transaction bounding both queries (state cursor LIMIT 50, events LIMIT 500). Returns `{ "state": [...], "next_cursor": "...", "events": [...], "latest_event_id": "...", "has_more_events": false }`.
3. **Strict Sequential Background Catch-Up Queue:** The remote module receives the payload. It strictly applies event payloads sequentially where `event.id > local_last_seen_event_id`. 
4. **Tombstone-Aware Bounded Payload Missing Document Fetch:** If an event in the batch modifies a document not in the local cache, the frontend **strictly pauses the event queue for this domain**. It aggregates all missing `doc_id`s from the current event batch.
    *   **Chunked Fetch Loop:** The background async process fetches documents in chunks of 100 via `POST /api/pivot/documents/batch-fetch`. 
    *   **Network Error Handling:** If a chunk-fetch request fails due to network timeout/500, it retries with exponential backoff up to 3 times. If all retries fail, it surfaces a UI error to the user, logs the failure with the `traceparent`, and halts the queue for that domain.
    *   **Tombstone Handling (`410 Gone`):** If the `batch-fetch` endpoint returns `410 Gone` for specific document IDs, the frontend strictly emits a local `DOCUMENT_DELETED` event, applies the tombstone to the local Zustand store, removes the ID from the missing list, and resumes the queue. Zero deadlocks, zero out-of-order event application, zero URL overflows.

### ADR-005: Flawless Database-Enforced Idempotency with Crash-Safe Heartbeat Lifecycle
**Status:** Accepted
**Context:** Redis-based `SET NX` idempotency locks alone are not crash-safe. Failing open to a local per-node mitigator when Redis is down trades data integrity for availability. Sleeping 100ms inside a DB transaction wastes pool connections. Long-running jobs exceeding a 5-minute TTL may have their `job_id` stolen. A 15-second heartbeat death threshold is too tight for Tokio scheduling pressure.
**Decision:** Combine a 30-second Redis lock with a Postgres `UNIQUE(tenant_id, key)` constraint and native row-level `SELECT ... FOR UPDATE` locks. Redis strictly serializes requests *before* DB acquisition; if Redis is unavailable, the API strictly **fails closed** (`503 Service Unavailable`) **exclusively for requests explicitly bearing an `Idempotency-Key` header**. Standard user POST requests without the header bypass Redis and rely solely on Postgres constraints. Job execution is strictly tracked via a 5-second heartbeat in the `unio_core.jobs` table. If the heartbeat stops for 30 seconds, the job is considered dead. Duplicate requests arriving during an in-flight transaction return `425 Too Early` with a strict `Retry-After: 5` directive.
**Implementation:**
1. **Database Schema:** `unio_core.idempotency_keys` (`tenant_id`, `key`, `job_id`, `status`, `created_at`, `updated_at`). RLS enforced. `unio_core.jobs` (`job_id`, `status`, `last_heartbeat_at`).
2. **Scoped Resilient Redis Dependency:** The Axum handler receives a request. It checks for the presence of an `Idempotency-Key` header.
    *   **If Header is Absent:** Proceed directly to the repository (standard user request).
    *   **If Header is Present:** Execute `SET unio:idem:{tenant_id}:{key} 1 NX EX 30`.
        *   **If Redis is Unavailable:** The API strictly **fails closed** and returns `503 Service Unavailable`. Zero thundering-herd risks for critical webhooks/retries.
        *   **If `nil` (Lock not acquired):** The request is a duplicate. It queries Postgres for the `job_id` and `status`. If 'completed', return `202 Accepted`. If 'processing', return `425 Too Early` with `Retry-After: 5`.
        *   **If `OK` (Lock acquired):** The request proceeds to the repository.
3. **Native Row-Level Lock Execution:** The repository begins a transaction and explicitly attempts to insert the key:
   ```sql
   INSERT INTO unio_core.idempotency_keys (tenant_id, key, job_id, status) 
   VALUES ($1, $2, $3, 'processing') 
   ON CONFLICT (tenant_id, key) DO NOTHING RETURNING job_id;
   ```
4. **Explicit Rust State Transitions:** The Rust code evaluates the result:
    *   **If 1 row returned (New Record):** Insert new job, insert outbox event, `COMMIT`, return `202 Accepted`.
    *   **If 0 rows returned (Existing Record):** Query `SELECT job_id, status, updated_at FROM unio_core.idempotency_keys WHERE tenant_id = $1 AND key = $2 FOR UPDATE;`
    *   **Some(row) where status == 'completed':** `ROLLBACK`, return `202 Accepted`.
    *   **Some(row) where status == 'processing':** `ROLLBACK`, return `425 Too Early`.
5. **Crash-Safe Heartbeat-Based Job Lifecycle:** When a job begins execution in `unio-jobs`, it updates `unio_core.jobs.last_heartbeat_at = NOW()` every 5 seconds. If a duplicate request arrives and queries the job status, it checks `last_heartbeat_at`. If `last_heartbeat_at < NOW() - 30 seconds`, the job is considered dead. The duplicate request can safely create a new `job_id`, update the `idempotency_keys` table, and restart execution. Zero background reapers, zero false positives during scheduling pressure.

### ADR-006: Centralized Envelope Encryption via `unio-crypto`
**Status:** Accepted
**Context:** Allowing domain crates to call KMS `Decrypt` directly violates the principle of least privilege. Raw KMS API access in domains creates a large attack surface.
**Decision:** Introduce a dedicated `unio-crypto` crate that provides a `CryptoService` trait with `encrypt` and `decrypt` methods. It internally depends on `unio-kms` and manages KEK caching, DEK generation, and AES-256-GCM envelope encryption.
**Implementation:**
1. **`unio-crypto` Crate:** Provides `CryptoService` trait and `CryptoServiceImpl`.
2. **Envelope Encryption Flow:**
    *   **`encrypt`**: Generates random 256-bit DEK. Encrypts plaintext with AES-256-GCM. Checks in-memory cache for raw KEK (10s TTL). On miss, calls KMS `Decrypt`. Encrypts DEK with raw KEK. Returns envelope: `version || encrypted_DEK_len || encrypted_DEK || nonce || ciphertext`.
    *   **`decrypt`**: Parses envelope. Gets raw KEK from cache or KMS. Decrypts `encrypted_DEK` to recover DEK. Decrypts `ciphertext`.
3. **Dependency Injection:** Root `unio-api` binary constructs `AwsKmsClient`, wraps it in `CryptoServiceImpl`, and injects `Arc<dyn CryptoService>` into domain routers via Axum `State`.

### ADR-007: Partitioned ClickHouse OLAP Offload with ReplacingMergeTree & Materialized Views
**Status:** Accepted
**Context:** Iterating batches of events into an in-memory `HashMap` creates an OOM risk. Concurrent bulk inserts into ClickHouse risk fatal `Too many parts` exceptions. Using a raw `MergeTree` and computing multi-column `argMax` on read melts CPU and memory. `AggregatingMergeTree` merges data asynchronously, leading to silent double-counting. A single global `ClickHouseWriter` consumer creates a throughput bottleneck and SPOF. Hash-partitioning by `tenant_id` isolates hot-tenant skew but does not resolve it.
**Decision:** Eliminate in-memory aggregation. Stream VISTA events to managed ClickHouse. Introduce a centralized `UNIO_OLAP_BUFFER` JetStream stream partitioned by `tenant_id` hash. N partitioned `ClickHouseWriter` consumers strictly drain their assigned partitions, serializing inserts to guarantee zero `Too many parts` exceptions while parallelizing throughput. Utilize `ReplacingMergeTree(outbox_id)` for idempotent ingestion and an `AggregatingMergeTree` materialized view to pre-compute dashboard aggregates. Delay NATS ACKs until the `ClickHouseWriter` actor confirms a successful flush. Dynamically allocate dedicated partitions to tenants exceeding a 10,000 events/day threshold to resolve skew.
**Implementation:**
1. **Partitioned Buffer Stream:** VISTA events are consumed from `UNIO_EVENTS` by `unio-data-worker` instances. The workers strictly validate the payload, hash the `tenant_id`, and publish to the corresponding partition of `UNIO_OLAP_BUFFER`.
2. **Strict Monotonic Versioning:** The Postgres `outbox_events.id` is passed as the strictly monotonic `version` to ClickHouse.
3. **Explicit Typed Table Schema:** The ClickHouse `vista.events` table uses the `ReplacingMergeTree(outbox_id)` engine, strictly ordered by `(tenant_id, entity_type, entity_id, outbox_id)`. Payloads are flattened into typed columns. Background merges natively deduplicate rows with the same `entity_id`, keeping the highest `outbox_id`.
4. **Partitioned Serialized Synchronous Batching:** N `ClickHouseWriter` consumers (e.g., 3 partitions) drain their respective `UNIO_OLAP_BUFFER` partitions. Each consumer batches up to 1,000 events OR 1 second elapses. It executes a single synchronous `INSERT` strictly wrapped in a `tokio::time::timeout(Duration::from_secs(5), ...)`. 
    *   **On Success:** ACKs the batch.
    *   **On Timeout/Failure:** Explicitly NACKs the batch with exponential backoff. If retries exhaust, routes the batch to `UNIO_OLAP_RETRY` and ACKs the original message.
5. **Hot-Tenant Skew Mitigation:** If a tenant exceeds 10,000 events/day, an admin cron dynamically re-routes their events to a dedicated, isolated `UNIO_OLAP_BUFFER` partition consumed by a dedicated `ClickHouseWriter` instance.
6. **Pre-Computed Materialized View Deduplication:** VISTA dashboards query an `AggregatingMergeTree` materialized view (`vista.events_agg`) that targets the `vista.events` table. The MV strictly pre-calculates sums and counts using `argMax` *only* on the specific aggregate columns, grouped by `tenant_id` and `entity_type`. Deletions are represented as events with an `is_deleted=true` flag, which the MV correctly resolves. Zero `FINAL` clauses, zero massive multi-column `argMax` projections on read.
   ```sql
   CREATE MATERIALIZED VIEW vista.events_agg
   ENGINE = AggregatingMergeTree()
   ORDER BY (tenant_id, entity_type, entity_id)
   AS SELECT tenant_id, entity_type, entity_id,
      maxStateIf(amount, is_deleted = false) as amount_max,
      sumStateIf(amount, is_deleted = false) as amount_sum
   FROM vista.events GROUP BY tenant_id, entity_type, entity_id;
   ```

### ADR-008: Stateless Zero-Loss Search Architecture with Adaptive Backpressure
**Status:** Accepted
**Context:** Using an LRU cache for tenant Actor handles risks silent message drops. Manual spillover queues and LRU eviction timeouts introduce immense operational complexity.
**Decision:** Eradicate the LRU actor pool. `unio-search` is a strictly stateless NATS consumer. If a Quickwit indexing request fails or times out, the consumer strictly executes an adaptive exponential delayed NACK, relying entirely on NATS native work-stealing and redelivery for backpressure.
**Implementation:**
1. **Stateless Consumer:** `unio-search` consumes events from `UNIO_EVENTS`. It strictly deserializes and validates the payload. If invalid, routes to `UNIO_SEARCH_DLQ` and ACKs.
2. **Direct Quickwit Indexing:** For valid events, the consumer executes a direct HTTP `POST` to the Quickwit cluster API.
    *   **On Success (2xx):** ACK the NATS message.
    *   **On Failure (5xx or Network Error):** Execute an **exponential delayed NACK (1s, 2s, 5s, 15s, 30s)**. NATS natively handles redelivery. If `MaxDeliver` (5) is exceeded, route to `UNIO_SEARCH_DLQ`.
    *   **On Client Error (4xx):** Route to `UNIO_SEARCH_DLQ` and ACK.
3. **Strict Retention:** `UNIO_SEARCH_DLQ` strictly enforces `max_age: 7d` and `max_bytes: 1GB`.

---

## 4. SHARED CRATES & RESILIENCE POLICIES

### 4.1 Shared Crates Specification (Strict Single Responsibility)
*   **`unio-db`**: Global `sqlx` `DbPool` initialization (Supavisor compatible). Provides `DomainRole` enum, per-domain `Semaphore(10)` and global `Semaphore(30)`, and the `DomainRepository` trait. The `begin_tenant_tx` method strictly sets `statement_timeout` and returns a `TenantTransaction` wrapper exposing `conn()` and `commit(self)`.
*   **`unio-telemetry`**: OpenTelemetry setup. W3C `traceparent` extraction/injection. `spawn_traced` utility handles graceful token cancellation and `abort()` fallback internally.
*   **`unio-nats`**: NATS JetStream client wrapper. Provides typed Pull Consumers, handles Ack/Nack logic with **exponential delayed NACKs (1s, 2s, 5s, 15s, 30s)**, and provides the unified `publish_to_dlq` function. Strictly enforces stream retention limits (`max_age`, `max_bytes`, `max_file_storage=10GB`).
*   **`unio-relay`**: Infrastructure-only. Contains the Instant Wake-Up Relay task. Maintains dedicated direct connections to Neon for `LISTEN unio_outbox_notify` (bypassing Supavisor). Upon notification, drains the outbox via Supavisor pool using `FOR UPDATE SKIP LOCKED ORDER BY id`. Pushes to `UNIO_EVENTS`.
*   **`unio-contracts`**: Strictly contains cross-domain event definitions, DTOs, and the standard `ApiError` response struct. Strictly semantically versioned.
*   **`unio-kms`**: Provides `KeyManagementService` trait abstracting KMS `Decrypt`.
*   **`unio-crypto`**: Provides `CryptoService` trait (`encrypt`/`decrypt`) and `CryptoServiceImpl`. Manages KEK caching, DEK generation, AES-256-GCM envelope encryption.
*   **`unio-auth`**: JWKS caching. JWT validation. `tenant_id` extraction. Validates token revocation via Redis; strictly fails closed (`503`) if Redis is unavailable.
*   **`unio-jobs`**: Decoupled from HTTP. Consumes job events from NATS, acquires domain context, executes heavy logic. Updates `unio_core.jobs` strictly via 5-second heartbeats. Safely aborts if heartbeat dies (30s threshold).
*   **`unio-clickhouse`**: Provides a typed client for VISTA analytics. Pushes validated events to the partitioned `UNIO_OLAP_BUFFER` JetStream stream. Provides query helpers targeting the `AggregatingMergeTree` materialized view.
*   **`unio-api`**: OpenAPI 3.1 via `utoipa`. Axum router composition. Handlers acquire scoped Redis idempotency locks (failing closed with `503` *only* if `Idempotency-Key` header is present and Redis is unavailable), insert jobs/outbox events transactionally. Strictly stateless HTTP/Outbox gateway.
*   **`unio-dial-realtime`**: Axum router composition for WebSockets. Explicitly owns the `dial` schema. Receives payloads directly via authenticated WebSocket. Executes O(1) Cold-Start Hydration inside a read-only transaction using direct Postgres connections. Resync concurrency strictly bounded by per-tenant `Semaphore(5)`.
*   **`unio-search`**: Lightweight typed, strictly stateless client for the external Quickwit cluster. Relies entirely on native NATS exponential delayed NACKs for backpressure.

### 4.2 Resilience Policy
*   **Internal App Calls:** No direct HTTP, RPC, or DB cross-calls. Strictly via Postgres Outbox -> NATS JetStream -> Domain Consumers. Exception: `unio-dial-realtime` exclusively owns the `dial` schema.
*   **External Calls (Webhooks, Google APIs):**
    *   *Retry:* 5 attempts, exponential backoff managed via NATS redelivery.
    *   *Circuit Breaker:* Opens after 5 consecutive failures in 60s. Half-Open after 5 min. State stored in Redis Hash. Fails closed locally if Redis is down.
    *   *Timeouts & Cancellation:* Webhook (10s), File upload (60s). All external HTTP clients respect `TaskContext` `CancellationToken`.
*   **Idempotency:** Redis `SET NX EX 30` serializes concurrent duplicates *exclusively for requests bearing an `Idempotency-Key` header*. If Redis is unavailable, API strictly fails closed (`503 Service Unavailable`) for those requests. Postgres `UNIQUE(tenant_id, key)` and `SELECT ... FOR UPDATE` safely serializes slip-throughs. Explicit Rust state machine handles `ON CONFLICT` logic including 30s heartbeat-based recovery. `425 Too Early` with `Retry-After: 5` on duplicate races.
*   **DLQ Routing Boundary:** Infrastructure, structural, and semantic validation failures route immediately to the `UNIO_DLQ` stream. Persistent backlog failures execute exponential delayed NACKs. Search failures route to `UNIO_SEARCH_DLQ`. ClickHouse flush timeouts route to `UNIO_OLAP_RETRY`. All DLQ/Retry streams strictly enforce `max_age: 7d` and `max_bytes: 1GB`. Global JetStream `max_file_storage=10GB`.

---

## 5. APPLICATION SPECIFICATIONS (10 APPS)

### 5.1 AEGIS (SSO & Security)
**Features:** OIDC SSO, TOTP MFA, AES-256-GCM Vault, JWKS endpoint.
**Architecture:**
*   `aegis` schema (`unio_aegis_role`). Strict RLS.
*   Uses dedicated `unio_auth_db_pool` (max 20 connections).
*   JWT Access Tokens expire in 5 mins. Revoked `tenant_id`s stored in Redis Set with 5-min TTL.
*   **Fail-Closed Auth:** If Redis is unavailable, AEGIS strictly fails closed and returns `503 Service Unavailable` for all authenticated requests, prioritizing security over availability.
*   Rotates signing keys every 90 days.
*   Manages KEK rotation. Writes new `encrypted_KEK` + `version` to `unio_core.tenant_keys`.

### 5.2 PIVOT (Productivity)
**Features:** Relational databases, Views, Markdown docs, Search.
**Architecture:**
*   `pivot` schema (`unio_pivot_role`). Hybrid model: relational metadata + JSONB `custom_data`.
*   Search via `unio-search` client querying the external Quickwit distributed cluster.
*   Listens to `CinqDealWon` via NATS. Checks local `processed_events` table for idempotency.
*   **Strict Domain Endpoints:** Owns `/api/pivot/sync` and `/api/pivot/documents/batch-fetch` (strictly bounded to 100 IDs per chunk, explicitly returns `410 Gone` for deleted documents).

### 5.3 SOND (Surveys & Forms)
**Features:** Drag-and-drop builder, conditional logic, responses.
**Architecture:**
*   `sond` schema (`unio_sond_role`). Form schemas validated by strongly typed Rust structs.
*   Public submission endpoints rate-limited at Caddy gateway.
*   Emits `SondFormSubmitted` via Outbox.

### 5.4 DIAL (Chat & Support)
**Features:** Channels, DMs, threads, file sharing, message-to-ticket.
**Architecture:**
*   `dial` schema (`unio_dial_role`). Strict RLS. `dial.messages.id` is native `BIGSERIAL`. Owned exclusively by `unio-dial-realtime`.
*   **Direct WebSocket Ingestion:** Clients strictly publish messages directly over the authenticated WebSocket connection to `unio-dial-realtime`. Zero proxy hops.
*   **Native Postgres Fan-Out:** `unio-dial-realtime` writes to Postgres `dial.messages` with `RETURNING id`, inserts an outbox event, and `COMMIT`s. A Postgres `AFTER INSERT` trigger executes `pg_notify('dial_messages_notify', NEW.id::text)`. 
*   **O(1) Cold-Start Hydration:** `unio-dial-realtime` strictly executes `LISTEN` and `SELECT max(id)` inside a single read-only transaction on startup using `unio_dial_listen_pool` (bypasses Supavisor).
*   **5-Second Heartbeat Gap Detection:** Clients strictly track `last_received_id`. Server sends a WebSocket Ping every 5 seconds containing the server's current `max(id)`.
*   **Direct Read Resync with Per-Tenant Bounding:** `unio-dial-realtime` executes direct read-only `sqlx` queries against `unio_dial_db_pool` to fetch `max(id)` or missing messages. Resync concurrency strictly bounded by per-tenant `Semaphore(5)` with jittered retry-after (5s ± 2s).

### 5.5 SPARK (Automation)
**Features:** Trigger-action workflows, cron, webhooks.
**Architecture:**
*   `spark` schema (`unio_spark_role`).
*   Single-app workflows execute via `tokio::spawn` using isolated DB transactions.
*   Cross-app mutations abolished. SPARK emits events on Event Bus.
*   **UI Execution Contract:** Heavy triggers inserted transactionally with Flawless DB-Native `UNIQUE(tenant_id, key)` Idempotency logic. UI polls `/api/jobs/{job_id}`. Terminal failures return `410 Gone`.

### 5.6 TEMPO (Scheduling)
**Features:** Booking pages, Google/Outlook sync, reminders.
**Architecture:**
*   `tempo` schema (`unio_tempo_role`). Implements native Google/Outlook Webhook push.
*   **Encryption:** OAuth tokens encrypted via `CryptoService` trait.
*   **Cancellation:** All external API calls respect `TaskContext` `CancellationToken`.

### 5.7 CINQ (CRM & Sales)
**Features:** 5-stage pipeline, lead/deal management, email integration.
**Architecture:**
*   `cinq` schema (`unio_cinq_role`). Fixed 5-stage pipeline.
*   Email OAuth tokens encrypted via `CryptoService`.
*   Emits `CinqDealWon` to Outbox upon deal closure. Frontend broadcasts via `postMessage` Event Bus (reconciled via Strict Sequential Background Catch-Up Queue with targeted `POST /api/cinq/documents/batch-fetch` document fetching strictly bounded to 100 IDs per chunk, explicitly handling `410 Gone` tombstones).

### 5.8 VAULT (Inventory & Stock)
**Features:** Product/variant management, real-time stock, alerts.
**Architecture:**
*   `vault` schema (`unio_vault_role`). `stock_movements` audit trail.
*   **Concurrency Control:** `UPDATE variants SET stock_quantity = stock_quantity + $1 WHERE id = $2 AND stock_quantity + $1 >= 0`. Atomic conditional update.

### 5.9 PAUSE (HR & Leave)
**Features:** Leave requests, balances, approvals, DSN export.
**Architecture:**
*   `pause` schema (`unio_pause_role`). Two-step approval.
*   **GDPR Compliance:** Anonymizes PII on `tenant.deleted` while preserving 5-year legal retention.

### 5.10 VISTA (Analytics & BI)
**Features:** Dashboards, charts, alerts, exports.
**Architecture:**
*   `vista` schema (`unio_vista_role`). Event-Sourced Read Model.
*   **Partitioned ClickHouse OLAP Offload:** Events consumed from NATS (`UNIO_EVENTS`). Semantic validation strictly enforced at the consumer layer.
*   **Strict Monotonic Versioning:** Consumer utilizes the Postgres `outbox_events.id` as the strictly monotonic `outbox_id`.
*   **Partitioned Serialized Ingestion:** Valid events pushed to `UNIO_OLAP_BUFFER` JetStream stream partitioned by `tenant_id` hash. N `ClickHouseWriter` consumers drain their partitions, executing synchronous inserts bounded by `tokio::time::timeout(5s)`. On timeout, the batch is NACKed with exponential backoff. If retries exhaust, the batch is routed to `UNIO_OLAP_RETRY` and the original buffer message is ACKed. Hot-tenants dynamically routed to dedicated partitions.
*   **Pre-Computed Materialized View Deduplication:** Dashboards query an `AggregatingMergeTree` materialized view targeting the `ReplacingMergeTree(outbox_id)` raw table. Zero `FINAL` clauses, zero massive multi-column `argMax` projections on read.

### 5.11 UNIO-ADMIN (Global Operations & DLQ Management)
**Features:** Global DLQ inspection, manual event replay.
**Architecture:**
*   `unio-admin` infrastructure domain mapped to `unio_core` schema. Uses `unio_admin_service_account` DB role explicitly granted `BYPASSRLS` at the database level for cross-tenant operations. 
*   **DLQ Inspection API:** `GET /api/admin/dlq` consumes the `UNIO_DLQ` JetStream stream with pagination. Displays `validation_error` string.
*   **Non-Destructive Bounded DLQ Replay API:** `POST /api/admin/dlq/{event_id}/replay` extracts payload and old `trace_context`. Rejects events where `replay_count >= 3`. Generates a **new** `traceparent` for the event. Stores the old `traceparent` in the `links` JSONB array. Re-inserts into `unio_core.outbox_events` via `SECURITY DEFINER` function. ACKs the message from the `UNIO_DLQ` stream.

---

## 6. PRODUCT MANAGEMENT, OBSERVABILITY & COMPLIANCE

### 6.1 Data Protection & Retention
*   **Soft Delete:** `deleted_at` timestamp. Restorable for 7 days.
*   **Hard Delete:** Cron purges 30 days post-suppression.
*   **Database-Native Outbox Retention:** Outbox table partitioned by day. `pg_partman` strictly handles dropping partitions older than 7 days. 
*   **Idempotency Key Purge:** Completed/Cancelled/DLQ'd records purged after 30 days.
*   **Audit Logs:** Append-only, hash-chained. 30/90 days. Never deleted.
*   **Encryption:** AES-256-GCM at rest, TLS 1.3 in transit, Managed KMS for application-layer secrets.

### 6.2 Security Assessment
*   **Auth:** OIDC SSO, MFA, lockout. Strict fail-closed (`503`) on Redis outage.
*   **App Security:** SAST scanning, rate limiting, strict RLS verification in integration tests. Infrastructure tables explicitly verified to enforce RLS and rely only on narrowly-scoped `unio_admin_service_account` DB role for administrative bypass.
*   **Infrastructure:** Cloudflare DDoS, daily backups (Neon + R2).
*   **KMS Boundary:** Raw KMS API access strictly confined to `unio-crypto`. Verified via dependency graph.

### 6.3 Observability Runbooks
*   `unio_outbox_relay_lag_total > 1000 for 5m: Critical`
    *   *Runbook:* Check if `unio-event-worker` process is alive. Check `unio_relay_direct_pool` connection state. Check `drain_outbox()` query latency in Postgres. Check NATS `UNIO_EVENTS` stream publish latency.
*   `unio_search_backlog_size_total > 5000 for 5m: Critical`
    *   *Runbook:* Check `unio-search` pod health. Check Quickwit cluster API responsiveness (5xx errors). Check NATS redelivery rate.
*   `unio_nats_dlq_events_total > 0 for 1m: Warning`
    *   *Runbook:* Inspect `validation_error` field in `UNIO_DLQ` stream via `GET /api/admin/dlq`. Determine if structural (bad serde) or semantic (missing tenant_id). Patch producing domain.
*   `unio_olap_retry_depth_total > 10000 for 5m: Critical`
    *   *Runbook:* Check ClickHouse cluster health. Check `ClickHouseWriter` consumer memory/CPU. Look for `Too many parts` exceptions in `unio-data-worker` logs.
*   `unio_consumer_inactive_total > 0 for 5m: Critical`
    *   *Runbook:* Domain consumer is bricked. Check NATS connection state. Check for tight NACK loops in logs. Restart affected `unio-event-worker` binary.
*   `nats_jetstream_disk_usage > 8GB: Critical`
    *   *Runbook:* JetStream disk approaching 10GB limit. Check for stuck `UNIO_DLQ` messages. Check `pg_partman` outbox retention success. Manually purge old DLQ messages if retention policy failed.
*   `unio_idempotency_lock_timeouts_total > 0 for 1m: Warning`
    *   *Runbook:* High contention on idempotency keys. Check for stuck `unio_core.jobs` (heartbeat > 30s). Check Postgres lock contention (`pg_locks`).
*   `unio_vps_cpu_throttling_total > 0 for 1m: Warning`
    *   *Runbook:* VPS CPU saturation. Check `systemd` `CPUQuota` allocations. Consider splitting `unio-data-worker` to a separate VPS earlier than Phase 2.

---

## 7. GO-TO-MARKET & COMPETITIVE ANALYSIS

### 7.1 Core Differentiators (The "Unio" Promise)
1.  **Human Support (SLA 24h):** No bots.
2.  **Zero Lock-in:** 1-click cancellation and full CSV/JSON export.
3.  **Transparent Pricing:** Flat $49/mo, no per-user fees, no task limits.
4.  **Native Integrations:** 10 apps communicating via an internal outbox/event bus.

### 7.2 Acquisition Pipeline
*   **ICP:** 10-200 employees, SaaS/E-commerce/Services.
*   **Channels:** Organic (SEO, Reddit, HN). Paid ($200-300/mo).
*   **Pipeline:** Direct conversations via automated pipeline. Target: 50 demos -> 20% conversion -> 10 paying customers.

### 7.3 Unit Economics & Break-Even Analysis
*   **Infrastructure Costs (Phase 1):**
    *   32GB Hetzner VPS: ~$30/mo
    *   Managed ClickHouse: ~$150/mo
    *   Quickwit 3-node cluster: ~$45/mo
    *   Neon PostgreSQL: ~$50/mo
    *   Total fixed infrastructure: ~$275/mo
*   **Break-Even Point:** At $49/mo per tenant, exactly **6 paying tenants** are required to cover fixed infrastructure costs.
*   **Gross Margin Target:** At 50 paying tenants ($2,450/mo MRR), variable costs (payment processing, human support time allocation) are estimated at $500/mo. Gross margin targets 80%+.

---

## 8. DEFINITIVE TECH STACK & FRONTEND BOUNDARIES

### 8.1 Backend (Rust)
*   **Runtime:** Rust 1.75+, Tokio 1.36+
*   **Web Framework:** Axum 0.7+, Tower 0.4+
*   **Database & ORM:** Neon PostgreSQL 16, **Supavisor (PgBouncer) in Transaction Mode**. `sqlx` 0.8+ configured for protocol-level prepared statement compatibility. Idiomatic `DomainRepository` trait returning a `TenantTransaction` wrapper. Strictly isolated `unio_auth_db_pool` (20), `unio_domain_db_pool` (35, guarded by global `Semaphore(30)` and per-domain `Semaphore(10)`, enforcing `statement_timeout=5s`), `unio_dial_db_pool` (35), `unio_dial_listen_pool` (4, bypasses Supavisor), and `unio_relay_direct_pool` (4, bypasses Supavisor).
*   **Event Queue:** **NATS JetStream**. Postgres Transactional Outbox relayed to NATS via Instant Wake-Up Listener. Native work-stealing, backpressure, Ack/Nack redelivery, Unified DLQ stream, OLAP Buffer stream, Search DLQ stream, and OLAP Retry stream. All DLQ/Retry streams strictly enforce `max_age: 7d`, `max_bytes: 1GB`, and global `max_file_storage=10GB`. Exponential delayed NACKs (1s, 2s, 5s, 15s, 30s) strictly enforced. 
*   **OLAP Analytics:** **Managed ClickHouse**. Isolated instance for VISTA. `ReplacingMergeTree(outbox_id)` raw table with `AggregatingMergeTree` materialized views for pre-computed deduplication. Events routed through partitioned `UNIO_OLAP_BUFFER` stream drained by N partitioned `ClickHouseWriter` consumers. Hot-tenants dynamically isolated. Inserts strictly bounded by `tokio::time::timeout(5s)`. 
*   **Auth & Security:** jsonwebtoken, oauth2, totp-rs, argon2, `unio-crypto` (envelope encryption, KEK cache), `unio-kms` trait, `unio-aws-kms` implementation. Strict fail-closed (`503`) on Redis outage for JWT revocation.
*   **Search:** **Quickwit** (Distributed search cluster). `unio-search` client binary is strictly stateless. Natively relies on NATS exponential delayed NACKs for backpressure.
*   **Real-Time:** Postgres `LISTEN/NOTIFY` (DIAL WebSocket ephemeral fan-out, immediate `ERROR` logging and non-blocking `tokio::sync::broadcast` `service_degraded` fan-out on `LISTEN` failure, WebSocket resync protocol strictly executing direct read-only `sqlx` queries bounded by per-tenant `Semaphore(5)`, client-side sequence-based gap detection augmented by 5s WebSocket Ping/Pong heartbeat, O(1) Cold-Start Hydration strictly inside a read-only transaction using direct Postgres connections). Direct WebSocket ingestion (zero proxy hops).
*   **Logging:** Tracing 0.1+ -> JSON files -> Vector. Trace context propagated via `unio_telemetry::spawn_traced` using `outbox_id` routing and OTel Span Links for DLQ replays. HTTP `traceparent` headers strictly validated and linked to server-side root spans.
*   **Idempotency:** Redis `SET NX EX 30` lock guards DB pool *exclusively* for requests bearing an `Idempotency-Key` header. If Redis is unavailable, API strictly fails closed (`503 Service Unavailable`) for those requests. Postgres `UNIQUE(tenant_id, key)` constraint and `SELECT ... FOR UPDATE` safely serializes slip-throughs. Explicit Rust state machine with 5-second heartbeat-based job lifecycle tracking (30s death threshold). `425 Too Early` with `Retry-After: 5` on duplicate races.

### 8.2 Frontend (React) & Strict Micro-Frontend Modularity
*   **Runtime:** Node.js 20 LTS, pnpm 8, TypeScript 5.9
*   **Framework:** React 18/19, Vite 8 (Rolldown) + `@originjs/vite-plugin-federation`
*   **UI & Styling:** Tailwind CSS 3.4/4, shadcn/ui (strictly semantically versioned)
*   **Routing & Data:** TanStack Router, TanStack Query (one instance per remote module), Zustand (scoped per remote module), TanStack Virtual
*   **Micro-Frontend Architecture & State-Safe Boundaries:**
    *   **Root Shell (`unio-shell`):** Handles global auth, layout, top-level routing. Mounts remote modules dynamically. Routes `postMessage` events. **Zero domain state tracking.**
    *   **Remotes:** 10 apps compiled into strictly isolated, independently built, lazy-loaded Vite applications.
    *   **Tombstone-Aware Strict Sequential Background Cursor-Based State-Event Sync:** Apps communicate strictly via a typed `window.dispatchEvent` Event Bus. When a remote module mounts, it calls its domain-specific sync endpoint. The frontend strictly applies event payloads sequentially. If an event references a missing document, the domain event queue strictly pauses. A background async process fetches these via domain-specific endpoints with a JSON payload strictly bounded to 100 IDs per chunk. 
    *   **Tombstone & Retry Semantics:** If a chunk-fetch fails due to network issues, it retries 3 times with exponential backoff. If all retries fail, it surfaces a UI error and halts the queue. If the endpoint returns `410 Gone` for specific document IDs, the frontend strictly applies a local deletion tombstone and resumes the queue. 
    *   **End-to-End Tracing:** TanStack Query interceptors strictly generate and inject W3C `traceparent` headers. `unio-api` validates format and prepends server-side root span. `unio-dial-realtime` generates server-side trace spans strictly based on authenticated connection ID.
    *   **Error Boundaries:** Every app remote route wrapped in dedicated React Error Boundary.
    *   **State Isolation:** Global UI state (auth, theme) uses root Zustand store. Domain state uses scoped Zustand stores within lazy chunks.
*   **Feature-Specific:** BlockNote (PIVOT), SurveyJS (SOND), assistant-ui (DIAL), React Flow (SPARK), @ilamy/calendar (TEMPO/PAUSE), react-email (CINQ).

---

## 9. MASTER BUILD SEQUENCE (DAG)

### Phase 1 — Foundation (Months 1-3)
| App | Duration | Dependencies | Key Deliverables |
|-----|----------|--------------|------------------|
| **AEGIS** | 6 weeks | None | SSO OIDC, MFA, Vault, JWKS, Postgres Native RLS helpers, `unio-kms` trait, `unio-crypto` crate, `unio_core.tenant_keys`, `unio_core.idempotency_keys` (UNIQUE + RLS + Explicit Rust State Machine + `425 Too Early` duplicate race + `unio_admin_service_account` DB role with `BYPASSRLS`), `unio_core.jobs` (5-second heartbeat tracking, 30s death threshold), `unio_core.outbox_events` (Daily Partitioned via `pg_partman` + Strict `idx_outbox_status_id` index + `replay_count`), `SECURITY DEFINER` outbox insert function (NULL guard), Dedicated Auth Pool (20 conns), Direct Relay Pool (4 conns, bypass Supavisor), Global/Per-Domain Semaphores, `statement_timeout` enforcement, Fail-closed Redis JWT revocation, Scoped Idempotency (`Idempotency-Key` header check), Idiomatic `DomainRepository` trait returning `TenantTransaction` wrapper, Standard `ApiError` contract |
| **PIVOT** | 6 weeks | AEGIS | Databases, views, docs, Quickwit cluster deployment, `unio-search` client (Strictly stateless NATS consumer, exponential delayed NACKs, `UNIO_SEARCH_DLQ` routing), Instant Wake-Up Relay (NATS redelivery, `CancellationToken` + `abort()`, Unified JetStream DLQ routing with strict stream retention limits, `trace_context` injection), Strict Domain API isolation (`/api/pivot/sync`, `/api/pivot/documents/batch-fetch` bounded to 100 IDs per chunk, `410 Gone` tombstone responses) |
| **TEMPO** | 6 weeks | AEGIS | Booking pages, calendar sync, `CryptoService` DI consumption, `CancellationToken` integration |
| **SOND** | 6 weeks | AEGIS | Form builder, conditional logic, responses, Outbox emission |

### Phase 2 — Communication & Automation (Months 4-5)
| App | Duration | Dependencies | Key Deliverables |
|-----|----------|--------------|------------------|
| **DIAL** | 6 weeks | AEGIS, PIVOT | WebSocket chat, Direct WebSocket ingestion (zero proxy hops), Native Postgres `LISTEN/NOTIFY` Fan-Out (`unio_dial_listen_pool` bypassing Supavisor), Client-side sequence-based gap detection with 5-second WebSocket Ping/Pong heartbeat, `unio-dial-realtime` binary strictly owning `dial` schema, O(1) Cold-Start Hydration strictly inside read-only transaction (TOCTOU eliminated), Direct Read Resync via `unio_dial_db_pool` bounded by per-tenant `Semaphore(5)`, jittered retry-after, Server-side OTel span generation strictly based on connection ID |
| **SPARK** | 6 weeks | AEGIS, PIVOT, DIAL | Trigger-action, Postgres Outbox -> NATS JetStream Relay integration, webhooks, `unio-jobs` crate (5-second heartbeats, 30s threshold), Flawless DB-Native `UNIQUE(tenant_id, key)` + `SELECT FOR UPDATE` Database-enforced idempotency |

### Phase 3 — Business Apps (Months 6-8)
| App | Duration | Dependencies | Key Deliverables |
|-----|----------|--------------|------------------|
| **CINQ** | 6 weeks | AEGIS, SPARK | 5-stage pipeline, email OAuth (`CryptoService` DI), leads, `unio_contracts::events` emission, Frontend `postMessage` Event Bus + Tombstone-Aware Strict Sequential Background Catch-Up Queue integration (targeted missing document fetching via `POST /api/cinq/documents/batch-fetch` bounded to 100 IDs per chunk, 3-retry exponential backoff for network errors, `410 Gone` tombstone handling and queue resume, strict `updated_at_event_id` check) |
| **VAULT** | 6 weeks | AEGIS, CINQ | Products, atomic lockless stock SQL, alerts |
| **PAUSE** | 6 weeks | AEGIS | Leave requests, DSN export, GDPR anonymization |
| **VISTA** | 6 weeks | All apps | Event-sourced read model, NATS shared Pull Consumer, Semantic payload validation at consumer layer, Strict Monotonic Versioning via Postgres `outbox_id`, Partitioned `UNIO_OLAP_BUFFER` JetStream stream (`tenant_id` hash), N partitioned `ClickHouseWriter` consumers, Hot-tenant dynamic partition isolation, `UNIO_OLAP_RETRY` routing on `Err(FlushTimeout)`, `ReplacingMergeTree(outbox_id)` raw table, `AggregatingMergeTree` materialized view for pre-computed dashboard aggregates |
| **UNIO-ADMIN**| 3 weeks | AEGIS | Global DLQ inspection API, non-destructive bounded replay endpoint (rejects `replay_count >= 3`, generates new `traceparent`, links old via Span Links, ACKs DLQ msg), utilizes `unio_admin_service_account` DB role |

### Success Criteria
*   All 10 apps pass QA (test coverage ≥ 80%).
*   Strict Postgres Native RLS and Role-Based Schema isolation verified. Cross-tenant admin operations strictly use `unio_admin_service_account` DB role.
*   Five Rust binaries running on 32GB Hetzner VPS with `MemoryMax` and `CPUQuota` limits strictly enforced.
*   Zero database connection pool exhaustion. Pools strictly isolated (`unio_auth_db_pool` (20), `unio_domain_db_pool` (35, global `Semaphore(30)`, per-domain `Semaphore(10)`, `statement_timeout=5s`), `unio_dial_db_pool` (35), `unio_dial_listen_pool` (4, bypass Supavisor), and `unio_relay_direct_pool` (4, bypass Supavisor)).
*   Zero `Deref` anti-patterns. `TenantTransaction` explicitly implements `commit(self)` and exposes `conn()`.
*   Postgres Outbox -> NATS JetStream relay latency p99 < 50ms.
*   Zero duplicate event execution.
*   Zero duplicate job submissions (Scoped Redis lock or fail-closed `503` on header presence, Postgres constraint, explicit Rust state machine, 30s crash-safe heartbeat recovery).
*   Zero false `409 Conflict` rejections (Advisory lock timeouts strictly return `425 Too Early`).
*   Zero `503` false negatives for standard user requests (API strictly fails closed only for `Idempotency-Key` bearing requests and auth revocation).
*   No poison messages bricking domains (Task panics Nack the NATS message; validation failures route to Unified JetStream DLQ and ACK).
*   No infinite Supervisor restart loops (Exponential delayed NACKs: 1s, 2s, 5s, 15s, 30s).
*   No zombie tasks or resource leaks (Supervisor triggers `CancellationToken` on timeout, forcefully calls `abort()` if task persists).
*   No direct RPC calls or domain-to-domain Cargo dependencies. `unio-dial-realtime` strictly owns the `dial` schema and ingests directly via WebSocket. Zero proxy hops.
*   No VISTA lock contention or hot-tenant skew (Partitioned `UNIO_OLAP_BUFFER` by `tenant_id` hash drained by N `ClickHouseWriter` consumers; hot-tenants dynamically isolated).
*   No ClickHouse `Too many parts` crashes (Partitioned serialized synchronous inserts).
*   No ClickHouse data loss on worker panic or timeout (Consumer explicitly NACKs on timeout; routes batch to `UNIO_OLAP_RETRY` stream).
*   No VISTA double-counting or CPU-melting reads (`AggregatingMergeTree` materialized view pre-computes aggregates natively).
*   No trace context loss across async job boundaries, DLQs, browser actions, or WebSocket resync payloads. Zero client-spoofed trace contexts.
*   No silent data loss during domain outages (outbox retention handled via `pg_partman`).
*   No NATS disk exhaustion (all DLQ/Retry streams enforce `max_age: 7d`, `max_bytes: 1GB`; global `max_file_storage=10GB`).
*   No destructive DLQ loops (Admin replay copies event with new ID, rejects `replay_count >= 3`).
*   No frontend cross-app crashes or permanent state desync (Vite Module Federation isolates route chunks; Strict Sequential Background Catch-Up Queue).
*   No frontend OOM on module mount (State-Event Sync endpoint utilizes cursor-based pagination; background async queue fetches missing documents without UI blocking).
*   No frontend HTTP 414/413 errors (missing documents fetched strictly via domain-specific `POST` endpoints with JSON body bounded to 100 IDs per chunk).
*   No frontend event queue deadlocks on deleted documents (`410 Gone` responses strictly trigger local tombstone application and queue resume).
*   No frontend stale state overwrites (remote modules strictly apply all events > `local_last_seen_event_id` sequentially, pausing domain queue if a document is missing, fetching in chunks with 3 retries, and only merge absolute state if `updated_at_event_id` >= local document version).
*   No Root Shell God State (remote modules strictly handle their own domain reconciliation).
*   No DIAL false negatives from worker lag (`unio-dial-realtime` executes direct read-only DB queries for absolute Postgres truth).
*   No DIAL cold-start data loss or O(N) full table scans (`unio-dial-realtime` strictly hydrates `last_message_id` map via O(1) lookup inside a read-only transaction using direct Postgres connections).
*   No DIAL thundering-herd on resync (Per-tenant `Semaphore(5)` with jittered retry-after).
*   No raw KMS API access in domain crates (verified by dependency graph analysis; domains depend on `unio-crypto`).
*   No compound SQL string concatenation for GUC injection or idempotency keys.
*   No Tantivy file-lock bottlenecks (migrated to distributed Quickwit cluster).
*   No stateful worker hacks (Unified NATS JetStream DLQ stream replaces local SQLite; workers remain 100% stateless).
*   No O(n²) outbox purge locks or WAL bloat (Outbox is daily partitioned via `pg_partman`).
*   No `unio-search` actor memory leaks (Eradicated LRU actor pool; semantic validation failures route to `UNIO_SEARCH_DLQ`).
*   No DIAL event loop blocking (Cascading failure prevention strictly uses non-blocking `tokio::sync::broadcast` channels).
*   No God-Binary coupling (workers strictly split into `unio-event-worker` and `unio-data-worker`).
*   No arbitrary TTL job stealing hacks (Jobs strictly tracked via 5-second heartbeats, 30s death threshold).
*   No cross-domain compute starvation (`statement_timeout` strictly enforced per domain).
*   Alerting thresholds strictly configured and runbooks attached.
*   Unit economics verified: Break-even achieved at 6 paying tenants.
