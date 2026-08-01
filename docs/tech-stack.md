# 🏗️ ATAQU TECH STACK — Phase 1 (v8.0)

**Version:** 8.0 (Dependency Upgrade)
**Date:** 2026-08-01
**Status:** Phase 1 (Bootstrapped) — PostgreSQL with SeaORM 2.0 + Raw SQL Escape Hatch

---

## 🔬 TECHNICAL CHOICES PHILOSOPHY

1. **Performant and lightweight** → Rust (backend) / Vite + Module Federation + React (frontend)
2. **Type‑safe** → TypeScript 7.0 + Zod 4 (frontend) / SeaORM 2.0 entities + raw SQL for Postgres primitives (backend)
3. **Unified persistence with guardrails** → SeaORM for migrations, entities, and standard CRUD; raw `Statement::from_sql_and_values` on SeaORM transactions for advisory locks, savepoints, and `LISTEN/NOTIFY`; dedicated `sqlx::PgPool` for `PgListener` only.
4. **Compile-time PII redaction** → PII fields are wrapped in newtypes (`Email`, `PhoneNumber`) that implement `Debug`/`Display` as `[REDACTED]` — zero-cost, compile-time guaranteed log safety. **No `Serialize` impl on newtypes**; API layer uses wrapper structs (e.g., `ApiEmail`) for HTTP serialization.
5. **Maintainable** → Monorepo, up‑to‑date dependencies, **Biome** (unified lint + format)
6. **Smooth UX** → shadcn/ui + Tailwind 4, TanStack Query & Router, **TanStack Virtual**
7. **Modern** → React 19, Vite 8 (Rolldown), Rust 2024 edition

---

## 🦀 BACKEND — RUST STACK (Phase 1)

### Runtime & Language

| Component | Version | Justification |
|-----------|---------|---------------|
| **Rust** | **1.97.1** (2024 edition) | Latest stable; includes security fixes for CVE-2026-5222, CVE-2026-5223; MSRV for Axum 0.8.x and Tokio 1.52 |
| **Tokio** | **1.52.2** | Latest stable; LTS until March 2027 |

### Web Framework

| Component | Version | Justification |
|-----------|---------|---------------|
| **Axum** | **0.8.9** | Latest stable; type‑safe, ergonomic, WebSocket‑ready |
| **Tower** | 0.4.13 | Middleware stack (logging, CORS, auth) |
| **Tower-HTTP** | 0.5.2 | Trace, compression, rate limiting |

### Database (Phase 1 — PostgreSQL + SeaORM + Raw SQL Escape Hatch)

| Component | Version | Role |
|-----------|---------|------|
| **Database** | **PostgreSQL 18.4** | Native MVCC, JSONB, robust concurrency; latest 18.x release |
| **ORM** | **SeaORM 2.0.0-rc.41** | Migrations, entity definitions (`Entity`, `Model`, `ActiveModel`), standard CRUD, transaction management (`sea_orm::DatabaseTransaction`) |
| **Raw SQL Escape Hatch** | `Statement::from_sql_and_values` on `sea_orm::DatabaseTransaction` | Advisory locks (`pg_advisory_xact_lock(int4, int4)`), `SAVEPOINT` control, `pg_notify()`, `FOR UPDATE SKIP LOCKED`, `SET LOCAL` |
| **Listener** | `sqlx::PgListener` (via dedicated `sqlx::PgPool` size 3) | `LISTEN/NOTIFY` for outbox dispatcher — **only** for listening, never for transactions |

**Configuration:**
- `shared_buffers = 1GB`
- `work_mem = 2MB` (safe for 35 concurrent connections; VISTA uses `SET LOCAL 8MB`)
- `max_connections = 40` (35 app + 5 headroom)
- `synchronous_commit = on`
- `autovacuum = on`

