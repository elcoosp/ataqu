# 📡 ATAQU COMPETITIVE RADAR & FEATURE GAP ANALYSIS — Version 1.6 (Phase 1)
### The Strategic Blueprint for the 80/20 Feature Pipeline

> **Executive Note:** You cannot build a better HubSpot by cloning 100% of its features; that is how you get bloat. You build a better HubSpot by cloning the 20% of features that deliver 80% of the value, making them 10x faster with Rust and PostgreSQL, and natively integrating them with the rest of the OS. This document bridges the gap between our Marketing "Kill Sheets" and our upcoming Product Requirements Documents (PRDs). It defines exactly what we will build, what we will explicitly ignore, and where our competitors' fatal architectural flaws lie.

---

## 1. THE COMPETITIVE RADAR (Strategic Matrix)

We do not track competitors to copy them; we track them to exploit their weaknesses. This matrix is updated quarterly to monitor their pricing shifts, architectural debt, and support degradation.

| Competitor | Category | Their Fatal Flaw (Our Attack Vector) | Their Moat (What we don't copy) | Ataqu Counter‑Strategy |
|------------|----------|--------------------------------------|---------------------------------|------------------------|
| **HubSpot** | CRM (CINQ) | **The Tollbooth:** Bait‑and‑switch pricing. Free CRM, but $1,200/mo for reporting and automation. 3‑year lock‑in. | Massive ecosystem of 3rd‑party integrations and educational certifications. | **The OS Hook:** Flat $49/mo. Reporting (VISTA) and Automation (SPARK) are natively integrated and included. Zero lock‑in. Custom fields use PostgreSQL `JSONB` with graceful degradation (`@>` exact match → `->>` ILIKE → rate‑limited `jsonb_each_text`). Email tracking isolated via bounded channel with atomic JSONL spill (processed exactly once). PII redacted at compile time via redacting newtypes (`Debug`/`Display` as `[REDACTED]`); newtypes do **not** implement `Serialize`; JSON serialization is strictly isolated to the API layer via wrapper structs. Email tracking isolated via bounded channel with atomic JSONL spill (processed exactly once). PII redacted at compile time via redacting newtypes (`Debug`/`Display` as `[REDACTED]`); newtypes do **not** implement `Serialize`; JSON serialization is strictly isolated to the API layer via wrapper structs. |
| **Slack** | Chat (DIAL) | **The Per‑User Tax:** Charges per active user. Context switching between internal chat (Slack) and external support (Intercom). | Ubiquity. "Slack me" is a verb. High user stickiness. | **The OS Hook:** Flat $49/mo for the whole company. Unifies internal team chat and external customer support tickets in one secure perimeter. PostgreSQL `SAVEPOINT` isolation via generic `transactional_batch_insert` helper with chunked fallback (100), transient-safe abort, and full DLQ payload preservation (`T: Clone`). |
| **Zapier** | Automation (SPARK) | **The Brittle Bridge:** Charges per task. Uses polling/webhooks over the public internet. Silent data drops on API changes. | Connects to 5,000+ apps. We will never match this volume. | **The OS Hook:** Zero task limits. Zero webhooks. Ataqu apps share the same PostgreSQL ecosystem and unified outbox with native `LISTEN/NOTIFY` push, RLS, type‑safe `schema` ENUM, Column-Level Privileges, and sequence grants. SPARK triggers are native events executing in <1s. |
| **Notion** | Docs (PIVOT) | **The Blank Canvas Graveyard:** Infinite flexibility leads to infinite setup time. Search is slow (2‑5s) due to external indexing. | Beautiful, flexible block‑based UI. Massive community templates. | **The OS Hook:** Opinionated, high‑density data grids. Sub‑15ms search via PostgreSQL `tsvector` and GIN indexes. Native relational linking to CINQ deals. |
| **Zoho One** | Suite (The OS) | **Bloatware:** 45 disparate apps stitched together via acquisitions. Clunky 2012‑era UI. Per‑user pricing. | Breadth. They have an app for literally everything. | **The OS Hook:** 10 exceptional apps built from scratch in Rust on PostgreSQL. True bounded contexts enforced by PostgreSQL Roles, RLS, Column-Level Privileges, type‑safe `schema` ENUM, sequence grants, and SeaORM 2.0 with raw SQL escape hatch. Flat $49/mo. |
| **Calendly** | Scheduling (TEMPO) | **The Scheduling Island:** Lives in isolation. No native CRM or follow‑up. No‑show detection takes a day. | Simplicity and broad calendar integration. | **The OS Hook:** Native CRM activity creation, no‑show detection within 15‑30 mins using sargable `ends_at` generated column (PostgreSQL) with 24‑hour upper bound. |
| **Cin7** | Inventory (VAULT) | **The Siloed Warehouse:** No native connection to CRM. Requires middleware. AI bloat. | Depth of features for complex supply chains. | **The OS Hook:** Native CRM order integration. No AI bloat. Chunked orphan reaper prevents storage waste. PostgreSQL `CHECK` constraint for stock integrity. |

---

## 2. THE FEATURE GAP ANALYSIS (The 80/20 Rule)

This matrix defines the exact product scope for the upcoming PRDs.
*   **Must‑Have (The 80%):** Core features required to decommission the competitor.
*   **Explicitly Ignored (The Bloat):** Features we will *never* build because they add complexity, slow down the Rust binary, or serve a tiny minority of users.
*   **Ataqu Advantage (The OS Layer):** What we have that they never will.

### 2.1 CINQ (CRM) vs. HubSpot
| Feature | HubSpot | Ataqu Status | Rationale |
|---------|---------|--------------|-----------|
| Drag & Drop Pipeline | ✅ | **Must‑Have** | Core visual requirement. Must update in 150ms via optimistic UI. |
| Email Tracking (Opens/Clicks) | ✅ | **Must‑Have** | Table stakes for sales reps. **Ataqu implementation:** DoS‑isolated via bounded channel with atomic JSONL spill (nanos+uuid filenames, processed exactly once) (ADR‑031). |
| Custom Objects (e.g., "Cars") | ✅ | **Ignored** | Enterprise bloat. Adds massive schema complexity. We use PIVOT relational tables for custom entities. |
| Predictive Lead Scoring (AI) | ✅ | **Ignored** | Marketing fluff. Reps know who to call. |
| Filterable Custom Fields | ✅ | **Ataqu Advantage** | PostgreSQL `JSONB` with three-tier query strategy: `@>` exact match (indexed, fast), `->>` ILIKE single-field (scan, acceptable <100K rows), `jsonb_each_text` cross-field (expensive, rate-limited & result-capped). Column promotion for high-traffic fields. No EAV. |
| Native Chat Integration | ❌ (Paid) | **Ataqu Advantage** | CINQ deals natively spawn DIAL channels via unified outbox with `LISTEN/NOTIFY`, RLS, and type‑safe `schema` ENUM. Zero integration cost. |

### 2.2 DIAL (Chat) vs. Slack
| Feature | Slack | Ataqu Status | Rationale |
|---------|-------|--------------|-----------|
| Channels & DMs | ✅ | **Must‑Have** | Core communication. |
| Threaded Replies | ✅ | **Must‑Have** | Essential for organization. |
| Custom Emoji Reactions | ✅ | **Must‑Have** | Low effort, high user satisfaction. |
| Slack Connect (Cross‑company DMs)| ✅ | **Ignored** | Massive security surface area. We use external Support Tickets instead. |
| Audio/Video Huddles | ✅ | **Ignored** | Extreme infrastructure bloat. Integrate with native Tembo/Google Meet links. |
| Unified Support Inbox | ❌ | **Ataqu Advantage** | DIAL handles both internal chat and external `support@` emails. |

### 2.3 SPARK (Automation) vs. Zapier
| Feature | Zapier | Ataqu Status | Rationale |
|---------|--------|--------------|-----------|
| Trigger / Action Builder | ✅ | **Must‑Have** | Visual workflow builder. |
| Webhooks In/Out | ✅ | **Must‑Have** | Required to interact with the outside world (e.g., Stripe). |
| 5,000+ App Integrations | ✅ | **Ignored** | We only integrate natively with our 10 apps + high‑value externals (Stripe, Postmark). |
| Polling Delays (5‑15 mins) | ✅ | **Ignored** | We use PostgreSQL `LISTEN/NOTIFY` for instant outbox push. Execution in <1s. |
| Unlimited Tasks | ❌ | **Ataqu Advantage** | We do not meter tasks. It's a flat $49/mo. |

### 2.4 PIVOT (Productivity) vs. Notion
| Feature | Notion | Ataqu Status | Rationale |
|---------|--------|--------------|-----------|
| Markdown Docs | ✅ | **Must‑Have** | Fast, keyboard‑first editing. |
| Relational Databases | ✅ | **Must‑Have** | Linking tasks to deals. |
| Granular Page Permissions | ✅ | **Ignored** | Bloat. We enforce RLS at the tenant level via `TenantId`. If you're in the company, you see the company docs. |
| Block‑level drag & drop UI | ✅ | **Ignored** | Massive frontend complexity. We use a structured, high‑density list/grid view. |
| Native CRM Foreign Keys | ❌ | **Ataqu Advantage** | A PIVOT task can be application‑level linked to a CINQ deal. Notion requires Zapier. |

### 2.5 VISTA (Analytics) vs. Tableau / Metabase
| Feature | Tableau | Ataqu Status | Rationale |
|---------|---------|--------------|-----------|
| Real‑time Dashboards | ✅ | **Must‑Have** | Native queries against the production DB (PostgreSQL). |
| Custom SQL Queries | ✅ | **Must‑Have** | For power users to build custom charts. |
| ETL Pipelines | ✅ | **Ignored** | Bloat. We do not move data. We query the unified PostgreSQL schema directly. |
| AI Chart Generation | ✅ | **Ignored** | Gimmicky. Users prefer drag‑and‑drop builders. |
| Zero Latency Native Metrics | ❌ | **Ataqu Advantage** | VISTA reads the same PostgreSQL database that CINQ writes to. Dashboards update in 150ms via SSE. |

### 2.6 TEMPO (Scheduling) vs. Calendly
| Feature | Calendly | Ataqu Status | Rationale |
|---------|----------|--------------|-----------|
| Booking Links | ✅ | **Must‑Have** | 100% of users. |
| Calendar Sync | ✅ | **Must‑Have** | OAuth with auto‑refresh. |
| No‑Show Detection | ⚠️ (24‑hour delay) | **Ataqu Advantage** | We detect within 15‑30 minutes using sargable `ends_at` generated column and bounded 24‑hour upper bound (ADR‑032). |

---

## 3. THE "TRAP" FEATURES (What we refuse to build)

As we write the PRDs, Product and Engineering will face pressure to add "parity" features to win deals. These are Trap Features—they add immediate revenue but destroy the "Calm Predator" ethos and bloat the Rust binary.

1.  **Per‑User Pricing Models:** We will never build a "user counting" mechanism into the billing logic. It is flat‑rate.
2.  **Custom Domain Mapping:** We will not allow `app.yourcompany.com`. It forces us into micro‑frontend routing and SSL management bloat. The app lives at `app.ataqu.so`.
3.  **White‑Labeling:** We will not remove the Ataqu brand from the UI. The brand is the trust signal.
4.  **On‑Premise / Self‑Hosted Versions:** We will not package Ataqu as a Docker image for users to host. It breaks our unified update model and architectural guarantees.
5.  **Native Email Servers:** We will not build an email sending server. We integrate with Postmark/Resend via SPARK. Email deliverability is a nightmare that distracts from our core OS.

---

### FINAL GAP ANALYSIS DIRECTIVE
This document is the filter for the upcoming PRDs. When defining the acceptance criteria for AEGIS, PIVOT, CINQ, etc., if a feature is not listed as "Must‑Have" or "Ataqu Advantage" in this document, it is strictly out of scope for v1.0. We are building the Unified SMB OS, not a feature‑by‑feature clone of the SaaS oligopoly.
