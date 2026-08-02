# 📘 ATAQU BRAND BOOK — Version 3.7 (Phase 1)
### The Definitive Guide to Brand, Product, and Architecture

---

## 1. BRAND STRATEGY & POSITIONING

### 1.1 Target Market
**Startups and SMBs with 10–200 employees.**

- **Total Addressable Market (TAM):** The global SaaS market is estimated at $435.41 billion in 2026, with a projected CAGR of 17.55% through 2031.
- **Target Segment:** SMBs and startups experiencing severe "churning" from overpriced, fragmented enterprise solutions.
- **Decision Makers:** CEOs, CTOs, Heads of Operations — profiles who directly experience the pain of tool fragmentation, exploding bills, and brittle integrations.

### 1.2 The Problem
**Companies pay too much for SaaS tools that don't talk to each other, lock them into contracts, and ignore them when they need help.**

| Competitor | Typical Annual Cost (20-person team) | Main Problem |
|------------|--------------------------------------|--------------|
| **HubSpot** | $12k–$50k+ | 3-year lock-in, prices that keep climbing. Ataqu offers Starter ($15/mo), Pro ($39/mo), Suite ($79/mo) – all with no lock‑in. |
| **Slack** | $1,740–$3,000 | 30% price increase with no warning |
| **Zapier** | $1,200+ (750 tasks/month) | Task limits, exploding costs, brittle APIs |
| **Notion** | $2,400 | Steep learning curve, trapped data |

The total cost for a 20-person SMB using these 4 tools + others easily exceeds $20,000/year.

**Pain Points Summary:**
- **Price:** Abusive, surprise increases, hidden fees.
- **Lock-in:** Impossible to leave, 1-click cancellation is a myth.
- **Support:** Nonexistent or degraded, chatbots replacing humans.
- **Integrations:** Fragile, paid, or require Zapier (which charges extra and breaks).

### 1.3 The Solution
**Ataqu: 10 business apps, natively integrated, fixed price, no commitment.**

| App | Function | Direct Competitor |
|-----|----------|-------------------|
| **PIVOT** | Productivity (databases, docs, tasks) | Notion + ClickUp + Airtable |
| **SOND** | Forms and surveys | Typeform + SurveyMonkey |
| **DIAL** | Chat and customer support | Slack + Intercom |
| **SPARK** | Automation | Zapier + Make |
| **TEMPO** | Scheduling | Calendly |
| **CINQ** | CRM and sales pipeline | HubSpot + Pipedrive |
| **VAULT** | Inventory and stock management | Cin7 + inFlow |
| **AEGIS** | SSO and security | Okta + 1Password |
| **PAUSE** | HR and leave management | Personio + BambooHR |
| **VISTA** | Analytics and BI | Tableau + Metabase |

### 1.4 Brand Essence
**"The calm predator."**

- **Power:** We attack the market. We rebuild 10 SaaS tools from scratch in Rust with PostgreSQL. We don’t bandage old code or wrap legacy APIs.
- **Calm:** The calm of a predator. No surprises. No stress. No lock-in. Zero race conditions. Zero data loss. You sleep well at night because the infrastructure is mathematically sound — powered by PostgreSQL MVCC, native `LISTEN/NOTIFY`, SeaORM 2.0, raw SQL escape hatch, and compile‑time PII redaction via redacting newtypes.

### 1.5 Brand Promise
> **"Ataqu — 10 apps, tiered pricing ($15/$39/$79), zero lock-in."**

Stop paying for 10 tools that don't talk to each other. Ataqu gives you a complete, native suite starting at $15/month for one app, $39/month for 5 apps, or $79/month for all 10. And if you want to leave, one click is all it takes.