**Pool Management (8 pools total):**
- **6 domain-specific `sea_orm::DatabaseConnection` instances** (one per schema): `max_connections(5)` — handles HTTP requests + background workers per domain. Total 30.
- **1 dispatcher `sqlx::PgPool`**: `max_connections(3)` — **only** for `PgListener` and outbox polling (no transactions, no CRUD).
- **1 admin `sea_orm::DatabaseConnection`**: `max_connections(2)` — CLI admin + migrations.
- **Total:** 35 application connections. `max_connections=40` in PostgreSQL provides 5 headroom.

**Single Transaction Rule:** `sea_orm::DatabaseTransaction` is the **only** transaction object. It is passed by mutable reference to repository methods. Raw SQL is executed on it via `txn.execute(Statement::from_sql_and_values(...))`. This guarantees atomicity between SeaORM CRUD and raw SQL.

**Never use `execute_unprepared`** — always use `Statement::from_sql_and_values` so PostgreSQL caches the query plan.

### Unified Outbox with Type‑safe `schema` ENUM, RLS, and Column‑Level Privileges

All domains write to a single `core.outbox` table. The `schema` column is a PostgreSQL ENUM (`app_schema`) providing database‑level type safety. RLS policies enforce that each domain role can only insert rows with its own `schema` value. The dispatcher role can only UPDATE tracking columns (`status`, `attempts`, `locked_until`, `completed_at`, `vista_consumed_at`) but cannot modify `payload`, `event_type`, or `schema`.

```sql
CREATE TYPE app_schema AS ENUM ('core', 'collab_crm', 'collab_ops', 'vault', 'dial', 'vista');

CREATE TABLE core.outbox (
    id BIGSERIAL PRIMARY KEY,
    schema app_schema NOT NULL,          -- Type-safe ENUM
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

-- RLS enabled
ALTER TABLE core.outbox ENABLE ROW LEVEL SECURITY;
-- Per-domain INSERT policies with schema checks
GRANT INSERT ON core.outbox TO cinq_role;
CREATE POLICY outbox_cinq_insert ON core.outbox FOR INSERT TO cinq_role WITH CHECK (schema = 'collab_crm');
-- ... similar for each domain
-- Dispatcher role gets SELECT and column-level UPDATE on tracking columns (not payload)
GRANT SELECT ON core.outbox TO dispatcher_role;
GRANT UPDATE (status, attempts, locked_until, completed_at, vista_consumed_at) ON core.outbox TO dispatcher_role;
```

### Compile‑Time PII Redaction via Redacting Newtypes & API-Layer Serialization Wrappers

PII fields are wrapped in domain newtypes (`Email`, `PhoneNumber`) that explicitly implement `fmt::Debug` and `fmt::Display` to output `[REDACTED]`. This provides zero‑cost, compile‑time guaranteed redaction without runtime serialization overhead.

**Crucially, the newtypes do NOT implement `serde::Serialize`.** This ensures `serde_json::to_string(&email)` fails to compile everywhere. To serialize PII for HTTP responses, the `ataqu-api` layer defines wrapper structs (e.g., `ApiEmail<'a>`) that implement `Serialize` by calling `reveal(&key)` on the inner PII newtype.

```rust
// ataqu-security/src/pii.rs
pub struct Email(String);
impl Email {
    pub fn new(value: String) -> Self { Self(value) }
    pub fn reveal(&self, _key: &PiiAccessKey) -> &str { &self.0 }
}
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
// No Serialize impl here.

// ataqu-api/src/serializers.rs
pub struct ApiEmail<'a>(pub &'a Email);
impl<'a> Serialize for ApiEmail<'a> {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where S: serde::Serializer {
        let key = PiiAccessKey::new();
        serializer.serialize_str(self.0.reveal(&key))
    }
}
```

### Cache & State

| Component | Version | Justification |
|-----------|---------|---------------|
| **moka** | **0.12.5** | **Bounded hot cache** for idempotency responses. `max_capacity(10_000)`, 7-day TTL, 20 MB peak memory. Not a source of truth — durable responses live in `core.idempotency_records`. |
| **DashMap** | 5.4.0 | Phase 1 `InMemoryPresenceStore` (tracks `ConnectionId` internally). Eviction on disconnect. Phase 2 swaps to `PostgresPresenceStore` via `PresenceStore` trait. |

