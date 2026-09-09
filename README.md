# Ataqu — the $79/mo alternative to the SaaS stack lock-in

**A single Rust + PostgreSQL backend, powering 10 natively integrated business applications delivered as independent Vite + React 19 SPAs.**

Built to kill HubSpot, Slack, Zapier, Notion, Zoho, Calendly, Typeform, Cin7, Personio, and Okta with one math:

> **$15/mo for 1 app · $39/mo for 5 apps · $79/mo for all 10**

---

## Badges

![Rust 1.97](https://img.shields.io/badge/Rust-1.97.1-000000?logo=rust&logoColor=white&style=for-the-badge)
![PostgreSQL 18](https://img.shields.io/badge/PostgreSQL-18-4169E1?logo=postgresql&logoColor=white&style=for-the-badge)
![Vite 8](https://img.shields.io/badge/Vite-8.2.1-646CFF?logo=vite&logoColor=white&style=for-the-badge)
![React 19](https://img.shields.io/badge/React-19.2.7-61DAFB?logo=react&logoColor=black&style=for-the-badge)
![TanStack Router](https://img.shields.io/badge/TanStack_Router-1.170-FF4154?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white&style=for-the-badge)
![pnpm 11](https://img.shields.io/badge/pnpm-11-F6F6F6?logo=pnpm&logoColor=43B02A&style=for-the-badge)
![Axum 0.8](https://img.shields.io/badge/Axum-0.8.9-000000?logo=rust&logoColor=white&style=for-the-badge)
![SeaORM 2.0](https://img.shields.io/badge/SeaORM-2.0.0--rc.41-000000?logo=rust&logoColor=white&style=for-the-badge)
![Biome 2.5](https://img.shields.io/badge/Biome-2.5.8-60A5FA?style=for-the-badge)
![Lingui v6](https://img.shields.io/badge/Lingui-v6-1E90FF?style=for-the-badge)
![Vitest 4](https://img.shields.io/badge/Vitest-4.1.10-6E9F18?logo=vitest&logoColor=white&style=for-the-badge)
![Playwright](https://img.shields.io/badge/Playwright-1.62-000000?logo=playwright&logoColor=white&style=for-the-badge)
![Next.js 16](https://img.shields.io/badge/Next.js-16.3_(landing)-000000?logo=nextdotjs&logoColor=white&style=for-the-badge)

---

## The 10 Apps

Each app is an independent Vite + React 19 SPA with TanStack Router, sharing a unified shell (sidebar, command palette, global navigation). Icons live in [`packages/shared-assets/public/apps/`](packages/shared-assets/public/apps/).

| App | Domain | Purpose |
|---|---|---|
| ![Aegis](packages/shared-assets/public/apps/aegis.png) | **AEGIS** | Authentication, MFA, SSO |
| ![Cinq](packages/shared-assets/public/apps/cinq.png) | **CINQ** | CRM — contacts, deals, tasks, pipelines |
| ![Dial](packages/shared-assets/public/apps/dial.png) | **DIAL** | Team chat & presence |
| ![Pivot](packages/shared-assets/public/apps/pivot.png) | **PIVOT** | Knowledge base / docs |
| ![Spark](packages/shared-assets/public/apps/spark.png) | **SPARK** | Automation & workflow engine |
| ![Tempo](packages/shared-assets/public/apps/tempo.png) | **TEMPO** | Scheduling & availability |
| ![Sond](packages/shared-assets/public/apps/sond.png) | **SOND** | Forms & surveys |
| ![Vault](packages/shared-assets/public/apps/vault.png) | **VAULT** | Inventory management |
| ![Pause](packages/shared-assets/public/apps/pause.png) | **PAUSE** | HR / directory |
| ![Vista](packages/shared-assets/public/apps/vista.png) | **VISTA** | Analytics & dashboards |

---

## Architecture at a glance

```
┌─────────────────────────────────────────────────────────┐
│                Frontend (Vite 8 + React 19)              │
│  10 independent SPAs  ·  TanStack Router  ·  Tailwind   │
│  shared packages: ui · hooks · stores · schemas · i18n  │
└─────────────────────────────────────────────────────────┘
                          │  REST / WebSocket
                          ▼
┌──────────────────────────────────────────────────────────┐
│              Backend (Rust — Axum + SeaORM)               │
│                                                          │
│  24 domain crates (pure Rust, zero async/web deps)       │
│  ┌──────────┐ ┌───────┐ ┌──────┐ ┌───────┐ ┌──────────┐ │
│  │ AEGIS    │ │ CINQ  │ │ DIAL │ │ PIVOT │ │ SPARK    │ │
│  │ auth/MFA │ │ CRM   │ │ chat │ │ docs   │ │ workflows│ │
│  └──────────┘ ┌───────┐ ┌──────┐ ┌───────┐ ┌──────────┐ │
│  ┌──────────┐ │ TEMPO │ │SOND  │ │ VAULT │ │ VISTA    │ │
│  │ PAUSE    │ │schedul│ │forms │ │invtry │ │ analytics│ │
│  └──────────┘ └───────┘ └──────┘ └───────┘ └──────────┘ │
│                                                          │
│  Infra: outbox · idempotency · cron · pools · storage     │
│  Kernel: shared traits, types, errors                   │
└──────────────────────────────────────────────────────────┘
                          │  SQLx (TLS)
                          ▼
┌──────────────────────────────────────────────────────────┐
│              PostgreSQL 18 (multi-tenant)                │
│              RLS · indexes · migrations                    │
└──────────────────────────────────────────────────────────┘
```

### Key technical decisions

- **Rust backend** — Axum 0.8 HTTP server, SeaORM 2.0 RC with SQLx PostgreSQL driver, Tokio 1.52 async runtime. Compiled to a single native binary.
- **Domain-Driven Design** — 24 Rust crates cleanly separated: domain logic crates have zero async/web/database dependencies (only `serde`, `chrono`, `uuid`, `thiserror` + `ataqu-kernel`). Application services orchestrate. API layer (Axum handlers) is the only integration boundary.
- **Clean monorepo** — pnpm 11 workspaces: 10 Vite SPAs + landing + 10 shared TS packages. A single `@ataqu/vite-preset` config is imported by every app for zero-config builds.
- **Native integrations, no Zapier** — DIAL (chat), CINQ (CRM), VAULT (inventory) sync via a shared PostgreSQL outbox — when a deal is won, other apps update instantly without webhook glue.
- **i18n first** — Lingui v6 with `en` and `fr` locales extracted via macros, compiled to message catalogs.
- **Type safety end-to-end** — Zod schemas on the frontend (`@ataqu/shared-schemas`) mirror Rust domain types. API client (in `packages/api-client`) is generated from Rust code with `pnpm generate:api`.
- **Quality gates** — Biome 2.5 linter/formatter, Vitest 4 unit tests, Playwright 1.62 E2E tests, `cargo clippy` + `cargo test` for the Rust side.

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
| Testing | Vitest 4, Playwright 1.62 |
| Linting | Biome 2.5 |
| Infra | Docker, SeaORM migrations |

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

# 3. Run all apps in development
pnpm dev

# 4. (Optional) Generate API client from Rust
pnpm generate:api
```

### Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Run all 10 apps in parallel (dev mode) |
| `pnpm build` | Build all apps for production |
| `pnpm test` | Run Vitest unit tests |
| `pnpm test:e2e` | Run Playwright E2E tests |
| `pnpm lint` | Run Biome (check + auto-fix) |
| `pnpm typecheck` | Type-check all TypeScript packages |
| `pnpm extract` | Extract i18n messages (Lingui) |
| `pnpm compile` | Compile i18n message catalogs |
| `pnpm generate:api` | Regenerate TypeScript API client from Rust code |
| `cargo test` | Run Rust unit + integration tests |
| `cargo clippy` | Lint Rust code |
| `just test-integration` | Full integration test suite (Docker PostgreSQL) |

---

## Workspace structure

```
ataqu-suite/
├── apps/                     # 10 Vite SPAs + landing
│   ├── aegis/               # auth & SSO
│   ├── cinq/                # CRM
│   ├── dial/                # chat
│   ├── landing/             # marketing website (ataqu.com) — Next.js
│   ├── pause/               # HR
│   ├── pivot/               # knowledge base
│   ├── sond/                # forms & surveys
│   ├── spark/               # automation workflows
│   ├── tempo/               # scheduling
│   ├── vault/               # inventory
│   └── vista/               # analytics & dashboards
│
├── packages/                # shared TypeScript libraries
│   ├── api-client/          # generated API client
│   ├── shared-assets/       # app icons & branding
│   ├── shared-hooks/        # useWebSocket, useSSE, useOptimistic
│   ├── shared-i18n/         # Lingui translations
│   ├── shared-schemas/      # Zod ↔ Rust type parity
│   ├── shared-stores/       # Zustand state (auth, UI)
│   ├── shared-utils/        # formatDate, formatCurrency, etc.
│   ├── types/               # shared TS types
│   ├── ui/                  # unified component shell
│   └── vite-preset/         # single Vite config for all apps
│
└── crates/                  # 24 Rust crates (backend)
    ├── ataqu-bin/           # binary entry point
    ├── ataqu-api/           # Axum handlers + middleware
    ├── ataqu-application/   # service layer (domain orchestration)
    ├── ataqu-kernel/        # shared traits & types
    ├── ataqu-domain-*/      # 11 domain crates (pure Rust, zero deps)
    ├── ataqu-infra-*/       # infrastructure (outbox, cron, pools, migration)
    ├── ataqu-contracts/     # cross-domain event types
    ├── ataqu-security/      # security utilities
    └── ataqu-admin/         # admin tooling
```

---

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the development workflow.

1. Create a branch: `task-<number>/<description>`
2. Make changes following conventions (TypeScript strict, no `any`, Lingui for strings)
3. Run quality gates: `pnpm lint && pnpm test && pnpm build`
4. Commit with conventional commits
5. Push and open a PR

---

## License

Private — all rights reserved. Ataqu IP includes the Rust codebase, UI design, and the "Ataqu" brand.