### 1.6 Data Sovereignty & The Trust Narrative
"Zero lock-in" is our strongest pillar. In a cynical SaaS market, we define exactly what Data Sovereignty means at Ataqu:
1. **No AI Training on Your Data:** We do not train LLMs on your proprietary business data. Your CRM, chats, and docs are yours alone.
2. **Strict Tenant Isolation:** Enforced at the database level using PostgreSQL Roles, schemas, **Row Level Security (RLS)**, **Column-Level Privileges**, and a type‑safe `schema` ENUM on the unified `core.outbox` table. Each bounded context has its own database role with `GRANT` permissions strictly scoped. RLS prevents cross-domain event spoofing. Cross-schema queries are physically impossible at the database level. It is architecturally impossible for one tenant to query another's data.
3. **1‑Click Machine‑Readable Export:** Your data is never trapped in proprietary formats. 1‑click exports to standard CSV and JSON.

---

## 2. CUSTOMER PERSONAS

### Persona 1: Alex — The CEO / Founder
| Field | Description |
|-------|-------------|
| **Role** | CEO / Founder of a 15‑50 person startup |
| **Primary Pain** | Pays $500–$2,000/month for a dozen SaaS tools. The bill explodes every year. |
| **Frustrations** | • Price increases with no warning<br>• Can't cancel easily<br>• Spends too much time managing tools instead of growing the business |
| **What he wants** | • Fixed, predictable pricing<br>• A single view of his business<br>• Not to be locked in to any vendor |
| **Goal** | Reduce SaaS costs by 80% while keeping the same features |
| **Channels** | LinkedIn, Twitter/X, podcasts, Hacker News |

**Key message for Alex:**
> "You're paying $2,000/month for SaaS tools. Ataqu: $49. Same features. Zero lock-in."

### Persona 2: Sam — The CTO / Head of Ops
| Field | Description |
|-------|-------------|
| **Role** | CTO or Head of Operations |
| **Primary Pain** | Spends 2‑5 hours/week making tools talk to each other (Zapier, brittle integrations) and fixing broken automations. |
| **Frustrations** | • Zapier charges $29‑103/month for limited tasks<br>• Custom integrations are fragile<br>• APIs change without warning, causing silent data loss |
| **What he wants** | • A tech stack he can brag about. Native integrations that work.<br>• High performance, fault‑tolerant infrastructure |
| **Goal** | Reduce integration technical debt and infrastructure bloat |
| **Channels** | GitHub, Hacker News, Reddit (r/devops, r/sysadmin), Dev.to |

**Key message for Sam:**
> "We rebuilt the SaaS stack in Rust with PostgreSQL, SeaORM 2.0, and raw SQL escape hatch for Postgres primitives. True bounded contexts with event-driven projections, `LISTEN/NOTIFY` outbox with RLS, type‑safe `schema` ENUM, Column-Level Privileges, `JSONB` with graceful degradation, honest idempotency via 2× int4 advisory locks, domain purity with injected `IdGenerator`/`Clock`, and compile‑time PII redaction via redacting newtypes. No Zapier. No paid tasks. No surprises."

### Persona 3: Jordan — The Head of Ops / Sales Ops
| Field | Description |
|-------|-------------|
| **Role** | Head of Operations, Sales Ops, Revenue Ops |
| **Primary Pain** | Suffers through price increases and vendor policy changes that ruin quarterly budgets. |
| **Frustrations** | • HubSpot: exploding bills, 3‑year lock‑in<br>• Slack: 30% price increase with no warning<br>• Zoho One: $37–$90/user/month |
| **What he wants** | • Transparent contracts<br>• No long‑term commitment<br>• A human contact when there's a problem |
| **Goal** | Control the SaaS budget and ensure operational continuity |
| **Channels** | LinkedIn, Reddit (r/sales, r/operations) |

**Key message for Jordan:**
> "Ataqu: $49/month. No price increases. No lock‑in. No surprises."

---

## 3. MESSAGE ARCHITECTURE

### 3.1 Mission
> **"Free businesses from SaaS lock-in."**

### 3.2 Vision
> **"A world where any company, regardless of size, can use the best tools without being trapped by a vendor."**