### Full‑Text Search (Phase 1)

| Component | Version | Justification |
|-----------|---------|---------------|
| **PostgreSQL tsvector** | Built‑in | GIN indexes, generated columns, asynchronous outbox updates via dedicated consumers. |

### Authentication & Security

| Component | Version | Justification |
|-----------|---------|---------------|
| **jsonwebtoken** | **10.4.0** | JWT (RS256) — short-lived access tokens; fixes CVE-2026-25537 (type confusion) |
| **oauth2** | 4.4.0 | OIDC (Google, Microsoft, Okta) |
| **totp-rs** | **5.7.2** | TOTP MFA (RFC 6238) |
| **argon2** | **0.6.0-rc.8** | Password hashing; latest release candidate with async support |

### Payment

| Component | Version | Justification |
|-----------|---------|---------------|
| **async-stripe** | 0.35.1 | Stripe webhooks, subscriptions |

### Logging & Monitoring

| Component | Version | Justification |
|-----------|---------|---------------|
| **Tracing** | **0.1.44** | Structured logs, spans |
| **tracing-subscriber** | 0.3.18 | JSON formatter (`critical.log.json`, `operational.log.json`) |
| **tracing-opentelemetry** | **0.33.0** | OTLP HTTP exporter (Tempo); integrates with OpenTelemetry 0.32+ |
| **tracing-appender** | 0.2.0 | Non‑blocking writer; `copytruncate` logrotate |
| **metrics** | 0.21.0 | Prometheus exporter |

### Serialization & Errors

| Component | Version | Justification |
|-----------|---------|---------------|
| **Serde** | **1.0.229** | JSON |
| **serde_json** | **1.0.151** | JSON handling |
| **thiserror** | **2.0.18** | Typed business errors; breaking change from v1 (MSRV bump) |
| **anyhow** | **1.0.103** | Generic errors (limited) |

### Utilities

| Component | Version | Justification |
|-----------|---------|---------------|
| **Clap** | **4.6.4** | CLI arguments |
| **Chrono** | **0.4.45** | Dates & time (UTC) |
| **UUID** | **1.24.0** | UUID v4, v5 (deterministic), v7 (time‑ordered) |

### Email

| Component | Version | Justification |
|-----------|---------|---------------|
| **lettre** | 0.10.0 | Rust email library |
| **SendGrid / Postmark** | – | Managed external provider |

---

## 🧱 BACKEND WORKSPACE CRATES (27 Total — SeaORM + Raw SQL Escape Hatch)

