# 🏗️ SAAS FACTORY — DEFINITIVE TECH STACK (v3)

**Version:** 3.2
**Date:** 2026-07-28
**Status:** Finalized (Ready for Implementation)

---

## 🔬 TECHNICAL CHOICES PHILOSOPHY

1. **Performant and lightweight** → Rust (backend) / Vite + Rolldown + React (frontend)
2. **Type-safe** → TypeScript 5.9 + Zod 4 (frontend) / SeaORM 2.0 + Serde (backend)
3. **Maintainable** → Monorepo, up-to-date dependencies, **Biome** (unified lint + format)
4. **Smooth UX** → shadcn/ui + Tailwind 4, TanStack Query & Router, **TanStack Virtual**
5. **Modern** → React 19, Vite 8 (Rolldown), Rust 2024 edition

---

## 🦀 BACKEND — RUST STACK

### Runtime & Language

| Component | Version | Justification |
|-----------|---------|---------------|
| **Rust** | 1.75.0+ | Stable, 2021 edition, memory & performance |
| **Tokio** | 1.36.0 | Async runtime, thread-safe, production-ready |

### Web Framework

| Component | Version | Justification |
|-----------|---------|---------------|
| **Axum** | 0.7.5+ | Type-safe, ergonomic, WebSocket-ready |
| **Tower** | 0.4.13 | Middleware stack (logging, CORS, auth) |
| **Tower-HTTP** | 0.5.2 | Trace, compression, rate limiting |

### Database & ORM

| Component | Version | Justification |
|-----------|---------|---------------|
| **Database** | Local PostgreSQL | 16 | Native RLS, high concurrency, managed backups, connection pooling |
| **SeaORM** | 1.1.13+ | Async, Entity First Workflow, migrations |
| **SQLx** | 0.9.0 | DB Connector (compatible with SeaORM) |
| **sea-orm-migration** | 2.0.0-rc.31 | Versioned migration management |

### Authentication & Security

| Component | Version | Justification |
|-----------|---------|---------------|
| **jsonwebtoken** | 9.2.0 | JWT (RS256) |
| **oauth2** | 4.4.0 | OIDC (Google, Microsoft, Okta) |
| **totp-rs** | 3.0.0 | TOTP MFA (RFC 6238) |
| **argon2** | 0.5.3 | Password hashing |

### Full-Text Search

| Component | Version | Justification |
|-----------|---------|---------------|
| **Tantivy** | 0.21.0 | Full-text search (PIVOT, DIAL) |

### Payment

| Component | Version | Justification |
|-----------|---------|---------------|
| **async-stripe** | 0.35.1 | Stripe webhooks, subscriptions |

### Logging & Monitoring

| Component | Version | Justification |
|-----------|---------|---------------|
| **Tracing** | 0.1.40 | Structured logs, spans |
| **tracing-subscriber** | 0.3.18 | Formatted logs for env/prod |

### Serialization & Errors

| Component | Version | Justification |
|-----------|---------|---------------|
| **Serde** | 1.0.197 | JSON (Syn 3) |
| **serde_json** | 1.0.114 | JSON handling |
| **thiserror** | 1.0.58 | Typed business errors |
| **anyhow** | 1.0.81 | Generic errors |

### Utilities

| Component | Version | Justification |
|-----------|---------|---------------|
| **Clap** | 4.5.3 | CLI arguments |
| **Chrono** | 0.4.35 | Dates & time |
| **UUID** | 1.7.0 | UUID v4 |

### Email

| Component | Version | Justification |
|-----------|---------|---------------|
| **Managed External Provider** | N/A (e.g., SendGrid/Postmark) | Offloads SMTP overhead from VPS, better deliverability. Stalwart completely removed. |
| **lettre** | latest | Sending emails via Rust (API integration with provider) |

---

## ⚛️ FRONTEND — REACT STACK

### Runtime & Language

| Component | Version | Justification |
|-----------|---------|---------------|
| **Node.js** | 20.11.1 LTS | Support until April 2026 |
| **pnpm** | 8.15.4 | Package manager, workspaces, fast |
| **TypeScript** | 5.3.3 | Strict typing, import defer support |

### Linting & Formatting

| Component | Version | Justification |
|-----------|---------|---------------|
| **Biome** | 1.5.3 | **Replaces ESLint + Prettier** — 10× faster, single config |