### 3.3 Core Message
> **"Ataqu — 10 apps, tiered pricing ($15/$39/$79), zero lock-in."**

### 3.4 Key Messages (The 4 Pillars)

| Pillar | Message | Evidence |
|--------|---------|----------|
| **Price** | "Stop paying $20,000/year for SaaS tools. Ataqu: $49/month." | HubSpot = $12k–$50k/year. Ataqu = $49/mo for everything. |
| **Integration** | "With Ataqu, integrations are native. No Zapier. No paid tasks." | Unified outbox with `LISTEN/NOTIFY`, RLS, and `schema` ENUM. No brittle webhooks. |
| **Freedom** | "Want to leave? One click. Your data belongs to you." | HubSpot = 3‑year lock‑in. Ataqu = 1‑click cancellation. |
| **Performance** | "Built in Rust on PostgreSQL. No bloat. No downtime." | MVCC, JSONB, advisory locks, event-driven projections, compile‑time PII safety. |

### 3.5 Value Propositions (Per App)
| App | Value Prop |
|-----|------------|
| **PIVOT** | "Notion + ClickUp + Airtable for just $15/month on Starter, or included in Pro/Suite." |
| **SOND** | "Typeform without the response limits." |
| **DIAL** | "Slack + Intercom for a fraction of the cost." |
| **SPARK** | "Zapier without the task limits." |
| **TEMPO** | "Calendly with more features." |
| **CINQ** | "HubSpot at 1/10th the price." |
| **VAULT** | "Cin7 without the lock‑in." |
| **AEGIS** | "Okta for a fraction of the price." |
| **PAUSE** | "Personio for a fraction of the price." |
| **VISTA** | "Tableau for a fraction of the price." |

### 3.6 Pricing Narrative (Land & Expand)
Do not just sell the Suite. Lower the barrier to entry.
> "Start with one app for $15. Upgrade to 5 for $39. Get the whole suite for $79. No per‑user fees. Ever."

---

## 4. TONE OF VOICE & THE ATAQU LEXICON

### 4.1 The 5 Personality Traits
| Trait | Score | Definition |
|-------|-------|------------|
| **Aggressive** | 10/10 | Ataqu attacks. No defense, no retreat. We move forward. |
| **Direct** | 10/10 | No bullshit, no double‑talk. We say it like it is. |
| **Calm** | 9/10 | The calm of a predator. We don't need to shout to be heard. Our tech works, flawlessly. |
| **Competent** | 10/10 | We built 10 apps in Rust with PostgreSQL and SeaORM. We know what we're doing. We don't hide behind marketing. |
| **No‑frills** | 10/10 | No fluff, no watered‑down marketing. Just substance. |

### 4.2 The Lexicon (Controlled Vocabulary)
In an era of AI‑generated slop, Ataqu uses precise, mechanical, and absolute language. If a claim cannot be proven by a number, a technical mechanism, or an architectural decision, it does not get written.

| ❌ Banned Words (The SaaS stereotypes) | ✅ Mandatory Words (The Ataqu way) |
|---------------------------------------|-----------------------------------|
| Seamless, Smooth, Frictionless | Native, Integrated, Unified |
| Robust, Scalable, Enterprise‑grade | Deterministic, Fault‑tolerant, MVCC, JSONB |
| Leverage, Utilize, Synergize | Use, Connect, Build |
| Empower, Enable, Unlock | Stop, Attack, Eradicate, Control |
| State‑of‑the‑art, Cutting‑edge | Sub‑millisecond, Zero‑bloat, Mathematically sound |
| Flexibility, Tailored | Fixed, Predictable, Standardized |

