# 🏗️ ATAQU PROJECT — MASTER ARCHITECTURE & PROJECT SPECIFICATION (v145.0)

**Version:** 145.0 (Post-Research Update — Cross-Cutting Features)
**Date:** 2026-08-08
**Author:** Ataqu Architecture Team
**Brand Domain:** `ataqu.com`

> **ENGINEERING NOTE:** v145.0 incorporates findings from real-time social listening (Grok analysis of 200+ authentic founder/CTO/Ops posts). Four new cross-cutting features have been added to the MLP: **System Health & Observability** (P0), **Access Governance & Audit** (P0), **Onboarding Activation & Churn Prevention** (P1), and **Data Consolidation & Cross-App Dashboards** (P1). A **Changelog & Stability Policy** (P2) has also been added for operational trust. This version preserves all existing ADRs, database schemas, and architectural decisions while extending them to support these new operational features.

---

## 📑 TABLE OF CONTENTS

1. [Executive Summary & Product Strategy](#1-executive-summary--product-strategy)
2. [Core Architectural Decisions (ADRs)](#2-core-architectural-decisions-adrs)
3. [System Architecture & Database Strategy](#3-system-architecture--database-strategy)
4. [Security, Compliance & the PII Type-State](#4-security-compliance--the-pii-type-state)
5. [Shared Crates & Resilience Policies](#5-shared-crates--resilience-policies)
6. [Application & Service Specifications](#6-application--service-specifications)
7. [Observability, Metrics & Honest Durability](#7-observability-metrics--honest-durability)
8. [Definitive Tech Stack & Frontend Boundaries](#8-definitive-tech-stack--frontend-boundaries)
9. [Master Build Sequence](#9-master-build-sequence)
10. [Known Limitations & Explicit Trade-offs](#10-known-limitations--explicit-trade-offs)
11. [Review Findings Remediation Matrix](#11-review-findings-remediation-matrix)

---

## 1. EXECUTIVE SUMMARY & PRODUCT STRATEGY

### 1.1 Vision
Build **Ataqu**: a single Rust backend codebase powering a suite of 10 SaaS applications for SMBs, deployed as independent SPAs across subdomains. Built incrementally with a 26-week Phase 1 to prove unit economics on a single 8 GB VPS.

### 1.2 Revenue-First Product Strategy
- **Clone** the 80% of features that account for ~95% of daily usage.
- Deliver superior performance via natively compiled Rust and static SPA frontends.
- Flat-rate pricing below competitors; no per-seat fees.
- **Validate Early:** Deploy Minimal Viable AEGIS (OIDC SSO only) at Week 12, run strict `k6` load tests against the 8 GB VPS, and validate resource bounds before billing.
- **Operational Trust:** Differentiate through native observability (System Health), governance (Permission Matrix + Audit Log), and proactive onboarding (Activation Tracker) — features that eliminate the "silent failures" and governance chaos that plague fragmented stacks.

### 1.3 The 10-App Portfolio

| App | Subdomain | Clone of | Price |
|-----|-----------|----------|-------|
| AEGIS | `sso.ataqu.com` | 1Password + Okta | $3/mo |
| TEMPO | `schedule.ataqu.com` | Calendly | $9/mo |
| PIVOT | `docs.ataqu.com` | Notion + ClickUp | $15/mo |
| SOND | `forms.ataqu.com` | SurveyMonkey + Typeform | $15/mo |
| VAULT | `inv.ataqu.com` | Cin7 + Skubana | $29/mo |
| PAUSE | `hr.ataqu.com` | Personio + BreatheHR | $4/mo |
| DIAL | `chat.ataqu.com` | Slack + Intercom | $9/mo |
| SPARK | `auto.ataqu.com` | Zapier + Make | $19/mo |
| CINQ | `crm.ataqu.com` | HubSpot + Pipedrive | $15/mo |
| VISTA | `bi.ataqu.com` | Metabase + PowerBI | $9/mo |

**Bundles:** 10-app $49/mo, 5-app $29/mo, individual as above. Free tier with strict usage limits enforced by rate limiting.

### 1.4 Architectural Principles

| Principle | Enforcement |
|-----------|------------|
| **KISS** | Single binary, single Tokio runtime, single PostgreSQL instance, single transaction type (`sea_orm::DatabaseTransaction`). No microservices, no message queues, no Redis. |
| **DRY** | Unified SeaORM persistence with raw-SQL escape hatch. Single `IdempotencyGuard`. Single `OutboxDispatcher`. Generic `transactional_batch_insert` helper for all ingestion repos. |
| **Domain Purity** | Domain crates contain pure functions only: `Command + IdGenerator + Clock → Event`. No I/O, no transactions, no SQL, no system clock/RNG reads. All persistence and `SAVEPOINT` logic in infrastructure crates. |
| **Honest Durability** | Every durability claim is backed by a concrete mechanism. Moka is a hot cache. Durable responses live in PostgreSQL. JSONL spill uses atomic, non-overwriting file rotation processed exactly once. |
| **Bounded Resources** | Every cache, pool, and channel has an explicit capacity. Memory budget is calculated and verified. |
| **Hard Boundaries** | Bounded contexts are isolated natively by PostgreSQL Roles, Row Level Security (RLS), Column-Level Privileges, schema `ENUM`s, and sequence grants. |
| **Compile-Time Security** | PII redaction is enforced via newtypes implementing `Debug`/`Display` as `[REDACTED]`. JSON serialization is strictly restricted to the API layer via wrapper structs, preventing log leaks across the unified binary. |
| **🆕 Operational Observability** | Every critical background process (outbox, workflows, integrations) exposes health metrics via Prometheus. The System Health Dashboard provides a single pane of glass for operational status. |
| **🆕 Governance by Default** | All cross-app permissions are centralized in AEGIS. All actions are logged to `core.audit_logs`. Admins have a single view of who has access to what. |

---

## 2. CORE ARCHITECTURAL DECISIONS (ADRs)

### ADR-001: SeaORM for Models/Migrations + Raw SQL Escape Hatch + Dedicated sqlx Listener Pool

**Status:** Accepted.

**Context:** SeaORM's `sea-orm-migration` crate and `Entity` codegen save immense boilerplate for migrations and standard CRUD. The dual-model risk is real but manageable with strict guardrails. SeaORM does not support PostgreSQL's `LISTEN/NOTIFY`, so a small `sqlx::PgPool` is needed for the outbox dispatcher's `PgListener`.

**Decision:** The platform uses:

1. **SeaORM 2.0** for migrations, entity definitions, standard CRUD, and transaction management (`sea_orm::DatabaseTransaction`).
2. **Raw SQL via `Statement::from_sql_and_values`** on `sea_orm::DatabaseTransaction` for Postgres primitives (advisory locks, savepoints, `pg_notify()`, `FOR UPDATE SKIP LOCKED`, `SET LOCAL`).
3. **Dedicated `sqlx::PgPool`** (size 3) retained **only** for `sqlx::PgListener` in the outbox dispatcher. No transactions or CRUD.

**The Single Transaction Rule:** `sea_orm::DatabaseTransaction` is the **only** transaction object in the codebase. Passed by mutable reference (`&mut DatabaseTransaction`). Guarantees atomicity between SeaORM CRUD and raw SQL.

**Never use `execute_unprepared`:** Always use `Statement::from_sql_and_values` for query plan caching.

**Role-Based Isolation:** Dedicated DB role per bounded context. `dispatcher_role` has `SELECT` and column-level `UPDATE` on `core.outbox`. Domain roles have `INSERT` restricted by RLS.

**Connection Pools:**

| Pool | Type | Role | Max Connections | Purpose |
|------|------|------|----------------|---------|
| 6 domain pools | `sea_orm::DatabaseConnection` | Per-domain role | 5 each = 30 | HTTP requests + background tasks |
| 1 dispatcher pool | `sqlx::PgPool` | `dispatcher_role` | 3 | `PgListener` + outbox polling |
| 1 admin pool | `sea_orm::DatabaseConnection` | `admin_role` | 2 | CLI admin + migrations |
| **Total** | | | **35** | |
| PostgreSQL `max_connections` | | | **40` | 5 headroom |

---

### ADR-002: Unified Transactional Outbox in `core.outbox` with RLS, Column-Level Privileges, Schema ENUM, & Sequence Grants

**Status:** Accepted.

**Context:** v136.0 unified the outbox but used unbounded `TEXT` for the `schema` column. A developer typo would silently fail the RLS policy. Furthermore, v137.0 granted blanket `UPDATE` to `dispatcher_role`, allowing payload tampering. v140.0 forgot to grant `USAGE` on the `outbox_id_seq` sequence, meaning domain roles could not insert rows with `BIGSERIAL` IDs.

**Decision:** A single, unified `core.outbox` table serves all domains. The `schema` column is an **`ENUM`**. RLS enforces domain boundaries. Column-level privileges prevent dispatcher payload tampering. **Sequence privileges are explicitly granted.**

**Unified Outbox Table Schema:**
```sql
CREATE TYPE app_schema AS ENUM ('core', 'collab_crm', 'collab_ops', 'vault', 'dial', 'vista');

CREATE TABLE core.outbox (
    id BIGSERIAL PRIMARY KEY,
    schema app_schema NOT NULL,      -- Type-safe ENUM
    event_type TEXT NOT NULL,
    aggregate_id UUID,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    priority TEXT NOT NULL DEFAULT 'normal',
    attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    vista_consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_outbox_dispatch ON core.outbox (status, locked_until, id)
    WHERE status = 'pending';
CREATE INDEX idx_outbox_priority ON core.outbox (priority, status, locked_until)
    WHERE status = 'pending';
CREATE INDEX idx_outbox_vista ON core.outbox (vista_consumed_at, status, schema)
    WHERE vista_consumed_at IS NULL AND status IN ('completed', 'dlq');
```

**Permissions, RLS, Column-Level Security & Sequence Grants:**
```sql
ALTER TABLE core.outbox ENABLE ROW LEVEL SECURITY;

-- Domain roles can only INSERT rows matching their schema
GRANT INSERT ON core.outbox TO core_role;
CREATE POLICY outbox_core_insert ON core.outbox FOR INSERT TO core_role WITH CHECK (schema = 'core');

GRANT INSERT ON core.outbox TO cinq_role;
CREATE POLICY outbox_cinq_insert ON core.outbox FOR INSERT TO cinq_role WITH CHECK (schema = 'collab_crm');

-- ... (ops, vault, dial, vista policies)

-- Explicitly grant sequence privileges to domain roles for BIGSERIAL inserts
GRANT USAGE, SELECT ON SEQUENCE core.outbox_id_seq TO core_role, cinq_role, ops_role, vault_role, dial_role, vista_role;

-- Dispatcher role can SELECT all, but only UPDATE tracking columns (not payload/schema/event_type)
GRANT SELECT ON core.outbox TO dispatcher_role;
GRANT UPDATE (status, attempts, locked_until, completed_at, vista_consumed_at) ON core.outbox TO dispatcher_role;

CREATE POLICY outbox_dispatcher_select ON core.outbox FOR SELECT TO dispatcher_role USING (true);
CREATE POLICY outbox_dispatcher_update ON core.outbox FOR UPDATE TO dispatcher_role USING (true);
```

**Notification:** After inserting into `core.outbox`, the application issues `pg_notify('outbox_event', $1)` on the same SeaORM transaction.

**Dispatcher:** Uses a `sqlx::PgListener`. On notification, polls `core.outbox` using static SQL with `FOR UPDATE SKIP LOCKED`. After processing, updates `status = 'completed'`. After 5 failed attempts, `status = 'dlq'`.

---

### ADR-003: Native Rust Auth & Honest Durability

**Status:** Accepted. PostgreSQL uses `synchronous_commit = on` for all writes. WAL archiving to S3 via `wal-g` provides 1 s RPO.

---

### ADR-004: True Bounded Contexts — Sagas for Mutations, Event-Driven Projections for Reads

**Status:** Accepted. Cross-domain mutations are Sagas. Cross-domain reads are prohibited; event-driven projections update local read-models.

---

### ADR-005: Standard OCC with Resilient WebSocket Delta Pushes

**Status:** Accepted. All mutations require `If-Match` ETags. WebSocket replay buffers hold 1,000 sequenced deltas per tenant.

---

### ADR-006: Idempotency via Advisory Locks (2× int4) & Durable Response Storage

**Status:** Accepted.

**Context:** Hashing a 128-bit UUID into a 64-bit `bigint` causes collisions. Truncating 128 bits to 64 bits is a lossy operation with a collision probability of 2⁻⁶⁴. Returning `409 Conflict` on lock timeout implies resource conflict, not server congestion. Partitioning the idempotency table by day but querying by `command_id` scans all partition indexes. v140.0 failed to explicitly cast the `i32` values to `int4` in the raw SQL, risking SeaORM type inference mismatches.

**Decision:** All `POST`/`PUT`/`PATCH` requests **MUST** include an `Idempotency-Key` header, mapped to a deterministic `command_id` via `Uuid::new_v5`.

**Table Schema (Standard Unpartitioned Table):**
```sql
CREATE TABLE core.idempotency_records (
    command_id UUID PRIMARY KEY,
    status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'failed')),
    response_status SMALLINT,
    response_body JSONB,
    response_headers JSONB DEFAULT '{}'::jsonb,
    aggregate_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
```

**Advisory Lock (Negligible Collision Risk via 2× int4 Split & Explicit Cast):**
We split the UUID's first 64 bits into two 32-bit integers. **The raw SQL explicitly casts the parameters to `int4`** to prevent the driver from inferring `int8` and failing to find the function signature.
```rust
fn split_uuid_to_int4_pair(uuid: &Uuid) -> (i32, i32) {
    let bytes = uuid.as_bytes();
    let high = i32::from_be_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]);
    let low = i32::from_be_bytes([bytes[4], bytes[5], bytes[6], bytes[7]]);
    (high, low)
}
```
```sql
-- Executed via Statement::from_sql_and_values on sea_orm::DatabaseTransaction
SELECT pg_advisory_xact_lock($1::int4, $2::int4);
```
**Honest Math:** Probability of collision is **2⁻⁶⁴** (1 in 18.4 quintillion). Not zero, but negligible. Impact is limited to 10-second blocking.

**Idempotency Flow:**
1. Moka Cache Check (hot path).
2. `BEGIN TRANSACTION`. `SET LOCAL statement_timeout = '10s'`. `SELECT pg_advisory_xact_lock($1::int4, $2::int4)`.
   - Timeout → `503 Service Unavailable` + `Retry-After: 5`. Log `command_id` + lock keys.
3. `SET LOCAL statement_timeout = '5s'`. `SELECT status, response_body... FROM core.idempotency_records`.
   - If `completed` → COMMIT, return cached.
   - If `failed` → COMMIT, return `409 Conflict`.
   - If `in_progress` → stale. DELETE, proceed as leader.
4. `INSERT INTO core.idempotency_records (status='in_progress')`.
5. `SAVEPOINT domain_op`. Call domain pure function (with injected `IdGenerator` + `Clock`). Persist events. Append to `core.outbox`. `pg_notify`.
   - Success → `RELEASE SAVEPOINT`. `UPDATE status='completed'`. COMMIT. Insert into Moka.
   - Transient → `ROLLBACK TRANSACTION`. Return 500/503.
   - Validation → `ROLLBACK TO SAVEPOINT`. `UPDATE status='failed'`. COMMIT. Return 422.

**Moka Cache:** Max 10,000 entries. 7-day TTL. Weigher based on serialized size. Peak ~20 MB.

---

### ADR-007: Compile-Time PII Redaction via Redacting Newtypes & API-Layer Serialization Wrappers

**Status:** Accepted.

**Context:** v139.0 proposed a custom `tracing` layer to intercept and redact fields by name. This destroys structured logging and murders performance. v140.0 shifted to compile-time newtypes, but explicitly implemented `Serialize` to output the real string. v141.0 attempted to gate `Serialize` behind an `api-serialize` Cargo feature flag. However, Cargo features are additive and unified across a dependency graph. When `ataqu-api` enables the feature, the entire binary (including `ataqu-application` and `ataqu-domain`) compiles `ataqu-security` with that feature enabled. The `Serialize` impl would be visible to all crates, allowing accidental plaintext serialization in logs via `serde_json::to_value(&payload)`.

**Decision:** PII redaction is enforced at compile-time using **redacting newtypes**. PII fields are wrapped in domain newtypes (e.g., `Email`, `PhoneNumber`, `Ssn`) that explicitly implement `fmt::Debug` and `fmt::Display` to output `[REDACTED]`. 

Crucially, **PII newtypes in `ataqu-security` do not implement `serde::Serialize` at all.** This guarantees that `serde_json::to_string(&email)` fails to compile everywhere in the binary. To serialize PII for HTTP responses, the `ataqu-api` layer defines **wrapper structs** (e.g., `ApiEmail<'a>`) that implement `Serialize` by calling `reveal(&key)` on the inner PII newtype. This absolutely restricts JSON serialization to the API layer.

To access the inner string for encryption (infra) or serialization (API), the newtype exposes a `reveal()` method gated by the `PiiAccessKey` capability token.

**Implementation (`ataqu-security`):**
```rust
pub trait PiiValue: Sized {}

pub struct Email(String);
impl PiiValue for Email {}

impl Email {
    pub fn new(value: String) -> Self { Self(value) }
    pub fn reveal(&self, _key: &PiiAccessKey) -> &str { &self.0 }
}

// Explicitly redacting implementations
impl std::fmt::Debug for Email {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "[REDACTED]")
    }
}
impl std::fmt::Display for Email {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "[REDACTED]")
    }
}

// NO Serialize impl here. 
// serde_json::to_string(&email) will fail to compile across the entire binary.
```

**Implementation (`ataqu-api`):**
```rust
use ataqu_security::{Email, PiiAccessKey};
use serde::Serialize;

// API-layer wrapper struct for serialization
pub struct ApiEmail<'a>(pub &'a Email);

impl<'a> Serialize for ApiEmail<'a> {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where S: serde::Serializer {
        // API layer possesses the PiiAccessKey
        let key = PiiAccessKey::new(); 
        serializer.serialize_str(self.0.reveal(&key))
    }
}
```

**Flow:**
- **API Layer:** Deserializes JSON into `String`, constructs `Email`. For HTTP responses, wraps `Email` in `ApiEmail` and serializes normally.
- **Application/Domain Layer:** Passes `Email` around. If logged via `tracing`, outputs `[REDACTED]`. Attempting `serde_json::to_string(&email)` fails to compile.
- **Infrastructure Layer:** Calls `email.reveal(&key)` to access the raw string for encryption-at-rest.

**Guarantee:** Zero-cost abstraction. No runtime performance penalty. Compile-time guarantee that PII newtypes cannot be accidentally logged in plaintext via `Debug` or `Serialize`. The API wrapper struct truly isolates serialization to the API boundary, defeating Cargo's feature unification.

---

### ADR-008: Admin Interface via UDS with Filesystem Permissions & Audit Logging

**Status:** Accepted. `ataqu-admin` CLI communicates via UDS (`0600`). Every admin command requires an admin token and writes a transactional audit event to `core.audit_logs` before executing.

---

### ADR-009: Asynchronous Search Indexing with PostgreSQL FTS

**Status:** Accepted. `tsvector` stored as a generated column to avoid trigger overhead. GIN indexes used.

---

### ADR-010: VISTA Aggregator with Stateful Cursor, DLQ Inclusion & Native LISTEN/NOTIFY

**Status:** Accepted. VISTA polls `core.outbox` where `vista_consumed_at IS NULL`. `sqlx::PgListener` wakes instantly.

---

### ADR-011: Edge Security & Mandatory Correlation IDs

**Status:** Accepted. CSRF, CORS allowlist, per-tenant token-bucket rate limiting. `X-Request-ID` (UUIDv7) propagated.

---

### ADR-012: Billing Isolation & Priority

**Status:** Accepted. Billing events in `core.outbox` with `priority = 'high'`.

---

### ADR-013: Pure Domain Model with Strictly Decoupled `Clock` and `IdGenerator`

**Status:** Accepted.

**Context:** Deriving `SystemTime` from the UUIDv7 timestamp truncates to milliseconds and introduces panic risks via `unwrap()`.

**Decision:** Strictly decouple the concerns. `IdGenerator` is **only** for UUIDs. `Clock` is **only** for high-precision `SystemTime`. Both are explicitly acknowledged as impure capabilities injected purely for testability.

**Traits (defined in `ataqu-kernel`, implemented in `ataqu-application`):**
```rust
/// Impure capability for generating UUIDs.
pub trait IdGenerator: Send + Sync {
    fn new_uuid_v7(&self) -> Uuid;
}

/// Impure capability for reading the system clock.
pub trait Clock: Send + Sync {
    fn now(&self) -> SystemTime;
}
```

**Domain Function Signature:**
```rust
pub fn create_contact(
    cmd: CreateContactCommand,
    id_gen: &impl IdGenerator,
    clock: &impl Clock,
) -> ContactCreatedEvent {
    let contact_id = id_gen.new_uuid_v7();
    let created_at = clock.now();  // High-precision SystemTime, no panic risk
    ContactCreatedEvent { id: contact_id, name: cmd.name, email: cmd.email, created_at }
}
```

---

### ADR-014: Chunked Batch Ingestion via Generic Helper (DRY, Identifiable, Transient-Safe, Clean Txn State, Full DLQ Payloads, Idiomatic Error Mapping)

**Status:** Accepted.

**Context:** v139.0's generic `transactional_batch_insert` helper failed to compile because it called `item.id()` on a generic `T: Send + Sync`. v140.0 fixed this but dropped the original item payload from the `DLQEntry`, making the DLQ useless. Furthermore, if a chunk failed due to a transient error, v140.0 returned `Err(e)` *before* issuing `ROLLBACK TO SAVEPOINT chunk_sp`, leaving the Postgres transaction in a poisoned state that broke the idempotency layer's cleanup logic. v141.0 attempted to fix the error mapping using `.into()` on an `Option`, which fails to compile because there is no `From` impl for `Option<&dyn Trait>`.

**Decision:** The `SAVEPOINT` logic is abstracted into a generic, DRY `transactional_batch_insert` helper. The helper requires `T: Identifiable + Clone`. If a chunk fails, the error is classified. **Crucially, `ROLLBACK TO SAVEPOINT chunk_sp` is executed *immediately* upon chunk failure, restoring the transaction to a usable state before any logic or return.** Transient errors return immediately (with a clean transaction). Data-level violations trigger the 1-by-1 fallback. The original item is **cloned** into the `DLQEntry` to preserve the payload. Error mapping uses idiomatic `Option::map` and `unwrap_or` chaining.

**Identifiable Trait (`ataqu-kernel`):**
```rust
pub trait Identifiable {
    fn id(&self) -> Uuid;
}
```

**Generic Helper (`ataqu-infra-repositories`):**
```rust
pub async fn transactional_batch_insert<T, F, Fut>(
    txn: &mut DatabaseTransaction,
    items: &[T],
    chunk_size: usize, // e.g., 100
    insert_fn: F,
) -> Result<BatchResult, sea_orm::DbErr>
where
    T: Identifiable + Clone + Send + Sync,
    F: Fn(&mut DatabaseTransaction, &[T]) -> Fut + Send + Sync,
    Fut: Future<Output = Result<(), sea_orm::DbErr>> + Send,
{
    let mut successes = Vec::new();
    let mut failures = Vec::new();

    for chunk in items.chunks(chunk_size) {
        txn.execute(Statement::from_sql_and_values(
            DbBackend::Postgres, "SAVEPOINT chunk_sp", [])).await?;

        match insert_fn(&mut *txn, chunk).await {
            Ok(_) => {
                txn.execute(Statement::from_sql_and_values(
                    DbBackend::Postgres, "RELEASE SAVEPOINT chunk_sp", [])).await?;
                successes.extend(chunk.iter().map(|i| i.id()));
            }
            Err(e) => {
                // FIX 1: Rollback to savepoint IMMEDIATELY to restore transaction state
                txn.execute(Statement::from_sql_and_values(
                    DbBackend::Postgres, "ROLLBACK TO SAVEPOINT chunk_sp", [])).await?;

                tracing::warn!(error = ?e, "Chunk insert failed, attempting classification");

                let db_err = extract_db_err(&e);
                let is_data_violation = matches!(db_err, Some(e) if 
                    e.is_unique_violation() || e.is_foreign_key_violation() || e.is_check_violation());

                if !is_data_violation {
                    // Transient error: transaction is clean, safe to return error to caller
                    return Err(e);
                }

                // Data violation: proceed 1-by-1 (transaction is already restored)
                for item in chunk {
                    txn.execute(Statement::from_sql_and_values(
                        DbBackend::Postgres, "SAVEPOINT item_sp", [])).await?;
                    match insert_fn(&mut *txn, std::slice::from_ref(item)).await {
                        Ok(_) => {
                            txn.execute(Statement::from_sql_and_values(
                                DbBackend::Postgres, "RELEASE SAVEPOINT item_sp", [])).await?;
                            successes.push(item.id());
                        }
                        Err(e) => {
                            txn.execute(Statement::from_sql_and_values(
                                DbBackend::Postgres, "ROLLBACK TO SAVEPOINT item_sp", [])).await?;
                            
                            // FIX 2: Idiomatic Option handling for error mapping
                            let repo_err = extract_db_err(&e)
                                .map(|db_err| RepositoryError::from(db_err))
                                .unwrap_or(RepositoryError::Unknown);

                            // FIX 3: Clone the item to preserve the DLQ payload
                            failures.push(DLQEntry::new(item.clone(), repo_err));
                        }
                    }
                }
            }
        }
    }
    Ok(BatchResult::partial(successes, failures))
}
```

**Error Mapping Helper:** Heavily unit-tested against Postgres error mocks.
```rust
pub fn extract_db_err(e: &sea_orm::DbErr) -> Option<&dyn sqlx::error::DatabaseError> {
    match e {
        sea_orm::DbErr::Query(sqlx::Error::Database(db_err)) => Some(db_err.as_ref()),
        _ => None,
    }
}
```

**Guarantee:** Domain layer is 100% pure. Worst-case fallback loop is bounded to `chunk_size` (100). Transaction state is never poisoned. Transient errors abort cleanly without DLQ pollution. DLQ entries contain the full original payload. Error mapping compiles idiomatic ally. DRY principle maintained.

---

### ADR-015: WAL-G Backup & Retention

**Status:** Accepted. `wal-g` 3.0.8 streams WAL to S3 (1 s RPO). Moderate autovacuum tuning (`scale_factor = 0.10`).

---

### ADR-016: Versioned CDC-Based Zero-Downtime Migration

**Status:** Accepted. Phase 2 uses outbox tailing with `upcast_v1_to_v2` functions.

---

### ADR-017: Pure Domain Model with Application-Layer Orchestration

**Status:** Accepted.

**Layer Boundaries:**
```
HTTP Request
    ↓
API Layer (ataqu-api)
    Parse HTTP, extract Idempotency-Key, map to command_id (UUIDv5)
    Check Moka cache → delegate to Application Layer
    ↓
Application Layer (ataqu-application)
    Acquire IdempotencyGuard (advisory lock + SeaORM transaction)
    Inject IdGenerator and Clock into domain pure function
    Call domain pure function → events
    Call repository to persist events (same txn)
    Append to core.outbox (same txn)
    Update idempotency record (same txn)
    Commit → release advisory lock
    ↓
Domain Layer (ataqu-domain-*)
    Pure functions: Command + IdGenerator + Clock → Event
    NO I/O, NO transactions, NO SQL, NO savepoints, NO system clock/RNG
    ↓
Infrastructure Layer (ataqu-infra-*)
    Repository implementations (SeaORM Entity::find() + raw SQL)
    Transaction & SAVEPOINT management (via generic helper on sea_orm::DatabaseTransaction)
    Outbox dispatch (sqlx::PgListener on dedicated pool)
```

---

### ADR-018: Single Tokio Runtime with Bounded Pools (35 Max Connections)

**Status:** Accepted.

**Connection Budget:**

| Pool | Type | Role | Max Connections | Purpose |
|------|------|------|----------------|---------|
| 6 domain pools | `sea_orm::DatabaseConnection` | Per-domain role | 5 each = 30 | HTTP requests + background tasks |
| 1 dispatcher pool | `sqlx::PgPool` | `dispatcher_role` | 3 | `PgListener` + outbox polling |
| 1 admin pool | `sea_orm::DatabaseConnection` | `admin_role` | 2 | CLI admin + migrations |
| **Total** | | | **35** | |
| PostgreSQL `max_connections` | | | **40` | 5 headroom |

**PostgreSQL Configuration:**
```sql
shared_buffers = 1GB;
effective_cache_size = 4GB;
work_mem = 2MB;              -- Safe for 35 concurrent connections
maintenance_work_mem = 64MB;
max_connections = 40;
synchronous_commit = on;
wal_buffers = 16MB;
checkpoint_completion_target = 0.9;
random_page_cost = 1.1;      -- NVMe storage
effective_io_concurrency = 200;
max_parallel_workers_per_gather = 2;
```

**Memory Budget (8 GB VPS):** Total allocated ~2.0 GB. Available for OS page cache ~6.0 GB. Safe.

---

### ADR-019: Structured JSON Logging with `copytruncate` Rotation

**Status:** Accepted. Dual `tracing-appender::non_blocking` layers. OS-level `logrotate` with `copytruncate`. PII redaction handled natively by newtype `Debug` impls and API-layer serialization wrappers (ADR-007).

---

### ADR-020: Post-Commit Atomic Fenced Leases

**Status:** Accepted. For SPARK automation, leases acquired with `BEGIN; UPDATE ... SET fence_token = fence_token + 1 WHERE ...; COMMIT;`.

---

### ADR-021: Transactional Audit Logging

**Status:** Accepted. Audit events in `core.audit_logs` inside the same `sea_orm::DatabaseTransaction`.

**🆕 Extension for Unified Audit Log:** The `core.audit_logs` table now supports cross-app audit logging with the following schema:

```sql
CREATE TABLE core.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    action TEXT NOT NULL,          -- e.g., 'login', 'create', 'update', 'delete', 'export', 'role_change'
    app TEXT NOT NULL,             -- e.g., 'cinq', 'dial', 'aegis'
    entity_type TEXT,              -- e.g., 'contact', 'deal', 'user'
    entity_id UUID,
    old_value JSONB,               -- For auditing changes (before)
    new_value JSONB,               -- For auditing changes (after)
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant ON core.audit_logs (tenant_id, created_at DESC);
CREATE INDEX idx_audit_logs_user ON core.audit_logs (user_id, created_at DESC);
CREATE INDEX idx_audit_logs_app ON core.audit_logs (app, created_at DESC);
```

---

### ADR-022: GDPR with Compiled Table Registry & CI Verification

**Status:** Accepted. Static registry compiled into `ataqu-domain-gdpr` at build time. CI test verifies coverage.

---

### ADR-023: VAULT Overflow Protection

**Status:** Accepted. `CHECK (stock_quantity >= 0)` constraint.

---

### ADR-024: Explicit TenantId Newtype (Private Field)

**Status:** Accepted. `pub struct TenantId(Uuid);` with private field.

---

### ADR-025: TEMPO OAuth Token Refresh Saga

**Status:** Accepted.

---

### ADR-026: Time-Based Scheduling with SKIP LOCKED & Deterministic Idempotency

**Status:** Accepted. `cron_worker` polls `core.scheduled_tasks` using `FOR UPDATE SKIP LOCKED`. Derives deterministic `command_id` via `UUIDv5`.

---

### ADR-027: Direct-to-Storage File Uploads with Chunked Orphan Reaper

**Status:** Accepted. Clients upload directly to S3 via presigned URLs. Orphaned files deleted after 24 hours.

---

### ADR-028: Presence via Trait (No Infrastructure Leaks)

**Status:** Accepted. `PresenceStore` trait operates purely on `TenantId` and `UserId`. Infrastructure layer maintains `ConnectionId` mapping internally.

---

### ADR-029: CSV Processing via Generic Infrastructure Batch Helper

**Status:** Accepted. `csv_importer_worker` calls pure domain function, then delegates to `transactional_batch_insert` (ADR-014) for chunked, timeout-safe, transient-safe persistence with full DLQ payloads.

---

### ADR-030: JSONB Custom Fields with Graceful Degradation & Rate Limiting

**Status:** Accepted.

**Context:** The Tier 3 cross-field search uses `jsonb_each_text` which is an O(n × keys) full table scan. Exposed to users, this is a DoS vector on the 8GB VPS.

**Decision:** Three-tier query strategy with explicit guards:

**Tier 1: Exact Match (Fast, Indexed)**
```sql
SELECT * FROM collab_crm.contacts WHERE custom_fields @> '{"status": "lead"}';
```
O(log n) lookup.

**Tier 2: Single-Field Text Search (Moderate, No Index)**
```sql
SELECT * FROM collab_crm.contacts WHERE custom_fields->>'company' ILIKE '%acme%';
```
O(n) scan, acceptable for < 100K rows.

**Tier 3: Cross-Field Search (Slow, Rate-Limited)**
```sql
SELECT * FROM collab_crm.contacts WHERE EXISTS (
    SELECT 1 FROM jsonb_each_text(custom_fields)
    WHERE value ILIKE '%search_term%'
);
```
O(n × keys) scan. **Strictly guarded by a per-tenant rate limit (e.g., 1 request per 10 seconds) and a result cap (e.g., `LIMIT 50`).** If abused, returns `429 Too Many Requests`.

---

### ADR-031: Email Tracking with Bounded Channel & Atomic File Rotation Spill (Processed Exactly Once)

**Status:** Accepted.

**Context:** v138.0 fixed the concurrent-append race by renaming `active` to `recovering`. However, the recovery code had a logic flaw that processed files twice, doubling I/O and database calls.

**Decision:** Email tracking uses a bounded `tokio::mpsc` channel (`capacity = 1000`). When full or DB write fails, events spill to `tracking_spill.jsonl` using **atomic, non-overwriting file rotation** with nanosecond timestamps + random UUIDs. The recovery logic processes files **exactly once**.

**Spill Architecture:**

```
┌─────────────────────────────────────────────────────────┐
│ Writer Thread (spill)                                   │
│  event arrives → open tracking_spill.jsonl (O_APPEND)   │
│  → write line → close fd                                │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ Recovery Task (every 60s if spill files exist)         │
│                                                         │
│ 1. Read dir. Collect all existing                      │
│    tracking_recovering_*.jsonl files into `files`.      │
│                                                         │
│ 2. If tracking_spill.jsonl exists:                      │
│    RENAME to tracking_recovering_<nanos>_<uuid>.jsonl   │
│    Add the new path to `files`.                         │
│                                                         │
│ 3. Process ALL files in `files` exactly once.           │
│    Batch insert into DB (ON CONFLICT DO NOTHING).       │
│                                                         │
│ 4. DELETE all processed files in `files`.               │
└─────────────────────────────────────────────────────────┘
```

**Recovery Code:**
```rust
pub struct EmailTrackingWriter {
    db_pool: DatabaseConnection,
    spill_dir: PathBuf,
    spill_max_size: u64,          // 10 MB combined
    channel: mpsc::Receiver<TrackingEvent>,
}

impl EmailTrackingWriter {
    async fn recover_spill(&self) -> Result<()> {
        let mut files_to_process = Vec::new();

        // 1. Collect existing recovering files
        let mut dir = tokio::fs::read_dir(&self.spill_dir).await?;
        while let Some(entry) = dir.next_entry().await? {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with("tracking_recovering_") && name.ends_with(".jsonl") {
                files_to_process.push(entry.path());
            }
        }

        // 2. Rename active to recovering with nanos + uuid (guaranteed non-overwriting)
        let active = self.spill_dir.join("tracking_spill.jsonl");
        if active.exists() {
            let ts = SystemTime::now().duration_since(UNIX_EPOCH)?.as_nanos();
            let id = Uuid::new_v4();
            let recovering = self.spill_dir.join(format!("tracking_recovering_{}_{}.jsonl", ts, id));
            tokio::fs::rename(&active, &recovering).await?;
            files_to_process.push(recovering);
        }

        // 3. Process all collected files EXACTLY ONCE
        for file in &files_to_process {
            self.process_file(file).await?;
        }

        // 4. Delete processed files
        for file in &files_to_process {
            tokio::fs::remove_file(file).await?;
        }

        Ok(())
    }

    async fn process_file(&self, path: &Path) -> Result<()> {
        // ... read lines, batch insert (ON CONFLICT DO NOTHING)
    }
}
```

**Metrics:** `spill_depth`, `spill_file_size_bytes`, `spill_total`, `dropped_total` (P1), `recovery_failed_total` (P0). 10 MB hard cap.

---

### ADR-032: No-Show Detection with Sargable Bounded Query

**Status:** Accepted. `ends_at TIMESTAMPTZ GENERATED ALWAYS AS (starts_at + duration) STORED`. 24-hour upper bound prevents full-table scans.

---

### ADR-033: SeaORM Entity Mapping Boundary

**Status:** Accepted. SeaORM `Model` and `ActiveModel` structs are **confined to the `ataqu-infra-repositories` crate**. Mapped to pure domain structs at the repository boundary. CI lint enforces.

---

### 🆕 ADR-034: System Health & Observability API (P0)

**Status:** Accepted.

**Context:** Research shows that "silent failures" (Zapier drops, API changes, cache staleness) are a top operational pain point. Founders and CTOs lose nights debugging workflows they didn't know were broken. The system must expose health metrics natively, not through external monitoring tools.

**Decision:** Expose a `/api/v1/health/status` endpoint that aggregates health metrics from all critical background processes. The endpoint returns a JSON payload with:

```json
{
  "status": "degraded" | "nominal" | "critical",
  "timestamp": "2026-08-08T10:00:00Z",
  "components": {
    "outbox": {
      "status": "nominal",
      "lag_seconds": 0.2,
      "pending_events": 0,
      "last_dispatched_at": "2026-08-08T09:59:58Z"
    },
    "spark_workflows": {
      "status": "degraded",
      "total": 12,
      "failed_last_hour": 1,
      "dlq_depth": 3
    },
    "integrations": {
      "cinq_to_dial": "nominal",
      "sond_to_cinq": "nominal",
      "vault_to_cinq": "degraded"
    },
    "db_connection_pools": {
      "used": 12,
      "max": 35,
      "waiting": 0
    }
  }
}
```

**Implementation:**
- `ataqu-api` exposes `GET /api/v1/health/status`.
- Metrics are collected from:
  - `core.outbox` (lag, pending count)
  - `spark.workflows` (failure counts, DLQ depth)
  - Connection pool stats from `ataqu-infra-pools`
  - Integration status via outbox event counts
- The endpoint caches results for 5 seconds (Moka) to avoid DB hammering.
- Frontend polls every 10 seconds (or uses SSE for real-time updates).

---

### 🆕 ADR-035: Permission Matrix & Unified Audit Log (P0)

**Status:** Accepted.

**Context:** Research shows that "searching five tools to find one answer is the actual daily pain… how do you deal with permissions across sources?" As teams grow (20+ employees), managing who has access to what becomes a nightmare. No unified view of roles/permissions. Audit trails are scattered.

**Decision:** Centralize all permission management in AEGIS with a cross-app permission matrix and a unified audit log.

**Permission Matrix Schema:**
```sql
CREATE TABLE core.permissions (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    app TEXT NOT NULL,          -- e.g., 'cinq', 'dial', 'vista'
    role TEXT NOT NULL,         -- e.g., 'admin', 'editor', 'viewer', 'none'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, user_id, app)
);

CREATE INDEX idx_permissions_tenant_user ON core.permissions (tenant_id, user_id);
CREATE INDEX idx_permissions_app ON core.permissions (app);
```

**API Endpoints:**
- `GET /api/v1/aegis/permission-matrix` → Returns a matrix: `{ users: [{ id, name, email, roles: { app: role } }] }`
- `PATCH /api/v1/aegis/permissions/:userId/:app` → Updates a user's role for a specific app.
- `GET /api/v1/aegis/audit-log` → Returns paginated, filterable audit events.

**Implementation:**
- The permission matrix query joins `core.users` with `core.permissions` and `core.audit_logs` for last activity.
- Frontend renders a virtualized table (TanStack Virtual) for performance.
- Permission changes are audited themselves (who changed what role, when).

---

### 🆕 ADR-036: Onboarding Activation & Progress Tracking (P1)

**Status:** Accepted.

**Context:** Research shows that "great product, customers complete onboarding… but six months later too many quietly disappear." — the silent churn. Users sign up, complete the initial setup, but never reach the "aha" moment. No feedback loop, no intervention.

**Decision:** Implement a persistent onboarding activation tracker with defined milestones, persistent state, and proactive interventions.

**Activation Tasks (5 per tenant):**
1. **Import Data:** Import at least 10 entities (contacts, deals, products, etc.)
2. **Native Integration:** Enable at least one native integration (CINQ→DIAL, SOND→CINQ, etc.)
3. **Create Workflow:** Create at least one SPARK workflow
4. **Invite Team:** Invite at least 2 team members
5. **Create Dashboard:** Create at least one VISTA dashboard

**Schema:**
```sql
CREATE TABLE core.onboarding_progress (
    tenant_id UUID PRIMARY KEY,
    tasks_completed JSONB NOT NULL DEFAULT '[]'::jsonb,  -- Array of task IDs
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**API Endpoints:**
- `GET /api/v1/onboarding/status` → Returns completed tasks and progress percentage.
- `POST /api/v1/onboarding/task-complete` → Marks a task as completed.
- `GET /api/v1/onboarding/team-status` → Returns activation status per team member (admin only).

**Implementation:**
- Frontend stores progress in Zustand (persisted) and syncs with backend.
- The Setup Progress widget in the Shell polls the status every 60 seconds.
- Inactivity detection: a background job marks tenants as "stale" after 7 days of inactivity. On next login, a toast appears: *"We noticed you've been away. Here's what changed in your workspace."*

---

### 🆕 ADR-037: Data Consolidation & Cross-App Dashboards (P1)

**Status:** Accepted.

**Context:** Research shows that "spend weeks manually consolidating data from multiple sources before they can begin meaningful analysis." — the real bottleneck is not insights, but setup time. Users copy-paste data from CRM to spreadsheets to presentation decks.

**Decision:** Implement pre-aggregated cross-app materialized views in VISTA, exposed via a "Combine Data" UI.

**Materialized Views:**
```sql
-- Revenue + Inventory: deals won vs stock levels
CREATE MATERIALIZED VIEW vista.cross_app_revenue_inventory AS
SELECT 
    c.tenant_id,
    date_trunc('day', c.won_at) AS day,
    COUNT(c.id) AS deals_won,
    SUM(c.amount) AS revenue,
    AVG(v.stock_quantity) AS avg_stock,
    COUNT(v.id) AS products_in_stock
FROM collab_crm.deals c
LEFT JOIN vault.variants v ON v.tenant_id = c.tenant_id
WHERE c.status = 'won'
GROUP BY c.tenant_id, date_trunc('day', c.won_at);

-- Support + Sales: tickets vs deals pipeline
CREATE MATERIALIZED VIEW vista.cross_app_support_sales AS
SELECT 
    d.tenant_id,
    date_trunc('day', d.created_at) AS day,
    COUNT(DISTINCT d.id) AS tickets_opened,
    COUNT(DISTINCT c.id) AS deals_in_pipeline,
    AVG(d.resolution_time_minutes) AS avg_resolution_time
FROM dial.tickets d
LEFT JOIN collab_crm.deals c ON c.tenant_id = d.tenant_id AND c.status IN ('qualified', 'negotiation')
WHERE d.status != 'closed'
GROUP BY d.tenant_id, date_trunc('day', d.created_at);
```

**API Endpoint:**
- `POST /api/v1/vista/combine` → Accepts `{ primary: "revenue", secondary: "inventory", dateRange: {...} }` → Returns combined dataset.

**Implementation:**
- Materialized views are refreshed every 15 minutes via outbox consumers.
- The "Combine Data" UI in VISTA shows a dropdown of available data sources, overlays the selected views, and displays a combined chart.
- No SQL required for end users.

---

### 🆕 ADR-038: Changelog & Stability Policy (P2)

**Status:** Accepted.

**Context:** Research shows that tools that remove features, change UI without warning, or force migrations to worse versions erode trust. Users feel held hostage by the vendor's roadmap.

**Decision:** Implement a transparent changelog with a documented stability policy, visible directly in the app.

**Schema:**
```sql
CREATE TABLE core.changelog (
    id BIGSERIAL PRIMARY KEY,
    version TEXT NOT NULL,
    date DATE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('new', 'improved', 'fixed', 'deprecated')),
    breaking_change BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**API Endpoint:**
- `GET /api/v1/changelog` → Returns all entries, sorted by date DESC.
- `GET /api/v1/changelog/unread` → Returns entries since the user's last visit (stored in `core.user_preferences`).

**Implementation:**
- Frontend displays a bell icon in the Shell with a red dot for unread entries.
- Clicking opens a glassmorphic modal: *"What's new this week"* with the last 3-5 entries.
- The stability policy is documented on a public `/changelog` page: no feature removal without 30 days' notice, no breaking UI changes without a legacy toggle for 30 days.

---


### 🆕 ADR-039: Shopify Sync (P0)

**Status:** Accepted.

**Context:** VAULT needs to sync inventory with Shopify to eliminate manual stock updates. Research shows that Cin7 users love this feature because it prevents overselling and reduces operational friction.

**Decision:** Implement a Shopify sync with OAuth 2.0 authentication, a background worker, and optional webhooks.

**Tables:**
```sql
CREATE TABLE vault.shopify_integrations (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    shop_url TEXT NOT NULL UNIQUE,
    access_token TEXT NOT NULL,             -- encrypted via ADR-007
    scope TEXT NOT NULL,
    last_synced_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE vault.shopify_sync_logs (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    sync_type TEXT NOT NULL,
    status TEXT NOT NULL,
    product_id UUID,
    shopify_id BIGINT,
    error_message TEXT,
    retry_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Endpoints:**
- `GET /api/v1/vault/shopify/auth` → redirect to Shopify OAuth.
- `GET /api/v1/vault/shopify/callback` → OAuth callback, stores token.
- `POST /api/v1/vault/shopify/sync` → manual force sync.
- `DELETE /api/v1/vault/shopify/disconnect` → revokes connection.

**Worker:** `shopify_sync_worker` runs every 5 minutes, polls Shopify API for products, inventory, and orders. Uses the `transactional_batch_insert` helper for batch persistence.

**Webhooks (optional):** Shopify can push updates via webhook to `/api/v1/vault/shopify/webhook`. If enabled, this reduces latency.

**Error Handling:** Failed syncs are logged to `vault.shopify_sync_logs`. The System Health Dashboard shows sync status.

---

### 🆕 ADR-040: Chart Drill-Down (P0)

**Status:** Accepted.

**Context:** VISTA dashboards need interactivity. Users want to "investigate" the data behind a chart by clicking on it. Tableau's drill-down is a key "love driver."

**Decision:** Expose a `POST /api/v1/vista/drill-down` endpoint that accepts a dimension and value, and returns the raw data behind that chart element.

**Endpoint:**
```
POST /api/v1/vista/drill-down
Authorization: Bearer <jwt>
Content-Type: application/json

{
    "dashboardId": "uuid",
    "widgetId": "uuid",
    "dimension": "month",
    "value": "2026-08",
    "filters": {
        "dateRange": { "from": "2026-01-01", "to": "2026-12-31" },
        "team": "sales"
    },
    "limit": 1000
}
```

**Response:**
```json
{
    "data": [
        { "id": "uuid", "name": "Acme Corp", "amount": 15000, "stage": "Won" }
    ],
    "total": 42,
    "hasMore": false
}
```

**Implementation:** A new method in `ataqu-domain-vista` builds the SQL query dynamically from the dimension and filters. The result is mapped to a generic `serde_json::Value` array.

**Security:** The endpoint respects tenant isolation via `TenantId`. Filters are validated against the widget's data source.


## 3. SYSTEM ARCHITECTURE & DATABASE STRATEGY

### 3.1 Overview

**Single Binary, Single Tokio Runtime.** The binary `ataqu-server` initializes:
- HTTP/WebSocket server (Axum 0.8.9) on port 443 with `Host`-based routing.
- **6 domain-specific `sea_orm::DatabaseConnection` instances** (max 5 connections each = 30).
- **1 dispatcher `sqlx::PgPool`** (max 3 connections) for outbox polling and `PgListener`.
- **1 admin `sea_orm::DatabaseConnection`** (max 2 connections) for CLI and migrations.
- Background tasks: outbox dispatcher, VISTA aggregator, DIAL ingester, saga runners, FTS indexers, GDPR saga runner, `cron_worker`, `csv_importer_worker`, `s3_orphan_reaper_task`, `no_show_worker`, `email_tracking_writer_task`.
- **🆕 Health metrics collector** (runs every 10 seconds, aggregates system status).
- **🆕 Onboarding inactivity detector** (cron job, runs daily).
- UDS admin socket with filesystem permissions (`0600`).
- Bounded Moka cache for idempotency hot-path (max 10,000 entries).

### 3.2 Database Layout

One PostgreSQL 18.4 instance in `/var/lib/postgresql/`. WAL archived to S3 via `wal-g`.

| Schema | Role | Bounded Contexts | Notes |
|--------|------|-----------------|-------|
| `core` | `core_role` | AEGIS (Auth), Billing, **Audit**, Scheduled Tasks, Unified Outbox, Idempotency, **Permissions**, **Onboarding Progress**, **Changelog** | `core.outbox` (Type-safe `schema` ENUM, RLS, Column-Level Security, Sequence Grants enabled). `core.audit_logs` supports cross-app auditing. |
| `collab_crm` | `cinq_role` | CINQ (CRM), SPARK (Automation), Email Tracking | Domain roles have `INSERT` on `core.outbox` restricted by RLS |
| `collab_ops` | `ops_role` | SOND (Forms), PIVOT (Docs), PAUSE (HR), TEMPO (Schedules) | |
| `vault` | `vault_role` | VAULT (Inventory) | |
| `dial` | `dial_role` | DIAL (Chat), DLQ, Presence | |
| `vista` | `vista_role` | VISTA (Analytics), Aggregator DLQ, **Cross-App Materialized Views** | `vista.cross_app_*` views for data consolidation |


**New tables added via ADR-039 and ADR-037:**
- `vault.shopify_integrations`
- `vault.shopify_sync_logs`
- `vista.cross_app_revenue_inventory` (materialized view)
- `vista.cross_app_support_sales` (materialized view)

The `dispatcher_role` has `SELECT` and column-level `UPDATE` on `core.outbox` tracking columns.

### 3.3 Timeout Hierarchy

| Layer | Timeout | Purpose |
|-------|---------|---------|
| Idempotency lock acquisition | 10 s | `SET LOCAL statement_timeout` during `pg_advisory_xact_lock` |
| PostgreSQL statement timeout | 5 s | Hard limit for any single query during processing |
| VISTA analytics (SET LOCAL) | 15 s | Complex aggregation queries |
| HTTP request timeout | 30 s | Generous upper bound for the entire request |
| Outbox `LISTEN` timeout | 5 s | Safety-net poll if `NOTIFY` is missed |

### 3.4 Infrastructure & Phased Scaling

**Phase 1:** Hetzner CX42 (8 vCores, 8 GB RAM, 160 GB NVMe). PostgreSQL 18.4 native install. `wal-g` 3.0.8 sidecar (1 s RPO to S3). Hetzner Storage Box (S3-compatible). Bounded Moka cache. SPAs served by Axum `ServeDir`. In-memory presence store.

**Phase 2 Trigger:** Active users ≥ 200, OR DB CPU > 80% sustained, OR memory headroom < 1 GB.

**Phase 2 Actions:**
1. Migrate to managed Postgres (Neon/RDS).
2. Swap `InMemoryPresenceStore` for `PostgresPresenceStore` (no domain changes — ADR-028).
3. Scale domain pool sizes from 5 to 10.
4. Enable PgBouncer transaction pooling if needed.

### 3.5 CI/CD, Benchmarks & Routing

- GitHub Actions builds static `x86_64-unknown-linux-musl` binary.
- `sea-orm-migration` migrations tested in CI against a ephemeral Postgres container.
- **`EXPLAIN QUERY PLAN` CI Lint:** Fails CI if it detects a `Seq Scan` on a table where `pg_class.reltuples > 10000` without an explicit `-- ALLOW_SEQ_SCAN` comment.
- **Pii Lint:** CI fails if any crate outside the approved list enables the `infra-pii-access` feature on `ataqu-security`.
- **Entity Boundary Lint:** CI fails if any `sea_orm::Model` or `sea_orm::ActiveModel` type appears in a `ataqu-domain-*` crate's public API.
- **GDPR Registry CI Test:** Fails if any table with `tenant_id` is not in the compiled registry (ADR-022).
- **🆕 Audit Log CI Test:** Fails if any mutation endpoint does not log to `core.audit_logs` (verified via integration tests).
- Axum routes based on `Host` header (including `track.ataqu.com` for email tracking pixels).

---

## 4. SECURITY, COMPLIANCE & THE PII TYPE-STATE

### 4.1 Security Overview

- Native Rust auth with JWT (short-lived access tokens), Argon2 (password hashing), TOTP (MFA).
- RBAC enforced via private `TenantId` newtype (ADR-024) and database-level role isolation (ADR-001).
- **Hard DB Boundaries:** Domain isolation enforced natively by PostgreSQL Roles, Row Level Security (RLS), Column-Level Privileges, a type-safe `schema` `ENUM`, and sequence grants on `core.outbox` (ADR-002).
- **Domain purity:** Domain logic performs zero I/O and zero system clock/RNG reads. All database interaction and `SAVEPOINT` logic is in infrastructure crates (ADR-017). All ID and time generation uses injected `IdGenerator` and `Clock` (ADR-013).
- Admin UDS requires token and writes audit logs (ADR-008).
- File uploads via presigned S3 URLs. Orphan reaper prevents S3 waste (ADR-027).
- Email tracking isolated via bounded channel with atomic, non-overwriting file rotation spill processed exactly once (ADR-031).
- **🆕 Permission Matrix:** Centralized cross-app RBAC in `core.permissions` table. Admins have a single view of who has access to what.
- **🆕 Unified Audit Log:** Every action across all apps is logged to `core.audit_logs` with user, timestamp, app, and before/after values.
- **PII redaction is enforced via compile-time newtypes (`Email`, `Phone`) implementing `Debug`/`Display` as `[REDACTED]`. JSON serialization is strictly restricted to the API layer via wrapper structs, preventing log leaks across the unified binary (ADR-007).**

### 4.2 GDPR Compliance

Sequential idempotent saga across 6 schemas using:
- **Compiled table registry** (ADR-022) — no runtime `information_schema` queries.
- CI test enforces 100% coverage of tables with `tenant_id`.
- `trace_id` stored in `gdpr_saga_state` for end-to-end observability.
- S3 files deleted idempotently using manifest stored in saga state.
- Manual escalation path after 3 failed retries on any step.
- **🆕 Audit logs are excluded from GDPR deletion for legal compliance** (retained for 7 years as required by law, but anonymized).

### 4.3 Implementation of PII Newtypes

PII fields are wrapped in domain newtypes that explicitly implement `fmt::Debug` and `fmt::Display` to output `[REDACTED]`. This provides zero-cost, compile-time guaranteed redaction without runtime serialization overhead. **The newtypes do not implement `Serialize`**, preventing `serde_json` from serializing them anywhere in the binary. The API layer defines wrapper structs (e.g., `ApiEmail`) that implement `Serialize` via `reveal(&key)`, truly isolating JSON serialization to the API boundary.

| Property | Enforcement |
|----------|------------|
| Private inner field | Rust visibility (compile-time) |
| `Debug` impl returns `[REDACTED]` | Explicit trait impl (compile-time) |
| `Display` impl returns `[REDACTED]` | Explicit trait impl (compile-time) |
| `Serialize` impl absent on newtype | Absent impl (compile-time) |
| `Serialize` impl exists only on API wrapper struct | Architectural boundary (compile-time) |
| `reveal()` requires `PiiAccessKey` | Capability token (compile-time) |
| `PiiAccessKey::new()` requires `infra-pii-access` feature | Feature flag (compile-time) |
| Only approved crates enable feature | CI lint (CI-time) |
| Domain layer never uses `reveal()` or API wrapper | Architectural boundary (ADR-033) |

---

## 5. SHARED CRATES & RESILIENCE POLICIES

### 5.1 Workspace — 27 Crates (Pure Domain, SeaORM Infrastructure)

| # | Crate | Layer | Responsibility |
|---|-------|-------|----------------|
| 1 | `ataqu-bin` | Binary | Entry point, runtime setup, background task spawning |
| 2 | `ataqu-kernel` | Shared | Core types (`TenantId` private field, `Identifiable` trait, `IdGenerator` trait, `Clock` trait), error types |
| 3 | `ataqu-security` | Shared | PII Newtypes (`Email`, `Phone` - no `Serialize`), `PiiAccessKey`, crypto, JWT |
| 4 | `ataqu-contracts` | Shared | Event definitions, commands, DTOs |
| 5 | `ataqu-domain-aegis` | Domain | AEGIS pure logic (auth, SSO, MFA, **permission matrix**, **audit log**) |
| 6 | `ataqu-domain-billing` | Domain | Billing pure logic |
| 7 | `ataqu-domain-vault` | Domain | VAULT pure logic (inventory) |
| 8 | `ataqu-domain-dial` | Domain | DIAL pure logic + `PresenceStore` trait (no `ConnectionId`) |
| 9 | `ataqu-domain-cinq` | Domain | CINQ pure logic + `ContactRepository` trait |
| 10 | `ataqu-domain-spark` | Domain | SPARK pure logic (automation) |
| 11 | `ataqu-domain-sond` | Domain | SOND pure logic (forms) |
| 12 | `ataqu-domain-pivot` | Domain | PIVOT pure logic (docs) |
| 13 | `ataqu-domain-pause` | Domain | PAUSE pure logic (HR) |
| 14 | `ataqu-domain-tempo` | Domain | TEMPO pure logic (schedules) |
| 15 | `ataqu-domain-vista` | Domain | VISTA pure logic (analytics + aggregation, **cross-app views**) |
| 16 | `ataqu-domain-gdpr` | Domain | GDPR saga state machine + compiled table registry |
| 17 | `ataqu-infra-pools` | Infra | 6 SeaORM pools + 1 sqlx dispatcher pool + 1 SeaORM admin pool |
| 18 | `ataqu-infra-repositories` | Infra | SeaORM entity impls, mappers, generic `transactional_batch_insert` helper, presence stores, **onboarding progress store** |
| 19 | `ataqu-infra-outbox` | Infra | `OutboxDispatcher` (`sqlx::PgListener` + `SKIP LOCKED` polling on `core.outbox`) |
| 20 | `ataqu-infra-idempotency` | Infra | `IdempotencyGuard` (2× int4 advisory locks, durable response cache, bounded Moka) |
| 21 | `ataqu-infra-sagas` | Infra | Generic saga state machines, fenced leases |
| 22 | `ataqu-infra-cron` | Infra | `cron_worker` (`SKIP LOCKED`, deterministic `command_id`), **inactivity detector** |
| 23 | `ataqu-infra-storage` | Infra | S3 presigned URLs, chunked orphan reaper, CSV streaming |
| 24 | `ataqu-infra-migration` | Infra | `sea-orm-migration` migration crate (Rust-native migrations) |
| 25 | `ataqu-application` | Application | Service orchestration (calls domain with injected `IdGenerator`/`Clock`, delegates to infra) |
| 26 | `ataqu-api` | API | Axum handlers, middleware, Moka cache, `Idempotency-Key` parsing, API serialization wrappers (`ApiEmail`), **health endpoint** |
| 27 | `ataqu-admin` | Admin | CLI binary, UDS client, audit logging |

| 28 | `ataqu-domain-health` | Domain | Health metrics aggregation (ADR-034) |
| 29 | `ataqu-domain-onboarding` | Domain | Activation progress tracking, inactivity detection (ADR-036) |
| 30 | `ataqu-domain-changelog` | Domain | Changelog service (ADR-038) |
| 31 | `ataqu-domain-shopify` | Domain | Shopify sync logic (ADR-039) |
| 32 | `ataqu-infra-shopify` | Infra | Shopify API client, OAuth, sync worker |
| 33 | `ataqu-application/src/health_service.rs` | App | Health service |
| 34 | `ataqu-application/src/onboarding_service.rs` | App | Onboarding service |
| 35 | `ataqu-application/src/changelog_service.rs` | App | Changelog service |
| 36 | `ataqu-application/src/shopify_service.rs` | App | Shopify service |

**Dependency direction:** `api → application → {domain, infra}`. Domain depends on nothing. Infra depends on domain traits. No circular dependencies. SeaORM `Model`/`ActiveModel` confined to `ataqu-infra-repositories` (ADR-033).

### 5.2 Resilience Policy Summary

| Concern | Policy |
|---------|--------|
| **Idempotency** | `IdempotencyGuard`: 2× int4 advisory lock (explicit `::int4` cast, negligible collision risk 2⁻⁶⁴) + durable response in `core.idempotency_records` + bounded Moka hot cache. `503` + `Retry-After` on lock timeout. Transient errors allow retry; validation errors cache as `failed`. |
| **Outbox delivery** | Unified `core.outbox` table with type-safe `schema` ENUM, RLS, Column-Level Privileges, and Sequence Grants. `sqlx::PgListener` for instant push. 5s safety-net poll. `FOR UPDATE SKIP LOCKED`. DLQ after 5 attempts. |
| **VISTA Aggregator** | `sqlx::PgListener` for instant push. Polls `core.outbox` for `vista_consumed_at IS NULL`. DLQ fallback. |
| **Cross-domain reads** | **Prohibited.** Event-driven projections via domain-specific consumer logic. |
| **GDPR deletion** | Compiled table registry (ADR-022). CI coverage test. Trace context in DB. Idempotent S3 deletion. |
| **Logging** | Dual `non_blocking` JSON layers, `copytruncate` logrotate, OpenTelemetry export to Tempo. **PII redaction handled natively by newtype `Debug`/`Display` impls and API-layer serialization wrappers.** |
| **Thread safety** | Single Tokio runtime. `sea_orm::DatabaseConnection` is `Send + Sync`. MVCC handles concurrent writes. 35 application connections, `max_connections = 40`. |
| **DIAL/SOND Ingestion** | Generic `transactional_batch_insert` helper in `ataqu-infra-repositories` (ADR-014, ADR-029). `SAVEPOINT`s on `sea_orm::DatabaseTransaction`. **Chunked fallback (100). Transient errors abort immediately with clean transaction state; only data violations trigger 1-by-1 fallback. DLQ entries contain full cloned payloads. Idiomatic error mapping.** Domain layer has zero knowledge of transactions. |
| **Custom Fields** | Three-tier query strategy (ADR-030): `@>` exact match (indexed) → `->>` ILIKE single-field (scan) → `jsonb_each_text` cross-field (expensive, **rate-limited & result-capped**). Column promotion for high-traffic fields. |
| **No-Show Workflows** | Sargable query using stored generated `ends_at` column. 24-hour upper bound. Indexed. |
| **Cron Dispatch** | `UUIDv5(scheduled_task_id)` → `IdempotencyGuard`. `FOR UPDATE SKIP LOCKED` for HA scaling. |
| **WebSocket Presence** | `PresenceStore` trait (no `ConnectionId`). Phase 1: `InMemoryPresenceStore`. Phase 2: `PostgresPresenceStore`. No domain changes on swap. |
| **Email Tracking Spill** | Bounded channel (1000). Atomic, non-overwriting file rotation spill (nanos + uuid filenames). **Recovery processes files exactly once.** 10 MB hard cap. P0 alert on recovery failure. |
| **Memory Safety** | Bounded Moka cache (10K entries, ~20 MB). `work_mem = 2MB`. 35 max app connections. Total PostgreSQL memory ~1.2 GB. Total system ~2 GB. 6 GB OS page cache headroom. |
| **Domain IDs & Time** | `IdGenerator` (for UUIDs) and `Clock` (for high-precision `SystemTime`) injected from application layer. Domain functions never read system clock or RNG. `MockIdGenerator`/`MockClock` for deterministic tests. |
| **Entity Boundary** | SeaORM `Model`/`ActiveModel` confined to `ataqu-infra-repositories`. Mapped to pure domain structs at repository boundary (ADR-033). CI lint enforces. |
| **🆕 System Health** | Health endpoint aggregates outbox lag, workflow failure rates, DLQ depth, and pool status. Exposed via `/api/v1/health/status`. Frontend polls every 10s. |
| **🆕 Audit Logging** | All mutations and permission changes write to `core.audit_logs` in the same transaction as the mutation. Audit log is searchable and exportable. |
| **🆕 Onboarding Tracking** | Progress state stored in `core.onboarding_progress`. Inactivity detector runs daily and triggers in-app toasts on next login. |

---

## 6. APPLICATION & SERVICE SPECIFICATIONS

| App | Domain Crate | DB Schema | Key Features & ADRs |
|-----|-------------|-----------|---------------------|
| AEGIS | `ataqu-domain-aegis` | `core` | OIDC SSO, MFA, JWT, Argon2, **Permission Matrix (ADR-035)**, **Unified Audit Log (ADR-035)** |
| TEMPO | `ataqu-domain-tempo` | `collab_ops` | Calendar, no-show workflows (ADR-032), OAuth refresh saga |
| PIVOT | `ataqu-domain-pivot` | `collab_ops` | Docs, `tsvector` search (ADR-009), `JSONB` views |
| SOND | `ataqu-domain-sond` | `collab_ops` | Forms, async CSV via generic `transactional_batch_insert` (ADR-029) |
| VAULT | `ataqu-domain-vault` | `vault` | Inventory, overflow protection (ADR-023) |
| PAUSE | `ataqu-domain-pause` | `collab_ops` | HR, `tsvector` directory. Emits projection events (ADR-004). |
| DIAL | `ataqu-domain-dial` | `dial` | Chat, batch ingestion via generic helper (ADR-014), `PresenceStore` trait (ADR-028) |
| SPARK | `ataqu-domain-spark` | `collab_crm` | Automation, fenced leases, `cron_worker` (ADR-026), **workflow health monitoring** |
| CINQ | `ataqu-domain-cinq` | `collab_crm` | CRM, `JSONB` with graceful degradation (ADR-030), observable email tracking (ADR-031). Consumes PAUSE projections. |
| VISTA | `ataqu-domain-vista` | `vista` | Aggregator with `LISTEN/NOTIFY` (ADR-010), DLQ inclusion, stateful cursor, **System Health Dashboard**, **Cross-App Materialized Views (ADR-037)** |

| **🆕 Health** | `ataqu-domain-health` | `core` | **Health metrics aggregation (ADR-034). Collects outbox lag, workflow failures, pool status.** |
| **🆕 Onboarding** | `ataqu-domain-onboarding` | `core` | **Activation progress tracking, inactivity detection (ADR-036).** |
| **🆕 Changelog** | `ataqu-domain-changelog` | `core` | **Changelog entries (ADR-038).** |
| **🆕 Shopify** | `ataqu-domain-shopify` | `vault` | **Shopify sync (ADR-039).** |
| **🆕 Health** | `ataqu-domain-health` | `core` | **Health metrics aggregation (ADR-034). Collects outbox lag, workflow failures, pool status.** |
| **🆕 Onboarding** | `ataqu-domain-onboarding` | `core` | **Activation progress tracking, inactivity detection (ADR-036).** |

---

## 7. OBSERVABILITY, METRICS & HONEST DURABILITY

### 7.1 Data Protection & Retention

| Data | Retention | Mechanism |
|------|-----------|-----------|
| WAL segments | 1 s RPO | `wal-g` streaming to S3 |
| `core.outbox` | 30 days | `DELETE` cron. Moderate autovacuum (`scale_factor = 0.10`). |
| `core.idempotency_records` | 7 days | Standard table. Daily `DELETE` cron. Moderate autovacuum. |
| DLQ records | 30 days | `DELETE` cron per schema |
| **🆕 `core.audit_logs`** | **7 years** | **Legal compliance. Partitioned by month.** |
| **🆕 `core.changelog`** | **Indefinite** | **Small table, never deleted.** |
| Critical logs | 30 days | JSON logs with `copytruncate` rotation |
| Orphaned S3 files | 24 hours | Chunked reaper deletes unmatched objects |
| Email tracking spill | Until recovered | Atomic, non-overwriting file rotation recovery every 60s. 10 MB hard cap. |

### 7.2 Logging Architecture

**Structured JSON with OpenTelemetry:**
- **Critical Layer:** `WARN`/`ERROR` to `critical.log.json`.
- **Operational Layer:** `INFO`/`DEBUG` to `operational.log.json` (strict `filter_fn`).
- **Log Rotation:** OS `logrotate` with `copytruncate`.
- **Distributed Tracing:** `tracing-opentelemetry` propagates `trace_id` across sagas and projections. Saga `trace_id` stored in DB to survive pauses.
- **PII Redaction:** Handled natively by PII newtypes (`Email`, `Phone`) implementing `Debug` and `Display` as `[REDACTED]`. JSON serialization is strictly restricted to the API layer via wrapper structs. Zero-cost, compile-time guarantee.

### 7.3 Tracing & Health Checks

- **Saga Tracing:** Per-step `tracing` span with `tenant_id`, `step`, `attempt_count`, `trace_id`.
- **🆕 System Health Check:** `/health/ready` checks `JoinSet` + `watch::Sender<bool>` for critical background tasks. Additionally, it checks:
  - Outbox lag > 5s → returns `503`
  - DLQ depth > 10 → returns `503`
  - Connection pool usage > 90% → returns `503`
- **🆕 Detailed Health Endpoint:** `/api/v1/health/status` returns JSON with component-level health (ADR-034).
- **CI Lints:** `EXPLAIN QUERY PLAN` fails on `Seq Scan` for tables > 10K rows. `PiiAccessKey` feature flag lint fails if non-approved crates enable it. Entity boundary lint fails if `sea_orm::Model` appears in domain crates. GDPR registry coverage test fails if any `tenant_id` table is missing. **🆕 Audit log CI test fails if any mutation endpoint does not write to `core.audit_logs`.**

### 7.4 Key Metrics

| Metric | Type | Alert Threshold |
|--------|------|-----------------|
| `ataqu_db_active_connections` | Gauge | P2 if > 35 |
| `ataqu_db_pool_waiting` | Gauge | P2 if > 0 for 1 min |
| `ataqu_outbox_notify_lag_seconds` | Gauge | P2 if > 2 s |
| `ataqu_outbox_dispatch_total` | Counter (label: `schema`, `status`) | — |
| `ataqu_slow_tx_total` | Counter (tx > 500 ms) | P2 if > 0 |
| `ataqu_dlq_poison_message_total` | Counter (label: `schema`) | P2 if > 0 |
| `ataqu_gdpr_deletion_failed_total` | Counter (label: `step`) | **P0 if > 0** |
| `ataqu_idempotency_cache_hit_ratio` | Gauge | P3 (informational) |
| `ataqu_idempotency_lock_timeout_total` | Counter | P2 if > 0 |
| `ataqu_idempotency_stale_record_total` | Counter | P3 (informational) |
| `ataqu_moka_cache_size` | Gauge | P3 if > 9,500 |
| `vista_aggregator_lag_total` | Gauge | P2 if > 5,000 |
| `ataqu_email_tracking_spill_depth` | Gauge | P2 if > 0 for 5 min |
| `ataqu_email_tracking_spill_file_size_bytes` | Gauge | P2 if > 10 MB |
| `ataqu_email_tracking_dropped_total` | Counter | **P1 if > 0** |
| `ataqu_email_tracking_recovery_failed_total` | Counter | **P0 if > 0** |
| `ataqu_presence_online_users` | Gauge (label: `tenant`) | — |
| `no_show_detected_total` | Counter (label: `reason`) | P3 |
| **🆕 `ataqu_health_status`** | **Gauge** | **P2 if > 1 (degraded)** |
| **🆕 `ataqu_workflow_failures_total`** | **Counter (label: `workflow_id`)** | **P1 if rate > 10/hour** |
| **🆕 `ataqu_audit_log_write_total`** | **Counter** | **P3 (informational)** |
| **🆕 `ataqu_onboarding_completion_rate`** | **Gauge** | **P3 (informational)** |

---

## 8. DEFINITIVE TECH STACK & FRONTEND BOUNDARIES

### 8.1 Backend

| Component | Version | Role |
|-----------|---------|------|
| Rust | **1.97.1** (2024 edition) | Language |
| Tokio | **1.52.2** | Async runtime (single multi-threaded) |
| Axum | **0.8.9** | Web framework |
| SeaORM | **2.0.0-rc.41** | Migrations, entity definitions, standard CRUD, transaction management |
| sqlx | **0.9.0** | `PgListener` for outbox dispatch (dedicated pool, size 3) |
| PostgreSQL | **18.4** | Database |
| moka | **0.12.5** | Bounded hot cache (idempotency responses, health cache) |
| tracing | **0.1.44** | Structured logging |
| tracing-opentelemetry | **0.33.0** | Distributed tracing |
| wal-g | **3.0.8** | WAL backup to S3 |
| tera | **1.20.1** | Notification templates |
| argon2 | **0.6.0-rc.8** | Password hashing |
| jsonwebtoken | **10.4.0** | JWT |
| totp-rs | **5.7.2** | MFA |
| aws-sdk-s3 | **1.50.0** | S3 presigned URLs |
| **🆕 prometheus** | **0.13.0** | **Metrics export** |

**Transaction Object:** `sea_orm::DatabaseTransaction` is the only transaction type. Raw SQL (`Statement::from_sql_and_values`) is executed on it for Postgres primitives. `sqlx::PgPool` is used only for `PgListener` — never for transactions or CRUD.

### 8.2 Frontend

| Component | Version | Role |
|-----------|---------|------|
| Node.js | **26.5.1** (Current) | Runtime |
| pnpm | **12.0.0-alpha.16** | Package manager |
| React | **19.2.7** | UI framework |
| TypeScript | **7.0.0** | Type safety |
| Vite | **8.1.0** | Build tool |
| Tailwind CSS | **4.3.0** | Styling |
| shadcn/ui | **CLI v4** | Component library |
| TanStack Router | **v1.170+** | Typed routing |
| TanStack Query | **v5.101+** | Cache, invalidation |
| TanStack Virtual | **3.13.26** | Virtualization for all long lists |
| React Hook Form | **7.80.0** | Performant forms |
| Zod | **4.4.1** | Schema validation |
| Biome | **2.5.6** | Lint & format |
| Recharts | **3.9.1** | Standard dashboards |
| React Flow | **12.11.2** | Workflow editor |

**Bundle Size:** ≤ 500 KB gzipped per app (route-level code splitting).

### 8.3 Infrastructure

| Component | Spec |
|-----------|------|
| VPS | Hetzner CX42 (8 vCores, 8 GB RAM, 160 GB NVMe) |
| DB | PostgreSQL **18.4** native install |
| Backup | `wal-g` 3.0.8 sidecar (1 s RPO to Hetzner Storage Box S3) |
| Cache | Bounded Moka (in-process, 10K entries max) |
| **🆕 Metrics** | **Prometheus endpoint at `/metrics`** |

---

## 9. MASTER BUILD SEQUENCE

### Phase 1: Foundation & Revenue (Weeks 1–4)

**Week 1–2 (Foundation & Auth):**
- Build `ataqu-kernel` (`TenantId` private field, `Identifiable` trait, `IdGenerator` trait, `Clock` trait).
- Build `ataqu-security` (PII newtypes `Email`/`Phone` with `Debug`/`Display` as `[REDACTED]`, **no `Serialize` impl**, `PiiAccessKey` capability).
- Build `ataqu-infra-migration` (SeaORM migrations for `core` schema: `users`, `outbox` with RLS, column-level privileges, `schema` ENUM, and sequence grants, `idempotency_records`, **`audit_logs` (ADR-021)**, `scheduled_tasks`, **`permissions` (ADR-035)**, **`onboarding_progress` (ADR-036)**, **`changelog` (ADR-038)**).
- Build `ataqu-infra-pools` (6 SeaORM + 1 sqlx dispatcher + 1 SeaORM admin).
- Build `ataqu-infra-idempotency` (`IdempotencyGuard` with 2× int4 advisory locks with explicit `::int4` cast, durable response cache, bounded Moka, `503` on timeout).
- Build `ataqu-domain-aegis` (pure auth logic, `IdGenerator` & `Clock` injected, **permission matrix logic**, **audit log logic**).
- Build `ataqu-infra-repositories` (AEGIS repository implementations with SeaORM entities + mappers + generic `transactional_batch_insert` helper).
- Build `ataqu-application` (service orchestration for AEGIS, `SystemIdGenerator` & `SystemClock` impls).
- Build `ataqu-api` (Axum handlers, `Host` routing, `Idempotency-Key` parsing, API serialization wrappers `ApiEmail`, **health endpoint (ADR-034)**).

**Week 3–4 (Revenue & Ops):**
- Build `ataqu-domain-cinq` (pure CRM logic, `ContactRepository` trait, `IdGenerator` & `Clock` injected).
- Build `ataqu-domain-vault` (pure inventory logic).
- Build `ataqu-domain-sond`, `ataqu-domain-pivot` (pure logic).
- Implement `ataqu-infra-outbox` (unified `core.outbox` polling with RLS & column-level privileges, `PgListener`, `SKIP LOCKED`).
- **Week 4 Validation:** `k6` load tests. Verify:
  - Concurrent writes with same `Idempotency-Key` return identical responses.
  - RLS prevents cross-domain outbox inserts. Sequence grants allow inserts.
  - Dispatcher cannot update `payload`.
  - `schema` ENUM rejects invalid string inserts.
  - Advisory lock SQL executes without type inference errors (`$1::int4`).
  - PII newtypes log as `[REDACTED]` in `tracing`. `serde_json::to_string(&email)` fails to compile in `ataqu-application`. `ApiEmail` serializes correctly in `ataqu-api`.
  - Batch ingestion fallback chunks correctly without timing out. Transient errors abort immediately with clean transaction state (verify idempotency layer can still update record to `failed`). DLQ entries contain full cloned payloads. Idiomatic error mapping compiles. Original chunk error is logged.
  - **🆕 Health endpoint returns correct status with outbox lag and pool usage.**
  - **🆕 Audit log entries are written for all mutation endpoints.**
  - **🆕 Permission matrix query returns correct roles for all users.**

### Phase 2: Collaboration & Real-Time (Weeks 5–12)

- Build `ataqu-domain-dial` (pure chat logic, `PresenceStore` trait — no `ConnectionId`).
- Build `ataqu-infra-repositories` `InMemoryPresenceStore` (tracks `ConnectionId` internally) + `DialMessageRepository` (uses generic `transactional_batch_insert`).
- Build `ataqu-domain-spark` (fenced leases, pure automation logic, `IdGenerator` & `Clock` injected).
- Build `ataqu-infra-cron` (`SKIP LOCKED` polling, deterministic `command_id`).
- Build `ataqu-domain-tempo` (no-show workflows, OAuth refresh saga).
- Build `ataqu-domain-pause` (emits projection events).
- Build `ataqu-domain-vista` (pure aggregation logic, **cross-app view logic ADR-037**).
- Build `ataqu-infra-repositories` VISTA polling + `PostgresPresenceStore` (for Phase 2 readiness).
- Implement CINQ projection consumer (consumes PAUSE `EmployeeCreatedV1`).
- Implement OpenTelemetry distributed tracing.
- Implement `ataqu-domain-gdpr` (compiled table registry, saga state machine).
- Implement `ataqu-infra-repositories` email tracking writer with atomic, non-overwriting file rotation spill (nanos + uuid filenames, process exactly once).
- **🆕 Implement Health metrics collector:** Aggregates outbox lag, workflow failures, pool status.
- **🆕 Implement Onboarding inactivity detector:** Daily cron job marking stale tenants.
- **🆕 Implement Cross-App materialized view refresher:** Every 15 minutes.
- **Week 12 Validation:**
  - End-to-end GDPR compliance test.
  - WebSocket presence under disconnect/reconnect.
  - Batch ingestion with mixed valid/invalid messages (SAVEPOINT correctness, chunked fallback, transient error abort with clean state, domain purity maintained).
  - Email tracking spill recovery (verify zero data loss, verify no double-processing).
  - JSONB Tier 3 search returns 429 when rate limit exceeded.
  - **🆕 Health dashboard shows accurate outbox lag and workflow status.**
  - **🆕 Permission matrix updates roles correctly and logs the change.**
  - **🆕 Cross-app dashboards display combined data from CINQ and VAULT.**

### Phase 3: Polish & Launch (Weeks 13–26)

- Build remaining P1 features per app.
- Implement `EXPLAIN QUERY PLAN` CI lint, `PiiAccessKey` feature flag lint, entity boundary lint, GDPR registry CI test. **🆕 Add audit log CI test.**
- Configure `copytruncate` logrotate.
- Build frontend SPAs with route-level code splitting (≤ 500 KB gzipped per app).
- Implement S3 orphan reaper (ADR-027).
- **🆕 Build System Health Dashboard UI (VISTA `/health`):** Displays outbox lag, workflow failures, DLQ depth, integration status.
- **🆕 Build Permission Matrix UI (AEGIS `/admin/access-matrix`):** Virtualized table with inline role editing.
- **🆕 Build Unified Audit Log UI (AEGIS `/admin/audit`):** Searchable, filterable, exportable log.
- **🆕 Build Setup Progress Tracker (Shell):** Persistent widget showing onboarding progress.
- **🆕 Build Changelog UI (Shell):** Bell icon with modal showing recent changes.
- **🆕 Build Cross-App "Combine Data" UI (VISTA):** Dropdown selector for combined dashboards.
- **Week 26:** Production launch.

---


- **🆕 Build TEMPO Ultra-Simple Booking UX (3-screen public booking)**
- **🆕 Build SOND Conversational Mode (toggle + one-question-per-slide preview)**
- **🆕 Build VAULT Shopify Sync UI (connection, status, error log)**
- **🆕 Build VISTA Chart Drill-Down (click → side panel with data table)**
## 10. KNOWN LIMITATIONS & EXPLICIT TRADE-OFFS

| # | Limitation | Trade-off Rationale |
|---|------------|---------------------|
| 1 | PostgreSQL on 8 GB VPS | `shared_buffers=1GB`, `work_mem=2MB`, 35 app connections. Total memory ~2 GB, leaving 6 GB for OS page cache. Safe for Phase 1. Phase 2 migrates to managed Postgres. |
| 2 | Schemas as bounded contexts | Schemas are namespaces. PostgreSQL Roles, **RLS**, **Column-Level Privileges**, **`schema` ENUM**, and **Sequence Grants** enforce physical boundary isolation at the database level. |
| 3 | KMS master key local | Acceptable for < 10 tenants. Phase 2 upgrades to external KMS. |
| 4 | No SSR | Acceptable for B2B SaaS. SPAs with route-level code splitting. |
| 5 | PII Newtypes | PII fields wrapped in `Email`/`Phone` newtypes. `Debug`/`Display` impls output `[REDACTED]` for zero-cost log safety. **No `Serialize` impl on the newtypes.** API layer defines wrapper structs (`ApiEmail`) that implement `Serialize` via `reveal(&key)`, isolating JSON serialization to the API boundary and defeating Cargo feature unification. `reveal()` requires `PiiAccessKey` for encryption-at-rest. Compile-time guarantee. |
| 6 | JSONL spill for email tracking | Non-critical tracking events spill to JSONL if DB is down. Atomic, non-overwriting file rotation (nanos + uuid filenames) prevents concurrent-write data loss. **Recovery processes files exactly once.** 10 MB hard cap prevents disk exhaustion. P0 alert on recovery failure. |
| 7 | JSONB query tiers | `@>` for exact match (indexed). `->>` ILIKE for partial text (scan). `jsonb_each_text` for cross-field (expensive, **rate-limited & result-capped**). Column promotion for high-traffic fields. |
| 8 | Frontend bundle 500 KB | PIVOT and DIAL require rich text/WebSocket libs. 500 KB with code splitting is realistic. |
| 9 | SeaORM + raw SQL escape hatch | SeaORM for migrations, entities, and standard CRUD. Raw `Statement::from_sql_and_values` on `sea_orm::DatabaseTransaction` for Postgres primitives. Single transaction type. Never `execute_unprepared`. |
| 10 | Unpartitioned `idempotency_records` | Standard table with B-tree PK on `command_id`. O(log n) single-index lookup on hot path. Daily `DELETE` cron. |
| 11 | Advisory lock holds connection during processing | Leader's transaction spans the entire request. 5 concurrent unique requests per domain. Duplicate requests block on the lock. 10-second lock timeout + `503` + `Retry-After`. |
| 12 | Advisory lock collision risk | 2⁻⁶⁴ probability of collision. Not zero, but negligible. Impact limited to 10-second blocking. |
| 13 | In-memory presence (Phase 1) | `DashMap` is single-instance only. `PresenceStore` trait enables Phase 2 swap to `PostgresPresenceStore` with zero domain changes. |
| 14 | `aggregate_id` generated by domain via injected `IdGenerator` | Domain pure functions generate IDs via `IdGenerator::new_uuid_v7()`. `idempotency_records.aggregate_id` is nullable. No system clock/RNG reads in domain. |
| 15 | Durable idempotency responses in PostgreSQL | Response bodies stored in `core.idempotency_records.response_body` (JSONB). Moka is a hot cache only. Eliminates data loss on server restart. |
| 16 | Unified `core.outbox` table | Single table with type-safe `schema` ENUM. Static SQL in dispatcher. **RLS enforces domain boundaries**. **Column-level privileges** prevent dispatcher from altering payloads. **Sequence grants** allow domain roles to insert. |
| 17 | `IdGenerator` & `Clock` injected | Domain functions receive `&impl IdGenerator` and `&impl Clock`. `Uuid::now_v7()` and `SystemTime::now()` never called inside domain crates. High-precision `SystemTime` preserved. `MockIdGenerator`/`MockClock` for deterministic tests. |
| 18 | SeaORM `Model` confined to infra | `Model`/`ActiveModel` mapped to pure domain structs at repository boundary (ADR-033). CI lint enforces. Domain never depends on SeaORM. |
| 19 | `extract_db_err` adapter | SeaORM wraps `sqlx::Error`. The `extract_db_err` helper drills down to the underlying database error. Necessary consequence of the SeaORM escape hatch. Heavily unit-tested against Postgres error mocks. |
| 20 | `SAVEPOINT` logic in infra | All `SAVEPOINT` and raw SQL transaction logic resides exclusively in `ataqu-infra-repositories` via the generic `transactional_batch_insert` helper. Domain layer has zero knowledge of transactions. |
| 21 | Chunked batch fallback with error classification | 1-by-1 fallback on large batches exceeds `statement_timeout`. The generic helper uses chunks of 100. **Transient errors abort immediately with clean transaction state (via immediate `ROLLBACK TO SAVEPOINT`) to prevent thread starvation, poisoned transactions, and DLQ pollution.** Only data-level violations trigger 1-by-1 fallback. Original chunk error is logged. `T: Clone` preserves full DLQ payloads. Idiomatic `Option::map`/`unwrap_or` error mapping ensures compilation. |
| **🆕 22** | **Health endpoint caches for 5 seconds** | Caching reduces DB load. 5-second lag is acceptable for observability. |
| **🆕 23** | **Audit logs retained 7 years** | Legal compliance requirement. Partitioned by month for efficient deletion. |
| **🆕 24** | **Cross-App materialized views refresh every 15 minutes** | Near-real-time is sufficient for dashboards. Real-time views would require more complex incremental refresh. |
| **🆕 25** | **Onboarding progress is per-tenant, not per-user** | Simplifies tracking. Progress is shared across all users in a tenant (team-level). |

---

## 11. REVIEW FINDINGS REMEDIATION MATRIX

| # | Finding (from reviews) | Fix Applied |
|---|------------------------|----------------------|
| 1 | **Stale Documentation (v142.0):** CI lint mentioned `api-serialize` feature which was removed. | **Section 3.5 updated.** CI lint documentation now only references `infra-pii-access`. |
| 2 | **PII Feature Gate is an Illusion (v141.0):** Cargo features are additive. Gating `Serialize` behind `api-serialize` allows the entire binary to serialize PII. | **ADR-007 rewritten (v142.0).** Removed `Serialize` impl from `Email` in `ataqu-security` entirely. `serde_json::to_string(&email)` now fails to compile everywhere. The API layer defines a wrapper struct `ApiEmail<'a>(&'a Email)` that implements `Serialize` by calling `reveal(&key)`. This truly restricts serialization to the API layer, defeating Cargo feature unification. |
| 3 | **`Option<&dyn Trait>` Conversion Hack (v141.0):** `extract_db_err(&e).into()` will not compile because there is no `From` impl for `Option<&dyn Trait>`. | **ADR-014 rewritten (v142.0).** Reverted to `extract_db_err(&e).map(|db_err| RepositoryError::from(db_err)).unwrap_or(RepositoryError::Unknown)` to ensure idiomatic compilation and proper error mapping. |
| 4 | **Fatal Savepoint Leak on Transient Abort (v140.0):** `return Err(e)` before `ROLLBACK TO SAVEPOINT` poisons transaction, breaking idempotency layer. | **ADR-014 (v141.0).** `ROLLBACK TO SAVEPOINT chunk_sp` is executed *immediately* upon chunk failure, *before* error classification or return. Transaction state is always clean for the caller. |
| 5 | **The DLQ is Now Functionally Useless (v140.0):** `DLQEntry::new(item.id(), repo_err)` drops the payload. | **ADR-014 (v141.0).** Added `T: Clone` bound. Changed to `DLQEntry::new(item.clone(), repo_err)`. Full payload preserved for retries. |
| 6 | **Outbox Sequence Permissions (v140.0):** `BIGSERIAL` requires `USAGE` on sequence, otherwise insert crashes. | **ADR-002 (v141.0).** Added `GRANT USAGE, SELECT ON SEQUENCE core.outbox_id_seq TO core_role, cinq_role, ...` to the outbox migration. |
| 7 | **Advisory Lock Type Coercion (v140.0):** SeaORM might infer `int8`, failing to find `pg_advisory_xact_lock(integer, integer)` signature. | **ADR-006 (v141.0).** Raw SQL string changed to `"SELECT pg_advisory_xact_lock($1::int4, $2::int4)"`. Explicit cast prevents inference mismatch. |
| 8 | **PII `Serialize` Leak Vector (v140.0):** Explicit `Serialize` impl outputs real string. `serde_json::to_value(&payload)` in logs leaks PII. | **ADR-007 (v142.0).** Removed `Serialize` impl entirely. API wrapper struct handles serialization. No PII leaks possible via `serde_json`. |
| 9 | **Batch Helper Contract is Ambiguous (v140.0):** Caller assumes helper cleans up its own savepoints. | **ADR-014 (v141.0).** By rolling back to savepoint *before* returning `Err(e)`, the helper restores the transaction to a usable state, fulfilling the implicit contract. |
| 10 | **`item.id()` Hack (v140.0):** Changing `DLQEntry::new(item, repo_err)` to `DLQEntry::new(item.id(), repo_err)` to make it compile without `Clone` sacrificed functionality. | **ADR-014 (v141.0).** Reverted to `DLQEntry::new(item.clone(), repo_err)` and added `T: Clone` bound. No more sacrifice of functionality for code brevity. |
| 11 | **PII Newtype Abstraction (v140.0):** Flawless. | **ADR-007 (v142.0).** Retained and enhanced. Serialization truly isolated via API wrapper. |
| 12 | **Clock and IdGenerator Decoupling (v140.0):** Perfect. | **ADR-013 (v140.0).** Strictly separated. High-precision timing preserved. Panic vector removed. |
| 13 | **Transient Error Abort (v140.0):** Massive resilience win. | **ADR-014 (v141.0).** Retained. Now executes clean rollback before abort. |
| 14 | **Chunk Error Context (v140.0):** Excellent addition. | **ADR-014 (v140.0).** Operators have full context for multi-row failures. |
| 15 | **`transactional_batch_insert` Will Not Compile (v139.0):** `T: Send + Sync` does not have `id()` method. | **ADR-014 (v140.0).** Added `Identifiable` trait bound. |
| 16 | **Automated PII Redaction is Unworkable as Described (v139.0):** Custom `tracing` layer intercepting field names destroys structured logging and murders performance. | **ADR-007 (v140.0).** Abandoned custom `tracing` layer. Shifted to compile-time, zero-cost PII newtypes. |
| 17 | **Batch Fallback Does Not Distinguish Error Types (v139.0):** Transient infrastructure errors trigger 1-by-1 fallback, violating resilience contracts. | **ADR-014 (v140.0).** `Err(e)` arm uses `extract_db_err`. Transient errors abort. Data violations trigger fallback. |
| 18 | **DLQ Pollution (v139.0):** Transient errors cause valid items to be pushed to DLQ. | **ADR-014 (v140.0).** Transient errors abort immediately. Only data-level violations create `DLQEntry`s. |
| 19 | **Tokio Thread Starvation via Batch Fallback (v139.0):** 100 sequential network calls on a dead connection blocks worker thread for 500s. | **ADR-014 (v140.0).** Transient errors abort immediately. 1-by-1 loop only runs for instant data violations. |
| 20 | **Batch Error Opacity (v139.0):** Original chunk error is swallowed. | **ADR-014 (v140.0).** Added `tracing::warn!` before classification. |
| 21 | **PII Redaction via Naming Convention (v139.0):** Relying on field names is a hack. | **ADR-007 (v140.0).** Redaction enforced by the type system itself via newtypes. |
| 22 | **Double Processing in JSONL Spill Recovery (v138.0):** Recovery code processed `recovering` files twice. | **ADR-031 (v139.0).** Removed all double-processing. Processes exactly once. |
| 23 | **`IdGenerator::now()` Panic Risk & Precision Loss (v138.0):** `unwrap()` panics, UUIDv7 truncates to milliseconds. | **ADR-013 (v139.0).** `IdGenerator` strictly decoupled from `Clock`. |
| 24 | **Batch Ingestion Timeout Trap (v138.0):** 1-by-1 fallback for 10,000 items exceeds 5s `statement_timeout`. | **ADR-014 (v139.0).** Chunked strategy (100). Transient errors abort. Data violations trigger bounded fallback. |
| 25 | **`core.outbox` `schema` Column is Unbounded Text (v138.0):** Typo in string silently fails RLS. | **ADR-002 (v139.0).** Changed `schema` column to `app_schema` ENUM type. |
| 26 | **DRY Violation in Batch Ingestion (v138.0):** `SAVEPOINT` boilerplate repeated across repos. | **ADR-014 (v139.0).** Extracted into generic, reusable `transactional_batch_insert` helper. |
| 27 | **JSONB Tier 3 Search is a DoS Vector (v138.0):** `jsonb_each_text` is O(n × keys) full table scan. | **ADR-030 (v139.0).** Tier 3 search is strictly guarded by a per-tenant rate limit and result cap. |
| 28 | **Unified Outbox Breaks Hard Boundaries (v136.0):** Domain roles could spoof events. | **ADR-002 (v137.0).** RLS enabled. `schema` ENUM added for type safety. |
| 29 | **JSONL Rotation Overwrites Un-Recovered Data (v136.0):** `rename` overwrites existing `recovering` file. | **ADR-031 (v137.0).** Nanos + uuid filenames guarantee no overwrites. |
| 30 | **Outbox Dispatcher Permissions (v135.0):** `FOR UPDATE SKIP LOCKED` requires `UPDATE` privilege. | **ADR-002 (v136.0).** Column-level `UPDATE` granted to `dispatcher_role`. |
| 31 | **`PresenceStore` Leaks Infrastructure (v135.0):** `ConnectionId` in domain trait. | **ADR-028 (v136.0).** Trait operates on `TenantId` and `UserId` only. |
| 32 | **HTTP 409 for Lock Timeout (v135.0):** 409 implies resource conflict. | **ADR-006 (v136.0).** Returns `503 Service Unavailable` with `Retry-After: 5`. |
| 33 | **Idempotency Table Partition Overhead (v135.0):** Partitioning by day scans all 7 indexes. | **ADR-006 (v136.0).** Standard unpartitioned table. O(log n) single-index lookup. |
| 34 | **Dynamic Outbox Polling (v135.0):** Dynamic SQL based on `NOTIFY` payload. | **ADR-002 (v136.0).** Unified `core.outbox` with `schema` column. Static SQL. |
| 35 | **SeaORM Integration Conditions (v135.0):** Single transaction type, entity mapping boundary, error mapping helper. | **ADR-001, ADR-033 (v136.0).** `sea_orm::DatabaseTransaction` is the only transaction type. `extract_db_err()` helper. |
| 36 | **SeaORM Entity→Domain Mapping (v135.0):** Passing SeaORM `Model` to domain pollutes purity. | **ADR-033 (v136.0).** Mappers convert `Model` → pure domain structs. CI lint enforces. |
| 37 | **Never `execute_unprepared` (v135.0):** Must use `Statement::from_sql_and_values`. | **ADR-001 (v136.0).** Explicit rule documented. |
| 38 | **Fatal Flaw in Idempotency Logic (v134.0):** `ON CONFLICT DO NOTHING` does not block. | **ADR-006 (v135.0).** `pg_advisory_xact_lock` is a true blocking primitive. |
| 39 | **Memory Bankruptcy on 8 GB VPS (v134.0):** 60 connections × 4 MB = 240 MB+. | **ADR-018 (v135.0).** 35 connections, 2 MB `work_mem`, 40 `max_connections`. |
| 40 | **GDPR Saga Table Introspection (v134.0):** Runtime `information_schema` queries. | **ADR-022 (v135.0).** Compiled static registry. CI test at test time. |
| 41 | **Self-Contradictory Domain Purity (v134.0):** SAVEPOINT logic in domain crate. | **ADR-014, ADR-017 (v135.0).** All SAVEPOINT/transaction logic in `ataqu-infra-repositories`. |
| 42 | **`Pii<T>` Linting Illusion (v134.0):** Public `map()` bypasses security. | **ADR-007 (v135.0).** `map()` removed. `reveal()` requires `PiiAccessKey`. Newtypes implement `Debug` as `[REDACTED]`. |
| 43 | **Unbounded Moka Cache (v134.0):** No `max_capacity` or `weigher`. | **ADR-006 (v135.0).** `max_capacity(10_000)`, `weigher`, 7-day TTL. Peak ~20 MB. |
| 44 | **Aggressive Autovacuum (v134.0):** 5% scale factor + daily DELETE on unpartitioned table. | **ADR-015 (v135.0).** Moderate 10% scale factor. Standard table with `DELETE` cron. |
| 45 | **JSONB `@>` Limitation (v134.0):** No partial text search. | **ADR-030 (v135.0).** Three-tier query strategy. |
| 46 | **Silent Data Loss in JSONL Spill (v134.0):** No metrics or alerts. | **ADR-031 (v135.0).** Full metrics, 10 MB cap, P0 alert, atomic non-overwriting rotation (nanos+uuid), process exactly once. |
| 47 | **Upfront Aggregate ID Hack (v134.0):** DB constraint leaking into HTTP API. | **ADR-006 (v135.0).** `aggregate_id` nullable. Domain generates via injected `IdGenerator`. |
| 48 | **In-Memory Presence Anti-Pattern (v134.0):** No Phase 2 path. | **ADR-028 (v135.0).** `PresenceStore` trait. `ConnectionId` removed from trait. |
| **🆕 49** | **Missing System Health Observability:** Users can't see if workflows are failing silently. | **ADR-034 (v145.0).** Added health endpoint and dashboard. |
| **🆕 50** | **Missing Cross-App Permission Matrix:** Admins can't see who has access to what across apps. | **ADR-035 (v145.0).** Added permission matrix and unified audit log. |
| **🆕 51** | **Missing Onboarding Progress Tracking:** Silent churn from incomplete onboarding. | **ADR-036 (v145.0).** Added activation tracker and inactivity detection. |
| **🆕 52** | **Missing Data Consolidation:** Users copy-paste data between apps for analysis. | **ADR-037 (v145.0).** Added cross-app materialized views and "Combine Data" UI. |
| **🆕 53** | **Missing Changelog & Stability Policy:** Users fear breaking changes without warning. | **ADR-038 (v145.0).** Added changelog and stability policy. |