### Framework & Bundler

| Component | Version | Justification |
|-----------|---------|---------------|
| **React** | 18.2.0 | UI Framework |
| **Vite** | 8.0.0 | Bundler (Rolldown) — 10-30x faster builds |
| **@vitejs/plugin-react** | 6.0.4 | React plugin for Vite |

### UI & Styling

| Component | Version | Justification |
|-----------|---------|---------------|
| **Tailwind CSS** | 3.4.1 | CSS-first, centralized config, shared tokens |
| **shadcn/ui** | CLI v0.8.0 | Accessible components, Base UI default, presets system |
| **@tailwindcss/vite** | 0.9.0 | Tailwind 3 + Vite integration |

### Routing & Data

| Component | Version | Justification |
|-----------|---------|---------------|
| **TanStack Router** | v1.16.0 | Typed, type-safe, suspense-ready |
| **TanStack Query** | v5.24.0 | Cache, invalidation, mutations |
| **Zustand** | 4.5.2 | Lightweight state management (stores) |
| **TanStack Virtual** | 3.1.3 | **Virtualization for all long lists** (optimized iOS perf) |

**TanStack Virtual — App Usage:**
| App | Usage |
|-----|-------|
| PIVOT | Long lists of tasks, docs |
| DIAL | Message history |
| CINQ | List of deals/leads |
| VAULT | Product catalog |
| VISTA | Large data tables |

### Tables & Data Grids (PIVOT, CINQ, VAULT, VISTA)

| Component | Version | Justification |
|-----------|---------|---------------|
| **TanStack Table** | v8.11.7 | Headless, tree-shakable, improved state management |

### Forms & Validation

| Component | Version | Justification |
|-----------|---------|---------------|
| **React Hook Form** | 7.50.1 | Performant, uncontrolled |
| **Zod** | 3.22.4 | Schema validation (integrated RHF) |
| **@hookform/resolvers** | 3.3.4 | Bridge RHF + Zod |

### Internationalization

| Component | Version | Justification |
|-----------|---------|---------------|
| **Lingui** | 4.5.0 | Extraction, compilation |

---

## 🧩 FRONTEND — BY FEATURE (Single Selection)

### Charts & Dashboards (VISTA)

| Component | Version | Justification |
|-----------|---------|---------------|
| **Recharts** | 2.12.0 | Standard dashboards (80% of cases), new animations |
| **Apache ECharts** | 5.4.3 | Large volumes & advanced interactions |

### Rich Text Editor (PIVOT — Docs)

| Component | Version | Justification |
|-----------|---------|---------------|
| **BlockNote** | latest (0.21+) | Notion-like editor (blocks, slash menu) — closest to Notion UX, built on ProseMirror & Tiptap |

### Kanban Board (PIVOT)

| Component | Version | Justification |
|-----------|---------|---------------|
| **@dnd-kit/core** | 6.1.0+ | Accessible drag & drop, hooks-based, tactile |
| **@dnd-kit/sortable** | 7.0.2+ | Multi-list drag & drop |

### Form Builder (SOND)

| Component | Version | Justification |
|-----------|---------|---------------|
| **SurveyJS** | v3.0.0-beta.8+ | Dynamic forms, surveys, quizzes — MIT, unified styling |

### Chat UI (DIAL)

| Component | Version | Justification |
|-----------|---------|---------------|
| **assistant-ui** | 0.12.1+ | ChatGPT-like UI — streaming, auto-scroll, accessible |
| **TanStack Virtual** | 3.13.26+ | **Message history virtualization** |

### Workflow Builder (SPARK)

| Component | Version | Justification |
|-----------|---------|---------------|
| **React Flow** (@xyflow/react) | 12.3.0 | Reference for workflow editors (n8n, Langflow) — integrates shadcn/ui |

### Calendar / Scheduler (TEMPO, PAUSE)

| Component | Version | Justification |
|-----------|---------|---------------|
| **@ilamy/calendar** | latest | Tailwind 4 + shadcn/ui, RFC 5545 recurring events, drag & drop |

### Authentication UI (AEGIS)

| Component | Version | Justification |
|-----------|---------|---------------|
| **Custom (shadcn/ui)** | — | In-house UI with shadcn/ui |

### Email Editor (CINQ)

| Component | Version | Justification |
|-----------|---------|---------------|
| **react-email** | 1.6.1 | Email components — unified package |

