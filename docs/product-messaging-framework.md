# 🧩 ATAQU PRODUCT MESSAGING FRAMEWORK — Version 2.5 (Phase 1)
### The Deep-Dive Narrative Blueprint for the Unified SMB OS

> **Executive Note:** This is not a feature list. In 2026, B2B buyers suffer from "Feature Fatigue." They don't care that your CRM has drag-and-drop; they care that it doesn't charge them $1,200/year to connect to their chat tool. This framework applies the Jobs-to-be-Done (JTBD) methodology and Category Design principles to each of the 10 Ataqu apps. We do not sell software; we sell the eradication of a specific class of SaaS vendor abuse. Every app is a wedge to decommission the fragmented stack.

---

## The Messaging Architecture
For each app, the messaging is structured across four strategic layers:
1. **The Incumbent's Fatal Flaw:** Why the market leader is fundamentally broken (not just expensive, but architecturally or economically flawed).
2. **The Ataqu Narrative (The Weapon):** How Ataqu solves this using the Unified OS philosophy.
3. **The Architectural Proof (Phase 1 – Rust + PostgreSQL + SeaORM 2.0 + Raw SQL):** The specific Rust, PostgreSQL, SeaORM, and raw SQL mechanisms that make our claim bulletproof.
4. **The OS Compound Effect:** Why being part of Ataqu makes this app 10x more valuable than the standalone competitor.

---

## 1. PIVOT (Productivity)
*Attacking: Notion, ClickUp, Airtable*

* **The Incumbent's Fatal Flaw:** "The Blank Canvas Graveyard." Notion and ClickUp give you infinite flexibility, which leads to infinite configuration time. Worse, they treat your data like a walled garden—trapping your operational data behind fragile APIs and charging per-user for access.
* **The Ataqu Narrative:** PIVOT is an opinionated, high-density operational database with a doc UI. We don't sell flexibility; we sell velocity. Your project data lives in the same PostgreSQL ecosystem as your CRM and Inventory. No APIs required.
* **The Architectural Proof:** PostgreSQL `tsvector` with GIN indexes, updated asynchronously via outbox consumers with `LISTEN/NOTIFY`. Search queries return sub-15ms results. Views are stored as `JSONB` on the `pivot_databases` table.
* **The OS Compound Effect:** A PIVOT task isn't just a text block. It can be natively foreign-keyed to a CINQ deal and a VAULT product variant using shared IDs. When the deal closes, the PIVOT task auto-updates via the unified outbox with `LISTEN/NOTIFY`, RLS, and type‑safe `schema` ENUM. No Zapier required.
* **Hero Copy:** *"Notion is a blank page. PIVOT is an operational database. Stop configuring your productivity tool and start running your business."*

## 2. SOND (Forms & Surveys)
*Attacking: Typeform, SurveyMonkey*

* **The Incumbent's Fatal Flaw:** "The Response Tax." Typeform charges you a premium based on how successful your form is. The more data you collect, the more they penalize you with arbitrary response limits. Furthermore, the data goes to a silo, requiring Zapier to bring it back to your CRM.
* **The Ataqu Narrative:** SOND eradicates the response tax. Forms are a utility, not a premium feature. A form submission is just a direct `INSERT` into your unified PostgreSQL database via SeaORM. The generic `transactional_batch_insert` helper handles CSV imports with chunked, transient-safe fallback and full DLQ payload preservation.
* **The Architectural Proof:** Strongly typed Rust structs and SeaORM entities validate form schemas at the API gateway before they ever hit PostgreSQL. Zero malformed data. Zero junk responses. PII fields (`Email`, `PhoneNumber`) are newtypes with `Debug`/`Display` as `[REDACTED]`; they do not implement `Serialize`; JSON serialization is handled by API wrapper structs.
* **The OS Compound Effect:** A SOND form submission doesn't just create a row in a spreadsheet. In one atomic transaction, it creates a CINQ lead, triggers a SPARK welcome email, and pings the sales team in DIAL – all via outbox events with `LISTEN/NOTIFY`.
* **Hero Copy:** *"Stop paying a tax on your own success. Unlimited forms, native CRM ingestion. SOND does what Typeform does, minus the ransom."*