### 4.3 Emotional Spectrum
| Situation | Tone |
|-----------|------|
| **Landing page** | Punchy, direct, clear promise |
| **Cold email** | Empathetic + factual ("We know the pain. Here's the solution.") |
| **LinkedIn post** | Professional but no‑frills |
| **Twitter/X post** | Dry, punchy, memorable |
| **About page** | Honest, transparent, a bit rebellious |
| **Customer support** | Human, empathetic, effective |
| **Developer outreach** | Ruthless, technical, proof‑driven |

---

## 5. UX WRITING & PRODUCT VOICE

The "Calm Predator" essence must live inside the product. UX writing for Ataqu must be ruthlessly efficient, respectful of the user's time, and highly deterministic.

### 5.1 Core UX Principles
1. **No empty error messages:** Never say "Something went wrong." If the system fails, explain *why* or state exactly what the user should do.
2. **No celebratory micro‑copy:** We don't say "Awesome! You created a task." We say "Task created." We are a tool, not a cheerleader.
3. **Action‑oriented buttons:** Buttons must contain verbs. Never "Submit" or "OK". Always "Save changes", "Delete doc", "Cancel subscription".

### 5.2 UX Copy Examples

| Situation | ❌ Standard SaaS UX Copy | ✅ Ataqu UX Copy |
|-----------|-------------------------|------------------|
| **Empty State (CRM)** | "Looks like you don't have any deals yet. Click here to add one!" | "No deals in this pipeline. Create one to start tracking revenue." |
| **Loading State** | "Fetching your data... 🔄" | *(Use skeleton loaders. No text. Speed is the message.)* |
| **Error 500** | "Oops! Our servers are taking a break." | "System error. Event logged to DLQ. Admin notified. Your data is safe." |
| **Success (Save)** | "🎉 Saved successfully!" | "Saved." |
| **Cancellation Flow** | "Are you sure you want to leave? We'll miss you! How about 50% off?" | "Confirm cancellation. Your data export (CSV/JSON) is ready. Access expires at midnight." |

---

## 6. COPYWRITING FRAMEWORKS

### 6.1 Landing Page — Main Headline
> **"SaaS vendors treating you like a cash cow?"**
>
> Abusive prices. Bot support. Lock‑in.
>
> We built Ataqu to stop that.
>
> **10 apps. $49/month. 1 click to cancel.**
>
> Your data belongs to you.
>
> *Ataqu. Attack the market.*

### 6.2 Landing Page — "Why Ataqu" Section
> **"HubSpot charges $150/month. Slack charges $15/user. Zapier charges per task."**
>
> **Ataqu charges $15 for one app, $39 for 5 apps, $79 for all 10. No per‑user fees.**
>
> - 10 business apps
> - Native integrations (no Zapier)
> - Built in Rust with PostgreSQL and SeaORM
> - Human support (24h SLA)
> - Zero commitment (1‑click cancellation)
>
> *The SaaS market needs a wake‑up call. Ataqu.*

### 6.3 Cold Outreach Email
**Subject:** HubSpot charges $150/month. We offer $49.

**Body:**
> Hi [First Name],
>
> Using HubSpot? We know the pain. Prices that climb, paid features, support that doesn't exist.
>
> We built Ataqu. 10 business apps, natively integrated, at $49/month.
>
> Yes, everything is included. Yes, you can cancel in 1 click. Yes, your data belongs to you.
>
> 15‑min demo to show you?
>
> Yours,
> [Signed]

### 6.4 LinkedIn Post
> HubSpot charges $150/month.
>
> Ataqu charges $49/month for 10 apps.
>
> - CRM
> - Chat
> - Automation
> - Forms
> - Scheduling
> - Inventory
> - HR
> - SSO
> - Productivity
> - Analytics
>
> Everything is integrated. Nothing is hidden. Built in Rust on PostgreSQL.
>
> The SaaS market needs a wake‑up call.
>
> **Ataqu.**

### 6.5 Twitter/X Post
> 10 apps. $49. Zero lock‑in.
>
> Ataqu.

### 6.6 Banner Ad
> **Ataqu.**
> **Attack the market.**

---

## 7. COMPETITOR KILL SHEET