### Common Utilities

| Component | Version | Usage |
|-----------|---------|-------|
| **react-day-picker** | 10.0.1 | Date picker (forms) |
| **@kalyx/react** | 1.0.1 | Date/Time picker headless, SSR-safe |
| **react-toaster-message** | latest | Toasts with Framer Motion |
| **@files-ui/react** | latest | File upload (drag & drop, validation) |
| **TanStack Virtual** | 3.13.26+ | **Virtualization for all long lists** |

---

## 🖥️ DESKTOP (OPTIONAL — V2)

| Component | Version | Justification |
|-----------|---------|---------------|
| **Tauri** | 1.5.11 | Lightweight desktop app, Rust backend, React frontend |

---

## 🏗️ INFRASTRUCTURE

| Component | Version | Justification |
|-----------|---------|---------------|
| **VPS** | IONOS XL | 8 vCPU / 16 GB RAM / 160 GB SSD — 25€/month (~30$) |
| **CDN** | Cloudflare | Free, DDoS protection, SSL |
| **Process Manager** | systemd | Native Linux process supervision, zero daemon overhead |
| **Reverse Proxy** | Caddy | Automatic HTTPS, native systemd integration, low RAM footprint |
| **CI/CD** | GitHub Actions | Pipeline build → test → deploy |
| **Storage** | Cloudflare R2 | S3-compatible, zero egress fees, managed |
| **Email** | Managed External Provider (e.g., SendGrid/Postmark) | Offloaded from VPS, better deliverability |
| **Monitoring** | Rustrak | Self-hosted, lightweight |

---

## 📦 MONOREPO — STRUCTURE

```
saas-factory/
├── Cargo.toml                          # Rust Workspace (centralized deps)
├── pnpm-workspace.yaml                 # Frontend workspace
├── biome.json                          # Biome Configuration (lint + format)
├── crates/                             # Shared Rust crates
│   ├── shared-core/                    # Base types
│   ├── shared-db/                      # SeaORM + migrations
│   ├── shared-auth/                    # JWT, OAuth2, middlewares
│   ├── shared-billing/                 # Stripe
│   ├── shared-email/                   # Stalwart + templating
│   ├── shared-observability/           # Tracing + logging
│   ├── shared-storage/                 # Garage (S3)
│   └── shared-queue/                   # (optional)
├── packages/                           # Shared frontend
│   ├── ui/                             # shadcn/ui + components
│   ├── tailwind-config/                # Shared Tailwind tokens
│   ├── shared-hooks/                   # React Hooks
│   └── shared-utils/                   # Utilities
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

## ✅ SUMMARY — KEY VERSIONS

| Category | Dependency | Version |
|----------|------------|---------|
| **Rust** | Rust | 1.75.0+ (2021 edition) |
| **Rust** | Axum | 0.7.0+ |
| **Rust** | SeaORM | 1.1.0+ |
| **Rust** | Tokio | 1.36.0 |
| **Rust** | jsonwebtoken | 9.2.0 |
| **Rust** | anyhow | 1.0.79 |
| **Node** | Node.js | 20.11.1 LTS |
| **Node** | pnpm | 8.15.0 |
| **Node** | TypeScript | 5.3.3 |
| **Frontend** | React | 18.2.0 |
| **Frontend** | Vite | 5.0.0 |
| **Frontend** | Tailwind CSS | 3.4.0 |
| **Frontend** | shadcn/ui | CLI v4 |
| **Frontend** | TanStack Router | v1.170.15+ |
| **Frontend** | TanStack Query | v5.101.0+ |
| **Frontend** | TanStack Table | v9 (beta) |
| **Frontend** | TanStack Virtual | 3.13.26+ |
| **Frontend** | React Hook Form | 7.77.0+ |
| **Frontend** | Zod | 4.4.0+ |
| **Frontend** | Lingui | 6.5.0 |
| **Frontend** | Biome | 2.5.5 |
| **Frontend** | Recharts | 3.9.0+ |
| **Frontend** | Apache ECharts | 6.1.0+ |
| **Frontend** | React Flow | 12.10.1+ |
| **Frontend** | @ilamy/calendar | latest |
| **Frontend** | react-email | 6.9.0 |
| **Desktop** | Tauri | 2.11.5 |

---

**Document created on 2026-07-28 — Ready for implementation.**