## 3. DIAL (Chat & Support)
*Attacking: Slack, Intercom*

* **The Incumbent's Fatal Flaw:** "The Context Chasm." Slack charges per active user, incentivizing you to limit who gets access. Intercom charges a fortune for customer support. Worse, your internal chat and your customer support are completely disconnected. Your support agents can't ping a developer without switching apps.
* **The Ataqu Narrative:** DIAL unifies internal team communication and external customer support in one natively secure perimeter. Flat rate. No per-user taxes.
* **The Architectural Proof:** Native WebSocket ingestion handled directly in the Axum task. PostgreSQL `SAVEPOINT` isolation via SeaORM nested transactions + raw SQL ensures poison messages are cleanly isolated without lock contention. The unified outbox fan‑out delivers messages to cross‑app integrations via `LISTEN/NOTIFY` with RLS, Column-Level Privileges, and type‑safe `schema` ENUM. The generic `transactional_batch_insert` helper uses chunked fallback (100), transient errors abort immediately, and data violations preserve full DLQ payloads via `T: Clone`.
* **The OS Compound Effect:** When a customer messages support in DIAL, the agent sees their CINQ deal history, their VAULT order status, and their PIVOT onboarding tasks in the same sidebar – all populated from the same PostgreSQL ecosystem.
* **Hero Copy:** *"Slack taxes your team. Intercom taxes your customers. DIAL unites them. One secure perimeter, zero per-user fees."*

## 4. SPARK (Automation)
*Attacking: Zapier, Make*

* **The Incumbent's Fatal Flaw:** "The Brittle Bridge." Zapier is a third-party tax on your data. It charges per task, uses polling (which is slow), and breaks every time a vendor changes an API. It is an architectural band-aid.
* **The Ataqu Narrative:** SPARK is not a bridge; it is the shared foundation. The 10 Ataqu apps already share the same PostgreSQL ecosystem. SPARK simply turns the lights on. Zero task limits. Zero brittle webhooks.
* **The Architectural Proof:** The outbox relay is driven by `LISTEN/NOTIFY` — instant push-based delivery. Safety‑net polling (5 seconds) catches any missed notifications. Exactly‑once delivery is guaranteed by the outbox table and idempotent consumers. Heavy jobs acquire a lease in `core.job_leases` using a state‑machine (`locked` → `completed`) with monotonic timestamps. RLS prevents cross-domain event spoofing; Column-Level Privileges prevent dispatcher payload tampering.
* **The OS Compound Effect:** You don't "build a Zap." You toggle a native integration. "When CINQ deal is won -> Reserve VAULT stock -> Create PIVOT onboarding task." Instant, deterministic, free.
* **Hero Copy:** *"Zapier is a brittle bridge between walled gardens. SPARK is the foundation. Zero task limits. Zero webhooks. Just native database triggers."*

## 5. TEMPO (Scheduling)
*Attacking: Calendly*

* **The Incumbent's Fatal Flaw:** "The Scheduling Island." Calendly is a fine tool, but it lives in isolation. It costs $15/user/mo simply to read a calendar and generate a link. It creates events, but doesn't update your CRM or trigger automations without Zapier. Worse, no‑show follow‑ups arrive a day later, making them useless.
* **The Ataqu Narrative:** Scheduling is a utility, not a standalone product. TEMPO is built into the OS. No‑show detection happens within 15‑30 minutes of a missed meeting, using a sargable generated `ends_at` column and a 24‑hour upper bound.
* **The Architectural Proof:** OAuth tokens for Google/Outlook integrations are strictly encrypted via AES-256-GCM envelope encryption managed by the `ataqu-crypto` crate. The `no_show_worker` runs every 5 minutes, checking `WHERE ends_at < NOW() - INTERVAL '15 minutes' AND ends_at > NOW() - INTERVAL '24 hours' AND status = 'scheduled'`. This query is fully sargable and bounded.
* **The OS Compound Effect:** When a prospect books a meeting via TEMPO, it creates a CINQ activity, alerts the assigned rep in DIAL, and pauses a SPARK outreach sequence in one atomic outbox transaction. When the meeting is missed, the host gets a follow‑up email within minutes, not hours.
* **Hero Copy:** *"Scheduling is a feature, not a $15/month product. TEMPO books the meeting, updates your CRM natively, and follows up on no‑shows within 15 minutes."*