| # | Crate | Layer | Responsibility | Persistence |
|---|-------|-------|----------------|-------------|
| 1 | `ataqu-bin` | Binary | Entry point, runtime setup, background task spawning | — |
| 2 | `ataqu-kernel` | Shared | Core types (`TenantId` private field, `Identifiable` trait, `IdGenerator` trait, `Clock` trait), error types | — |
| 3 | `ataqu-security` | Shared | PII newtypes (`Email`, `PhoneNumber` — no `Serialize`), `PiiAccessKey`, crypto, JWT | — |
| 4 | `ataqu-contracts` | Shared | Event definitions, commands, DTOs | — |
| 5 | `ataqu-domain-aegis` | Domain | AEGIS pure logic (auth, SSO, MFA) | — |
| 6 | `ataqu-domain-billing` | Domain | Billing pure logic | — |
| 7 | `ataqu-domain-vault` | Domain | VAULT pure logic (inventory) | — |
| 8 | `ataqu-domain-dial` | Domain | DIAL pure logic + `PresenceStore` trait (no `ConnectionId`) | — |
| 9 | `ataqu-domain-cinq` | Domain | CINQ pure logic + `ContactRepository` trait | — |
| 10 | `ataqu-domain-spark` | Domain | SPARK pure logic (automation) | — |
| 11 | `ataqu-domain-sond` | Domain | SOND pure logic (forms) | — |
| 12 | `ataqu-domain-pivot` | Domain | PIVOT pure logic (docs) | — |
| 13 | `ataqu-domain-pause` | Domain | PAUSE pure logic (HR) | — |
| 14 | `ataqu-domain-tempo` | Domain | TEMPO pure logic (schedules) | — |
| 15 | `ataqu-domain-vista` | Domain | VISTA pure logic (analytics + aggregation) | — |
| 16 | `ataqu-domain-gdpr` | Domain | GDPR saga state machine + compiled table registry | — |
| 17 | `ataqu-infra-pools` | Infra | 6 SeaORM pools + 1 `sqlx` dispatcher pool + 1 SeaORM admin pool | SeaORM / `sqlx` |
| 18 | `ataqu-infra-repositories` | Infra | SeaORM entity impls, mappers, **generic `transactional_batch_insert` helper** (`Identifiable` bound, chunked fallback, transient error classification), presence stores | SeaORM + raw SQL |
| 19 | `ataqu-infra-outbox` | Infra | `OutboxDispatcher` (`sqlx::PgListener` + `SKIP LOCKED` on `core.outbox`) | `sqlx` listener |
| 20 | `ataqu-infra-idempotency` | Infra | `IdempotencyGuard` (2× int4 advisory locks, durable response in `core.idempotency_records`, bounded Moka) | SeaORM + raw SQL |
| 21 | `ataqu-infra-sagas` | Infra | Generic saga state machines, fenced leases | SeaORM |
| 22 | `ataqu-infra-cron` | Infra | `cron_worker` (`SKIP LOCKED`, deterministic `command_id`) | SeaORM + raw SQL |
| 23 | `ataqu-infra-storage` | Infra | S3 presigned URLs, chunked orphan reaper, CSV streaming | SeaORM |
| 24 | `ataqu-infra-migration` | Infra | `sea-orm-migration` migration crate (Rust-native migrations) | SeaORM |
| 25 | `ataqu-application` | Application | Service orchestration (calls domain with injected `IdGenerator`/`Clock`, delegates to infra) | — |
| 26 | `ataqu-api` | API | Axum handlers, middleware, Moka cache, `Idempotency-Key` parsing, **API serialization wrappers (`ApiEmail`)** | — |
| 27 | `ataqu-admin` | Admin | CLI binary, UDS client, audit logging | SeaORM |

**Dependency direction:** `api → application → {domain, infra}`. Domain depends on nothing. Infra depends on domain traits. No circular dependencies. SeaORM `Model`/`ActiveModel` confined to `ataqu-infra-repositories` (mapped to pure domain structs at boundary).

---

## 🔐 COMPILER-ENFORCED & CI-ENFORCED PATTERNS

### Type-State Transaction Discipline
- `ataqu-api` validates input → produces `UnvalidatedCommand`.
- `ataqu-domain` pure validation → produces `ValidatedCommand` using injected `IdGenerator` and `Clock`.
- `ataqu-application` orchestrates: acquires `IdempotencyGuard` (which starts a SeaORM transaction), calls domain pure function, delegates to repositories.
- `ataqu-infra-repositories` accepts `ValidatedCommand` and executes SeaORM CRUD + raw SQL on `sea_orm::DatabaseTransaction`, using the generic `transactional_batch_insert` helper for ingestion.

### PII Protection (Compile-Time Redacting Newtypes + API Serialization Wrappers)
- PII fields are wrapped in `Email`, `PhoneNumber` newtypes.
- `Debug`/`Display` impls output `[REDACTED]` — zero-cost, compile-time guaranteed log safety.
- **Newtypes do NOT implement `Serialize`** — `serde_json::to_string(&email)` fails to compile everywhere.
- `reveal()` requires a `PiiAccessKey` (capability token) for encryption-at-rest in infrastructure.
- API layer uses wrapper structs (e.g., `ApiEmail`) that implement `Serialize` by calling `reveal(&key)`.
- CI lint ensures only approved crates enable `infra-pii-access` feature.
- Domain never uses `reveal()`.

### Tenant Isolation
- Every `Repository` method requires `tenant_id: &TenantId`.
- PostgreSQL Roles, RLS, Column-Level Privileges, and `schema` ENUM enforce physical schema isolation.
- Cross-schema queries are prevented at the database level.