### HubSpot
- **Price:** $12k–$50k/year for a mid‑sized team
- **Problem:** 3‑year lock‑in, price increases (6% in August 2025), nonexistent support
- **Our attack:** "HubSpot charges $150/month. Ataqu charges $49/month for 10 apps. And we don't lock you into a 3‑year contract to fund their legacy codebase."

### Zapier
- **Price:** $29.99/month for 750 tasks
- **Problem:** Task limits, costs that skyrocket with usage, brittle webhooks
- **Our attack:** "Zapier charges per task and breaks when APIs change. Ataqu uses a unified PostgreSQL outbox with `LISTEN/NOTIFY`, RLS, and type‑safe `schema` ENUM for instant event delivery. Zero lost events. Zero task limits."

### Slack
- **Price:** $8.75–$15/user/month
- **Problem:** 30% price increase with no warning
- **Our attack:** "Slack separates your chat from your data. Ataqu's DIAL uses native WebSocket ingestion with PostgreSQL `SAVEPOINT` isolation via a generic `transactional_batch_insert` helper. It's just faster."

### Notion
- **Price:** $18–$20/user/month
- **Problem:** Steep learning curve, trapped data, prices that climb
- **Our attack:** "Ataqu = Notion + ClickUp + Airtable for $15/month. And you can export your data in 1 click."

### Zoho One
- **Price:** $37–$90/user/month
- **Problem:** Per‑user pricing, lock‑in
- **Our attack:** "Zoho One charges $37/user. Ataqu charges $49 for your whole team. The math is simple."

---

## 8. VISUAL IDENTITY SYSTEM & ADVANCED UI

### 8.1 Logo Concept
A symbol that evokes **power** + **calm**.
- **Direction 1:** A stylized triangle/point (arrow, attack) inside a circle (protection, calm)
- **Direction 2:** A minimalist tiger (calm predator)
- **Direction 3:** A mountain (strength, stability) with a leaning peak (attack)

### 8.2 Color Palette

| Color | Hex Code | Usage |
|-------|----------|-------|
| **Deep Night Blue** | `#0A1628` | Primary (trust, power, seriousness) |
| **Amber/Orange** | `#F59E0B` | Secondary (energy, attack, action, CTA buttons) |
| **Light Gray** | `#F3F4F6` | Neutral (backgrounds, readability) |
| **White** | `#FFFFFF` | Text on dark backgrounds |
| **Black** | `#000000` | Primary text |

### 8.3 Typography & Hierarchy

| Usage | Font | Weight / Size |
|-------|------|---------------|
| **Headings (H1)** | Unbounded | 48px+, bold |
| **Headings (H2)** | Unbounded | 32px, bold |
| **Headings (H3)** | Unbounded | 24px, semibold |
| **Body** | Inter | 16px, regular |
| **Small text** | Inter | 14px, regular |

*Fallbacks: Inter to system‑ui.*

### 8.4 UI Aesthetic & Photography
- **Dark‑mode Native:** The interface should feel like a high‑performance tool (e.g., Linear, Vercel), not a clunky enterprise dashboard. High‑density data grids, zero loading spinners (optimistic UI).
- **Authentic:** Real people, not stock models. No overly polished productions. Blue‑dominant, with touches of orange.

### 8.5 The Grid System
- **8px Base Grid:** All spacing, margins, and padding must be multiples of 8 (8, 16, 24, 32, 48, 64). This creates a mathematical rhythm that feels stable and intentional.
- **High‑Density Data:** Do not waste space. Ataqu should look dense, information‑rich, but breathable.