## 6. CINQ (CRM & Sales)
*Attacking: HubSpot, Pipedrive*

* **The Incumbent's Fatal Flaw:** "The Bait-and-Switch Tollbooth." HubSpot gives you a free CRM, then charges you $1,200/month to unlock basic reporting, workflow automations, and integrations. They use 3-year contracts to fund their bloated go-to-market motion.
* **The Ataqu Narrative:** CINQ is an enterprise-grade CRM without the tollbooth. Every feature is included. $15/month (or part of the $49 suite). No 3-year lock-in. Cancel in 1 click.
* **The Architectural Proof:** Standard mutations strictly enforce `If-Match` ETags for optimistic concurrency. If two reps edit the same deal simultaneously, the database rejects the stale request with a `409 Conflict`. Zero data corruption. Custom fields are stored as `JSONB` with graceful degradation: `@>` exact match (indexed, fast), `->>` ILIKE single-field (scan, acceptable <100K rows), `jsonb_each_text` cross-field (expensive, rate-limited). Email tracking is completely isolated from the CRM database pool via a bounded `tokio::mpsc` channel with `try_send()` and atomic JSONL disk spill (nanos+uuid filenames, processed exactly once). PII fields (`Email`, `PhoneNumber`) are newtypes with `Debug`/`Display` as `[REDACTED]`; they do not implement `Serialize`; JSON serialization is handled by API wrapper structs.
* **The OS Compound Effect:** The CRM is the source of truth. When a deal is won, it emits `CinqDealWonV1` to the unified outbox. VISTA updates the revenue chart, VAULT reserves stock, and DIAL creates an onboarding channel. All natively via the outbox relay with `LISTEN/NOTIFY`, RLS, and Column-Level Privileges.
* **Hero Copy:** *"HubSpot's free CRM is a tollbooth. CINQ is the exit ramp. $15/month, zero lock-in, fully integrated with your entire stack. And your email tracking won't crash your database."*

## 7. VAULT (Inventory & Stock)
*Attacking: Cin7, inFlow*

* **The Incumbent's Fatal Flaw:** "The Siloed Warehouse." Legacy inventory tools live in complete isolation. The sales team closes a deal, but they don't know the warehouse is out of stock until the order fails. Connecting them requires expensive enterprise middleware.
* **The Ataqu Narrative:** VAULT connects your physical stock directly to your sales pipeline and support desk. Real-time, atomic, and native.
* **The Architectural Proof:** Atomic, lockless SQL updates via PostgreSQL `UPDATE ... SET stock_quantity = stock_quantity + $1 WHERE id = $2 AND stock_quantity + $1 >= 0` with a `CHECK` constraint. This guarantees zero overselling during a flash sale, enforced at the database level. No race conditions.
* **The OS Compound Effect:** When a CINQ deal is won, VAULT stock is decremented instantly via an outbox event. If stock hits zero, SPARK pauses the sales sequence. If a customer complains in DIAL, the rep sees the VAULT shipping status immediately.
* **Hero Copy:** *"Your sales team and your warehouse shouldn't need a translator. VAULT connects your inventory natively to your CRM and support."*

## 8. AEGIS (SSO & Security)
*Attacking: Okta, 1Password*