### Entity Boundary Lint
- CI fails if any `sea_orm::Model` or `sea_orm::ActiveModel` type appears in a `ataqu-domain-*` crate's public API.
- Mappers convert `Model` → pure domain structs in `ataqu-infra-repositories`.

### IdGenerator & Clock
- Domain functions receive `&impl IdGenerator` and `&impl Clock`.
- `IdGenerator` is used only for UUIDs; `Clock` only for high-precision `SystemTime`.
- Both are impure capabilities injected purely for testability.
- Domain never reads system clock or RNG directly.
- `MockIdGenerator`/`MockClock` for deterministic tests.

---

## ⚛️ FRONTEND — REACT STACK

### Runtime & Language

| Component | Version | Justification |
|-----------|---------|---------------|
| **Node.js** | **26.5.1** (Current) | Latest current release; includes Temporal API, V8 14.6, Undici 8.0 |
| **pnpm** | **12.0.0-alpha.16** | Latest workspace-capable version; new lockfile format |
| **TypeScript** | **7.0.0** | Go‑based native compiler ("tsgo"); 8-12x speedup on full builds |

### Framework & Bundler

| Component | Version | Justification |
|-----------|---------|---------------|
| **React** | **19.2.7** | Latest stable; Compiler, Server Components, `useOptimistic`, `<Activity>` |
| **Vite** | **8.1.0** | Bundler (Rolldown); Oxc parser |
| **@vitejs/plugin-react** | 6.0.4 | React plugin |
| **@originjs/vite-plugin-federation** | 1.3.0 | Module Federation |

### UI & Styling

| Component | Version | Justification |
|-----------|---------|---------------|
| **Tailwind CSS** | **4.3.0** | CSS‑first configuration; Lightning CSS engine |
| **shadcn/ui** | **CLI v4** | Preset system; new project structure |

### Routing & Data

| Component | Version | Justification |
|-----------|---------|---------------|
| **TanStack Router** | **v1.170+** | Route tree codegen; typed params & search |
| **TanStack Query** | **v5.101+** | Cache, invalidation |
| **Zustand** | 4.5.2 | State management |
| **TanStack Virtual** | **3.13.26** | Virtualization for all long lists |

### Forms & Validation

| Component | Version | Justification |
|-----------|---------|---------------|
| **React Hook Form** | **7.80.0** | Performant forms |
| **Zod** | **4.4.1** | Schema validation; internal rewrite, stricter validation |

### Charts & Dashboards (VISTA)

| Component | Version | Justification |
|-----------|---------|---------------|
| **Recharts** | **3.9.1** | Standard dashboards; `Cell` deprecated, new animations |
| **Apache ECharts** | 5.4.3 | Large volumes |

### Rich Text Editor (PIVOT)

| Component | Version | Justification |
|-----------|---------|---------------|
| **BlockNote** | latest | Notion‑like editor |

### Chat UI (DIAL)

| Component | Version | Justification |
|-----------|---------|---------------|
| **assistant-ui** | 0.12.1+ | ChatGPT‑like UI |
| **TanStack Virtual** | 3.13.26+ | Message history virtualization |

### Workflow Builder (SPARK)

| Component | Version | Justification |
|-----------|---------|---------------|
| **React Flow** (@xyflow/react) | **12.11.2** | Workflow editor |

### Calendar (TEMPO, PAUSE)

| Component | Version | Justification |
|-----------|---------|---------------|
| **@ilamy/calendar** | latest | Tailwind 4 + shadcn/ui |

### Authentication UI (AEGIS)

| Component | Version | Justification |
|-----------|---------|---------------|
| **Custom (shadcn/ui)** | — | In‑house |

---

## 🏗️ INFRASTRUCTURE (Phase 1)