### 8.6 Depth, Shadows & Accessibility
Ataqu does not use fluffy, blurred drop‑shadows.
- **Level 0 (Flat):** Backgrounds, base text.
- **Level 1 (Border):** 1px solid border (`#1E293B` on dark mode) to separate elements. No shadow.
- **Level 2 (Popover/Modals):** Strict, sharp shadow. `box‑shadow: 0 4px 12px rgba(0,0,0,0.4);` No blur radius beyond 12px.
- **Contrast:** Minimum WCAG AA (4.5:1). Deep Night Blue + White = 16.5:1.
- **Focus States:** Focus ring must be Amber/Orange (`#F59E0B`) with a 2px thickness. Aggressively visible.
- **Color as Accent:** Never use *only* color to indicate status. Pair with text label or icon (e.g., Red + "Blocked").

### 8.7 Brand Usage Guidelines
- **Minimum size:** 32px height (digital). Favicon must be legible at 16x16px.
- **Clear space:** 2x the logo height around it.
- **Variants:** Color (on light), White (on dark), Black (on white).

---

## 9. MOTION, SOUND & INTERACTION DESIGN

Brands like Linear and Vercel are beloved because their software *feels* fast. "Calm" in software means no janky reloads, no jarring transitions, and no waiting. The architecture (Micro‑Frontend Shell, optimistic UI, SSE cache invalidation) supports this perfectly.

### 9.1 The 150ms Rule & Zero Spinners
All UI interactions (button presses, modal opens, tab switches) must feel instantaneous.
- **Optimistic UI:** When a user clicks "Delete", the item disappears *before* the server responds. If the server fails, it gracefully reappears with a toast error.
- **Zero Spinners:** Ataqu strictly forbids full‑page loading spinners. Use skeleton loaders, progressive image loading, and stale‑while‑revalidate patterns via TanStack Query.

### 9.2 Motion Guidelines
- **Easing:** Strictly use `ease‑out` for elements entering the screen, and `ease‑in` for elements leaving. Never use `linear` (it feels robotic).
- **Duration:** 150ms for micro‑interactions (hovers, toggles). 250ms for modals/page transitions. Nothing slower.
- **SSE Invalidation:** When the backend pushes a cache invalidation via Server‑Sent Events, updated data should fade in over 100ms. It should feel like magic, not a reload.

### 9.3 Sound Design
Ataqu is silent. No notification dings, no swooshes, no pops. The "Calm Predator" does not make noise. The only visual cue for a new message in DIAL is a subtle badge update.

---

## 10. DEVELOPER EVANGELISM & COMMUNITY STRATEGY

To win the CTO persona (Sam), traditional marketing is useless. We need an "Engineering Evangelism" strategy, respected by developers first, who then bring the tool to the business.

### 10.1 The "Open Architecture" Approach
We don't need to open‑source Ataqu, but we must be radically transparent about how it is built.
- **Engineering Blog:** Publish deep‑dive articles on the Ataqu architecture. (e.g., *"How we built a unified outbox with PostgreSQL `LISTEN/NOTIFY`, RLS, and type‑safe `schema` ENUM"*, *"Why we chose SeaORM 2.0 with raw SQL escape hatch for Phase 1"*, *"How we isolated email tracking from the CRM database using a bounded channel with JSONL spill and atomic file rotation"*, *"How we implemented honest idempotency with 2× int4 advisory locks"*, *"How we achieved compile‑time PII redaction with redacting newtypes, no `Serialize`, and API wrapper serialization"*).
- **Public Architecture Docs:** We publish `architecture.ataqu.so` — a living document detailing our schemas, PostgreSQL Roles, RLS policies, Column-Level Privileges, `schema` ENUM, SeaORM entity design, and `LISTEN/NOTIFY` event bus. CTOs read this and realize we are building banking‑grade infrastructure for a $49 tool.
- **Public Status Page:** Real‑time uptime, p99 latency metrics, and outbox DLQ rates. If there is an outage, post a Root Cause Analysis (RCA) within 24 hours. No PR spin.

### 10.2 The Hacker News / Reddit Strategy
When launching or posting on Hacker News, Reddit (r/devops, r/rust), or Dev.to, the copy must be strictly technical. Marketing language will get you downvoted.