* **The Incumbent's Fatal Flaw:** "The Access Tax." Okta charges $15/user/month simply to manage logins for other SaaS tools. It sits *on top* of your stack, creating a single point of failure and an expensive administrative layer.
* **The Ataqu Narrative:** AEGIS is woven into the source code of Ataqu. SSO is a feature of the OS, not a standalone product. $3/month (or part of the suite). Onboard a new employee in 1 click; they instantly get secure access to 10 apps.
* **The Architectural Proof:** Strict tenant isolation is enforced via private `TenantId` newtype, PostgreSQL Roles, RLS, Column-Level Privileges, type‑safe `schema` ENUM, and sequence grants on `core.outbox`. `core` schema uses `synchronous_commit=on` for audit‑grade durability. JWT revocation is checked against a `moka` cache with a 15s TTL. PII is never logged due to compile‑time redacting newtypes; JSON serialization is isolated to the API layer via wrapper structs.
* **The OS Compound Effect:** AEGIS doesn't just log you in. When an employee is offboarded in PAUSE, AEGIS instantly revokes their access to CINQ, DIAL, and VAULT via a `TenantDeletedV1` outbox event. No manual deprovisioning.
* **Hero Copy:** *"Okta is a gatekeeper standing on top of your stack. AEGIS is the vault built into the foundation. SSO is a feature, not a $15/user ransom."*

## 9. PAUSE (HR & Leave)
*Attacking: Personio, BambooHR*

* **The Incumbent's Fatal Flaw:** "The Compliance Silo." HR tools are overpriced databases that track leave and PII, but they never talk to the operational tools. An employee goes on leave, but their system access remains active.
* **The Ataqu Narrative:** PAUSE handles the essential HR functions natively. Leave requests aren't just tracked; they trigger operational security and scheduling changes across the entire OS.
* **The Architectural Proof:** Automated, irreversible PII anonymization on `tenant.deleted`. GDPR compliance is a database trigger, not a marketing promise. The GDPR saga uses a compiled table registry (no runtime `information_schema` queries). PAUSE emits projection events (e.g., `EmployeeCreatedV1`) that are consumed by CINQ for local read‑models, achieving true bounded context isolation. PII fields (`Email`, `PhoneNumber`) are newtypes with compile‑time redaction and no `Serialize`; serialization is via API wrappers.
* **The OS Compound Effect:** When an employee requests leave in PAUSE, TEMPO automatically blocks their calendar, and AEGIS can optionally suspend their system access. True zero-trust HR.
* **Hero Copy:** *"HR data shouldn't live in a silo. PAUSE connects your team's well-being directly to your operational security and scheduling."*

## 10. VISTA (Analytics & BI)
*Attacking: Tableau, Metabase*

* **The Incumbent's Fatal Flaw:** "The ETL Nightmare." BI tools require data engineering. You must extract data from HubSpot, transform it, load it into Tableau, and pray the pipeline doesn't break. By the time the dashboard loads, the data is stale.
* **The Ataqu Narrative:** VISTA doesn't use data pipelines. The dashboard is already plugged into the source code. Real-time, cross-app analytics with zero ETL.
* **The Architectural Proof:** VISTA maintains pre‑aggregated daily totals computed by background workers. It consumes outbox events via `LISTEN/NOTIFY` for instant updates, and polls `core.outbox` for `vista_consumed_at IS NULL` and `status IN ('completed', 'dlq')` so no events are silently dropped. Aggregation uses `ON CONFLICT (outbox_id) DO UPDATE` to prevent double‑counting. No synchronous API proxying to source domains is allowed.
* **The OS Compound Effect:** When a deal is won in CINQ, the VISTA revenue chart updates via the outbox worker in near‑real time. No ETL. No pipelines. The analytics are just a different lens on the same unified PostgreSQL ecosystem.
* **Hero Copy:** *"Tableau requires a data engineer. VISTA just requires a browser. Real-time analytics, natively connected to your unified OS."*
