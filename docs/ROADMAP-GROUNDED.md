# ATAQU — GROUNDED BUILD ROADMAP

**Date:** 2026-08-16
**Method:** Audited the actual repo (Rust handlers, `packages/api-client`, `packages/ui`, `apps/*`) rather than trusting the spec/tracker blindly. This corrects an earlier wrong read that claimed "Unified Search / System Health / Command Palette are not built." They ARE built on the backend and partially on the frontend — the real work is **wiring + completion**, not from-scratch.

---

## 1. What is VERIFIED already built

### Backend (real, compiling)
- **Unified Search**: `crates/ataqu-api/src/handlers/search.rs` → `unified_search` queries all 10 apps (cinq contacts, dial messages, pivot docs, pause employees, aegis users, vault products, spark workflows, vista dashboards, tempo event types, sond forms). Registered at `/api/search` (lib.rs) + `/api/v1/search`.
- **System Health**: `/api/v1/health/status`, `/health`, `/admin/health` all registered. `health_service.rs` + `ataqu-domain-health::SystemHealth` (outbox lag, spark DLQ, db pools) real, Moka-cached with critical fallback.
- **Audit**: `core.audit_logs` written globally by `middleware/audit.rs`; `audit_repo.rs`, `aegis_service` audit fns, `health_service` all real.
- All 10 app domains/services/migrations/handlers exist (closed client↔server gaps this session).

### Frontend foundation (real)
- `@ataqu/ui`: `Shell`, `CommandPalette`, `EmptyState`, `OnboardTour`, `DashboardLayout`, `AuthLayout` all exist. TASK-000 shell is done.
- `CommandPalette` (`packages/ui/src/components/command-palette.tsx`): ⌘K opens it; has **Switch App**, **Navigation**, **Account** groups + a **Search Results** group driven by an optional `searchFn` prop.
- `apps/aegis/src/routes/_auth/admin/audit.tsx` (6.9KB) + `access-matrix.tsx` (3.6KB) exist and import real api-client types → Access Governance is likely largely functional (verify during build).
- Every app has `actions.ts` and real routes/components (23–41 ts/tsx files each).

---

## 2. The REAL gaps (what to actually build)

### A. Cross-cutting P0 — wiring/completion (highest leverage, unblocks all apps)

**A1. Wire Unified Search end-to-end** (backend done, frontend dead)
- Add `search(q, limit?)` + `useSearch` to `packages/api-client` hitting `/api/search`.
- `packages/ui/src/components/shell.tsx` must pass `searchFn` to `<CommandPalette>` (currently does NOT — Shell imports no search client).
- `UnifiedSearchResult` has no `url`; the palette navigates to `item.url`. **Fix:** map each result to its app route (e.g. `cinq/contacts/:id`, `dial/#/channels/:id`, `pivot/docs/:id`) and render an **app badge** ("CINQ · Contact"). Replace the placeholder `console.log("Search opened")` Global Search command.
- Add `limit` debounce already exists (300ms) — keep.

**A2. Wire Command Palette per-app actions** (spec: 100+ actions; none registered)
- Each `apps/*/src/actions.ts` exists but registers nothing. Need a registration mechanism (e.g. `useRegisterCommand` from shared-hooks or a palette context) and wire each app's actions into the global palette. Start with AEGIS + CINQ (most actions), then the rest.

**A3. System Health widget + VISTA dashboard** (backend done, frontend missing)
- Add `getHealth()` + `useHealth` to api-client.
- Add a **health dot** to `Shell` header (green/amber/red + "All systems nominal" / "1 workflow failed" / "Outbox lag: 2s"), polling `/api/v1/health/status` every 10s.
- Add VISTA `/health` dashboard page rendering components (outbox lag, spark DLQ depth, db pool usage) + alerting toasts on degradation.

**A4. Verify Access Governance + Audit are functional**
- `access-matrix.tsx` + `audit.tsx` likely done. During A3 build, confirm role update + audit export work; fill only real gaps.

### B. Per-app P0/P1 features (from `docs/tasks/tasks-frontend.md` — ~40% gap)

| App | Missing P0/P1 (verified by spec vs current code) |
|-----|---------------------------------------------------|
| **DIAL** | Threads, reactions, mentions, file sharing, presence, focus mode, ticket inbox, CINQ-context badge |
| **CINQ** | Custom Fields (JSONB) UI, email-tracking display, cross-app VAULT stock badge, integration toggles |
| **SOND** | Conditional logic builder, conversational mode, routing |
| **VAULT** | Variants, low-stock alerts, reservations |
| **TEMPO** | No-show workflows, ultra-simple public booking UX |
| **VISTA** | Cross-app dashboards (Revenue+Inventory, Support+Sales), "Combine Data" |
| **PIVOT** | Templates, version history, bulk row actions |
| **AEGIS** | SSO/MFA UX completeness, micro-tours |
| **PAUSE** | Establishments/leave, employee projections |
| **SPARK** | Workflow runs UI, DLQ viewer |

Plus cross-cutting: Onboarding tracker (2.10), Changelog (2.12), Bulk Actions (2.2), Selection Persistence (2.7), Migration Wizards (2.13), Conditional Routing (2.4), Validation Workflows (2.5).

**Stub/placeholder surface:** 43 app source files contain TODO/placeholder/stub markers — confirms incremental unfinished work, not absence.

---

## 3. Proposed build order (grounded, verify-after-each)

1. **A1 Unified Search wiring** — biggest "already-there-but-dead" win. (backend exists)
2. **A2 Command Palette actions** — connective tissue for all apps.
3. **A3 System Health widget + VISTA page** — differentiator, backend exists.
4. **A4 Verify Access Governance/Audit** — likely minor.
5. **Per-app B** in spec-priority order: DIAL → CINQ → SOND → VAULT → TEMPO → VISTA → PIVOT → AEGIS → PAUSE → SPARK.
6. **Remaining cross-cutting** (onboarding, changelog, bulk actions, selection persistence, migration wizards).

Each item: build → `cargo check` (Rust) + `pnpm typecheck` + `pnpm lint` + `pnpm test` → commit → push.

---

## 4. Scope note
"Everything" = A1–A4 + all B items + remaining cross-cutting. That is a large, multi-session effort. Recommend building **one grounded increment at a time** (start A1), verifying, committing, and continuing — rather than a single massive pass.