| Component | Version | Justification |
|-----------|---------|---------------|
| **VPS** | Hetzner CX42 | 8 vCores / 8 GB RAM / 160 GB SSD |
| **DB** | PostgreSQL **18.4** native install | `shared_buffers=1GB`, `work_mem=2MB`, `max_connections=40` |
| **Backup** | `wal-g` **3.0.8** | 1 s RPO to S3; Direct‑IO Reader support |
| **CDN** | Cloudflare | Free, DDoS protection |
| **Process Manager** | systemd | Native Linux supervision |
| **Reverse Proxy** | Caddy | Automatic HTTPS |
| **CI/CD** | GitHub Actions | Pipeline build → test → deploy |
| **Storage** | Hetzner Storage Box | S3‑compatible |
| **Email** | SendGrid / Postmark | Offloaded |

---

## 📦 MONOREPO — STRUCTURE

```
saas-factory/
├── Cargo.toml                          # Rust Workspace
├── pnpm-workspace.yaml                 # Frontend workspace
├── biome.json                          # Biome Configuration
├── crates/                             # 27 Rust crates
│   ├── ataqu-bin/
│   ├── ataqu-api/
│   ├── ataqu-kernel/
│   ├── ataqu-security/
│   ├── ataqu-infra-migration/          # SeaORM migrations
│   └── ... (all domain, infra, application crates)
├── packages/                           # Shared frontend
│   ├── ui/
│   ├── tailwind-config/
│   ├── shared-hooks/
│   └── shared-utils/
└── apps/                               # 10 applications
    ├── aegis/
    ├── pivot/
    ├── sond/
    ├── dial/
    ├── spark/
    ├── tempo/
    ├── cinq/
    ├── vault/
    ├── pause/
    └── vista/
```

---

## 🔮 FUTURE PHASE 2 UPGRADES (Triggered at 200+ tenants)

| Component | Phase 1 | Phase 2 |
|-----------|---------|---------|
| **Database** | PostgreSQL on VPS | Managed PostgreSQL (Neon/RDS) |
| **Cache** | `moka` | Upstash Redis |
| **Search** | PostgreSQL tsvector | Quickwit / Meilisearch |
| **Presence** | `InMemoryPresenceStore` (DashMap) | `PostgresPresenceStore` (no domain changes — `PresenceStore` trait) |
| **Admin** | UDS | mTLS HTTP endpoint |
| **Infra** | Hetzner CX42 | Larger VPS or dedicated |

---

## ✅ SUMMARY — KEY VERSIONS (Phase 1)

| Category | Dependency | Version |
|----------|------------|---------|
| **Rust** | Rust | **1.97.1** (2024 edition) |
| **Rust** | Axum | **0.8.9** |
| **Rust** | SeaORM | **2.0.0-rc.41** (migrations, entities, CRUD) |
| **Rust** | sqlx | **0.9.0** (PgListener only, dedicated pool) |
| **Rust** | Tokio | **1.52.2** |
| **Rust** | jsonwebtoken | **10.4.0** |
| **Rust** | moka | **0.12.5** |
| **Node** | Node.js | **26.5.1** (Current) |
| **Node** | pnpm | **12.0.0-alpha.16** |
| **Node** | TypeScript | **7.0.0** |
| **Frontend** | React | **19.2.7** |
| **Frontend** | Vite | **8.1.0** |
| **Frontend** | Tailwind CSS | **4.3.0** |
| **Frontend** | shadcn/ui | **CLI v4** |
| **Frontend** | TanStack Router | **v1.170+** |
| **Frontend** | TanStack Query | **v5.101+** |
| **Frontend** | TanStack Virtual | **3.13.26+** |
| **Frontend** | React Hook Form | **7.80.0+** |
| **Frontend** | Zod | **4.4.1+** |
| **Frontend** | Biome | **2.5.6** |
| **Frontend** | Recharts | **3.9.1+** |
| **Frontend** | React Flow | **12.11.2+** |
| **Database** | PostgreSQL | **18.4** |
| **Infra** | Hetzner | CX42 |
| **Backup** | WAL-G | **3.0.8** |

---

**Document updated on 2026-08-01 — Phase 1 with PostgreSQL 18.4 + SeaORM 2.0 + raw SQL escape hatch + generic `transactional_batch_insert` helper + compile-time PII redacting newtypes + API serialization wrappers (v8.0).**