**Approved Dev‑Community Post Template:**
> **Title:** Show HN: We built 10 SaaS apps in Rust with PostgreSQL, SeaORM 2.0, and raw SQL escape hatch (Phase 1 – MVCC, LISTEN/NOTIFY, JSONB, advisory locks, compile‑time PII redaction)
>
> **Body:**
> Hi HN, we were tired of paying $2,000/month for SaaS tools that don't integrate, so we built Ataqu.
>
> It's a monolithic backend written in Rust with PostgreSQL and SeaORM 2.0. We use schemas, PostgreSQL Roles, Row Level Security (RLS), Column-Level Privileges, and a type‑safe `schema` ENUM for hard bounded context isolation.
>
> Some architectural decisions we made:
> - Unified outbox with RLS, Column-Level Privileges, and `app_schema` ENUM — single `core.outbox` table, RLS prevents cross-domain event spoofing, dispatcher cannot alter payloads.
> - Honest idempotency via `pg_advisory_xact_lock(int4, int4)` (negligible collision risk, 2⁻⁶⁴) + durable response storage in PostgreSQL.
> - Custom fields using `JSONB` with graceful degradation: `@>` exact match (indexed), `->>` ILIKE (scan), `jsonb_each_text` (expensive, rate-limited).
> - VISTA aggregator polls `core.outbox` for `status IN ('completed', 'dlq')` and uses `LISTEN/NOTIFY` for instant updates.
> - Compiled GDPR table registry — no runtime `information_schema` queries.
> - Domain purity with injected `IdGenerator` and `Clock` (no system clock/RNG in domain).
> - Compile‑time PII redaction via redacting newtypes (`Email`, `PhoneNumber`) — `Debug`/`Display` output `[REDACTED]`; newtypes do not implement `Serialize`; JSON serialization is isolated to the API layer via wrapper structs. Zero‑cost, no runtime overhead.
> - Future Phase 2 will scale to managed PostgreSQL (Neon/RDS).
>
> We sell it for $49/mo for the whole suite. We'd love feedback on our architecture.

---

## 11. THE ATAQU MANIFESTOS

### 11.1 The Consumer Manifesto
> The SaaS market is broken.
>
> Prices that climb without warning. Contracts that trap you. Support that ignores you. Tools that don't talk to each other.
>
> Companies pay a fortune. They're prisoners. They suffer.
>
> We looked at that. We said: "We can do better."
>
> We built Ataqu.
>
> 10 business apps, natively integrated. In Rust with PostgreSQL. Fixed price.
>
> $49/month. Everything included.
>
> No lock‑in. Cancel in 1 click.
>
> No bot support. Humans who respond in 24h.
>
> No surprises. No bullshit.
>
> Ataqu attacks the market so you don't have to suffer.
>
> *Ataqu. 10 apps, one price, zero lock‑in.*

### 11.2 The Engineering Manifesto
> We didn't just wrap APIs in a new UI. We eradicated the bloat.
>
> We built a monolithic backend in Rust with PostgreSQL and SeaORM 2.0. We use schemas, PostgreSQL Roles, RLS, Column-Level Privileges, and a type‑safe `schema` ENUM for hard bounded context isolation. Our unified outbox is driven by `LISTEN/NOTIFY` for instant event delivery. We use `JSONB` with graceful degradation for custom field filtering. We enforce strict tenant isolation via private `TenantId` newtype, database-level roles, RLS, and Column-Level Privileges. PII is redacted at compile time via redacting newtypes with zero runtime overhead; JSON serialization is strictly restricted to the API layer via wrapper structs.
>
> We didn't do this to win architecture awards. We did it because "cheap" shouldn't mean "fragile."
>
> Other SaaS tools break under their own weight. Ataqu is built to last. It is mathematically sound, deterministically fault‑tolerant, and ruthlessly fast.
>
> *Ataqu. Engineered for scale. Priced for everyone.*
