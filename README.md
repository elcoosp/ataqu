# Ataqu — the open-source alternative to the SaaS stack lock-in

**A single Rust + PostgreSQL backend, powering 10 natively integrated business applications delivered as independent Vite + React 19 SPAs.**

Built to kill HubSpot, Slack, Zapier, Notion, Zoho, Calendly, Typeform, Cin7, Personio, and Okta:

> **1 app · 5 apps · all 10 apps**

---

## Badges

![Rust 1.97](https://img.shields.io/badge/Rust-1.97.1-000000?logo=rust&logoColor=white&style=flat-square)
![PostgreSQL 18](https://img.shields.io/badge/PostgreSQL-18-4169E1?logo=postgresql&logoColor=white&style=flat-square)
![Vite 8](https://img.shields.io/badge/Vite-8.2.1-646CFF?logo=vite&logoColor=white&style=flat-square)
![React 19](https://img.shields.io/badge/React-19.2.7-61DAFB?logo=react&logoColor=black&style=flat-square)
![TanStack Router](https://img.shields.io/badge/TanStack_Router-1.170-FF4154?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white&style=flat-square)
![pnpm 11](https://img.shields.io/badge/pnpm-11-F6F6F6?logo=pnpm&logoColor=43B02A&style=flat-square)
![Axum 0.8](https://img.shields.io/badge/Axum-0.8.9-000000?logo=rust&logoColor=white&style=flat-square)
![SeaORM 2.0](https://img.shields.io/badge/SeaORM-2.0.0--rc.41-000000?logo=rust&logoColor=white&style=flat-square)
![Biome 2.5](https://img.shields.io/badge/Biome-2.5.8-60A5FA?style=flat-square)
![Lingui v6](https://img.shields.io/badge/Lingui-v6-1E90FF?style=flat-square)
![Vitest 4](https://img.shields.io/badge/Vitest-4.1.10-6E9F18?logo=vitest&logoColor=white&style=flat-square)
![Playwright](https://img.shields.io/badge/Playwright-1.62-000000?logo=playwright&logoColor=white&style=flat-square)
![Next.js 16](https://img.shields.io/badge/Next.js-16.3_(landing)-000000?logo=nextdotjs&logoColor=white&style=flat-square)

---

## The 10 Apps

Each app is an independent Vite + React 19 SPA with TanStack Router, sharing a unified shell (sidebar, command palette, global navigation). Icons live in [`packages/shared-assets/public/apps/`](packages/shared-assets/public/apps/).

| App | Domain | Purpose |
|---|---|---|
| ![Aegis](packages/shared-assets/public/apps/aegis.png) | **AEGIS** | Authentication, MFA, SSO |
| ![Cinq](packages/shared-assets/public/apps/cinq.png) | **CINQ** | CRM — contacts, deals, tasks, pipelines |
| ![Dial](packages/shared-assets/public/apps/dial.png) | **DIAL** | Team chat, support tickets & presence |
| ![Pivot](packages/shared-assets/public/apps/pivot.png) | **PIVOT** | Knowledge base, docs & databases |
| ![Spark](packages/shared-assets/public/apps/spark.png) | **SPARK** | Automation & workflow engine |
| ![Tempo](packages/shared-assets/public/apps/tempo.png) | **TEMPO** | Scheduling & availability |
| ![Sond](packages/shared-assets/public/apps/sond.png) | **SOND** | Forms & surveys (conversational mode) |
| ![Vault](packages/shared-assets/public/apps/vault.png) | **VAULT** | Inventory management + Shopify/Amazon sync |
| ![Pause](packages/shared-assets/public/apps/pause.png) | **PAUSE** | HR — employees, leave, documents |
| ![Vista](packages/shared-assets/public/apps/vista.png) | **VISTA** | Analytics, dashboards & custom SQL |

---

## Architecture at a glance

```
┌─────────────────────────────────────────────────────────┐
│                Frontend (Vite 8 + React 19)              │
│  10 independent SPAs  ·  TanStack Router  ·  Tailwind   │
│  shared packages: ui · hooks · stores · schemas · i18n  │
└─────────────────────────────────────────────────────────┘
                          │  REST / WebSocket / SSE
                          ▼
┌──────────────────────────────────────────────────────────┐
│              Backend (Rust — Axum + SeaORM)               │
│                                                          │
│  30 crates: domain · application · api · infra           │
│  ┌──────────┐ ┌───────┐ ┌──────┐ ┌───────┐ ┌──────────┐ │
│  │ AEGIS    │ │ CINQ  │ │ DIAL │ │ PIVOT │ │ SPARK    │ │
│  │ auth/MFA │ │ CRM   │ │ chat │ │ docs   │ │ workflows│ │
│  └──────────┘ └───────┘ └──────┘ └───────┘ └──────────┘ │
│  ┌──────────┐ ┌───────┐ ┌──────┐ ┌───────┐ ┌──────────┐ │
│  │ TEMPO    │ │ SOND  │ │ VAULT│ │ PAUSE │ │ VISTA    │ │
│  │scheduling│ │ forms │ │invtry│ │ HR    │ │analytics │ │
│  └──────────┘ └───────┘ └──────┘ └───────┘ └──────────┘ │
│                                                          │
│  Infra: outbox · idempotency · cron · pools · storage     │
│  Kernel: shared traits, types, errors                    │
└──────────────────────────────────────────────────────────┘
                          │  SQLx (TLS)
                          ▼
┌──────────────────────────────────────────────────────────┐
│              PostgreSQL 18 (multi-tenant)                │
│              RLS · schemas · indexes · migrations        │
└──────────────────────────────────────────────────────────┘
```

### Key technical decisions

- **Rust backend** — Axum 0.8 HTTP server, SeaORM 2.0 RC with the SQLx PostgreSQL driver, Tokio 1.52 async runtime. Compiled to a single native binary.
- **Domain-Driven Design** — 30 crates cleanly separated: domain logic crates have zero async/web/database dependencies (only `serde`, `chrono`, `uuid`, `thiserror` + `ataqu-kernel`). Application services orchestrate. The API layer (Axum handlers) is the only integration boundary.
- **Clean monorepo** — pnpm 11 workspaces: 10 Vite SPAs + a Next.js landing + 12 shared TS packages. A single `@ataqu/vite-preset` config is imported by every app for zero-config builds.
- **Native integrations, no Zapier** — DIAL (chat), CINQ (CRM), and VAULT (inventory) sync via a shared PostgreSQL outbox — when a deal is won, other apps react instantly without webhook glue.
- **i18n first** — Lingui v6 with `en` and `fr` locales extracted via macros, compiled to message catalogs.
- **Type safety end-to-end** — Zod schemas on the frontend (`@ataqu/shared-schemas`) mirror Rust domain types. The API client in `packages/api-client` is regenerated from Rust with `pnpm generate:api`.
- **Security in depth** — Tenant isolation enforced at the database level (schemas + roles + RLS), compile-time PII redaction via redacting newtypes, CSRF double-submit protection for cookie-auth flows, and per-tenant IP allowlists.
- **Observability built-in** — `/metrics` (Prometheus), `x-request-id` tracing, structured audit logs, and a system health endpoint exposing outbox lag, DLQ depth, and connection pool stats.
- **Quality gates** — Biome 2.5 linter/formatter, Vitest 4 unit tests (80% line/function/statement, 60% branch thresholds enforced in CI), Playwright 1.62 E2E tests, `cargo clippy` + `cargo test` for the Rust side.

---

## Stack

| Layer | Technology |
|---|---|
| Runtime (backend) | Rust 1.97.1 |
| HTTP framework | Axum 0.8 |
| ORM | SeaORM 2.0.0-rc.41 |
| Database | PostgreSQL 18 |
| Async | Tokio 1.52 |
| Build tool (frontend) | Vite 8.2 |
| Runtime (frontend) | React 19.2 + TanStack Router 1.170 |
| Package manager | pnpm 11 |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS 4 + Radix UI |
| i18n | Lingui v6 |
| Testing | Vitest 4, Playwright 1.62, `cargo test` |
| Linting | Biome 2.5, `cargo clippy` |
| Infra | Docker, SeaORM migrations, S3 (via `aws-sdk-s3`) |

> **Landing page** (`ataqu.com`) uses Next.js 16.3 for SSR/SEO — the 10 product apps are Vite SPAs.

---

## Quick start

```bash
# 1. Install dependencies
pnpm install

# 2. Start PostgreSQL (macOS)
docker run -d \
  --name ataqu-postgres-dev \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ataqu_test \
  -p 5433:5432 \
  postgres:18-alpine

# 3. Copy and fill in environment variables
cp .env.example .env

# 4. Run database migrations
cargo run -p ataqu-infra-migration

# 5. Run all apps in development
pnpm dev

# 6. (Optional) Generate the API client from Rust
pnpm generate:api
```

> [!NOTE]
> `JWT_SECRET` and `CSRF_SECRET` must be set for the backend to boot. See `.env.example` for the full list of required variables (database URL, OAuth credentials, SMTP, S3, and encryption keys).

### Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Run all 10 apps in parallel (dev mode) |
| `pnpm build` | Build all apps for production |
| `pnpm test` | Run Vitest unit tests |
| `pnpm test:coverage` | Run Vitest with coverage gates (80% lines/functions/statements, 60% branches) |
| `pnpm test:e2e` | Run Playwright E2E tests |
| `pnpm lint` | Run Biome (check + auto-fix) |
| `pnpm typecheck` | Type-check all TypeScript packages |
| `pnpm extract` | Extract i18n messages (Lingui) |
| `pnpm compile` | Compile i18n message catalogs |
| `pnpm generate:api` | Regenerate the TypeScript API client from Rust |
| `cargo test --workspace` | Run Rust unit + integration tests |
| `cargo clippy --workspace -- -D warnings` | Lint Rust code (warnings are errors) |
| `cargo fmt --all -- --check` | Verify Rust formatting |
| `cargo run -p ataqu-admin -- health` | Query the server over its admin UDS |

---

## Workspace structure

```
ataqu-suite/
├── apps/                     # 10 Vite SPAs + landing
│   ├── aegis/               # auth & SSO
│   ├── cinq/                # CRM
│   ├── dial/                # chat & support
│   ├── landing/             # marketing website (ataqu.com) — Next.js
│   ├── pause/               # HR
│   ├── pivot/               # docs & databases
│   ├── sond/                # forms & surveys
│   ├── spark/               # automation workflows
│   ├── tempo/               # scheduling
│   ├── vault/               # inventory
│   └── vista/               # analytics & dashboards
│
├── packages/                # shared TypeScript libraries
│   ├── api-client/          # generated API client
│   ├── shared-assets/       # app icons & branding
│   ├── shared-hooks/        # useWebSocket, useSSE, useOptimistic, useDebounce
│   ├── shared-i18n/         # Lingui translations
│   ├── shared-schemas/      # Zod ↔ Rust type parity
│   ├── shared-stores/       # Zustand state (auth, UI, onboarding, selections)
│   ├── shared-utils/        # formatDate, formatCurrency, handleApiError
│   ├── types/               # shared TS types
│   ├── ui/                  # unified component shell + interior library
│   ├── test-utils/          # mock providers & helpers
│   └── vite-preset/         # single Vite config for all apps
│
└── crates/                  # 30 Rust crates (backend)
    ├── ataqu-bin/           # binary entry point (`ataqu` + `migrator`)
    ├── ataqu-api/           # Axum handlers + middleware
    ├── ataqu-application/   # service layer (domain orchestration)
    ├── ataqu-kernel/        # shared traits & types
    ├── ataqu-contracts/     # cross-domain event types
    ├── ataqu-security/      # PII redaction, encryption
    ├── ataqu-admin/         # admin CLI (health, audit, migrate)
    ├── ataqu-domain-*/      # 20 domain crates (pure Rust, zero deps)
    └── ataqu-infra-*/       # infrastructure (outbox, cron, pools, storage, migration)
```

### Notable cross-cutting crates

- **`ataqu-domain-health`** — typed system health model (`Nominal` / `Degraded` / `Critical`) with a pure outbox classifier.
- **`ataqu-domain-gdpr`** — a compiled registry of every tenant-scoped table plus a saga state machine for tenant deletion (`deactivate_users → anonymize_pii → delete_s3_files → purge_tables → complete`).
- **`ataqu-infra-outbox`** — unified outbox dispatcher using `LISTEN/NOTIFY` plus `FOR UPDATE SKIP LOCKED`, exponential backoff, and a dead-letter queue after 5 attempts.
- **`ataqu-infra-idempotency`** — advisory-lock + durable-record idempotency guard with an in-memory Moka hot path.
- **`ataqu-security`** — `TenantId` newtype, `Email`/`PhoneNumber` PII newtypes that only reveal behind a `PiiAccessKey`, AES-GCM encryption helpers.

---

## What makes it different

- **One database, one binary, ten apps.** No microservices. No Kafka. PostgreSQL `LISTEN/NOTIFY` is the event bus.
- **Bounded contexts enforced by the database itself.** Each domain gets a schema and a PostgreSQL role; RLS policies prevent cross-domain event spoofing at the query planner.
- **Exactly-once, not at-least-once.** Advisory locks + `core.idempotency_records` give deterministic request replay with 2⁻⁶⁴ collision risk.
- **PII cannot leak by accident.** `Email` and `PhoneNumber` don't implement `Serialize`; they're wrapped in `ApiEmail`/`ApiPhone` at the API boundary, and `Debug`/`Display` redact.
- **Escape hatch, not lock-in.** 1-click cancellation, CSV/JSON export from every app, and 30-day data deletion.

---

## Contributing

Development workflow, conventions, and commit style live in [`CONTRIBUTING.md`](CONTRIBUTING.md). In short:

1. Create a branch: `task-<number>/<description>`
2. Make changes following conventions (TypeScript strict, no `any`, Lingui for user-visible strings)
3. Run quality gates: `pnpm lint && pnpm test && pnpm build`
4. Commit with a conventional commit message
5. Push and open a PR

> [!TIP]
> The CI pipeline runs `pnpm lint`, `pnpm test`, `pnpm test:coverage`, `pnpm build`, `pnpm test:e2e`, plus `cargo fmt --check`, `cargo clippy -D warnings`, `cargo build`, and `cargo test`. Run them locally before pushing.
