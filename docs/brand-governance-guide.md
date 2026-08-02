# 🛡️ ATAQU BRAND GOVERNANCE GUIDE — Version 1.6 (Phase 1)
### The Operating System for Brand Integrity & Enforcement

> **Executive Note:** A brand is a promise. Governance is the immune system that protects that promise. In a fast‑moving B2B SaaS environment, the greatest threat to the "Calm Predator" is not a competitor; it is internal drift, bloat, and diluted standards. This document dictates how the Ataqu brand is operationalized, enforced, and protected. It ensures that whether a user interacts with our landing page, our Rust codebase, or a 2:00 AM support ticket, the experience is ruthlessly consistent.

---

## 1. BRAND OWNERSHIP & THE DECISION MATRIX

Ataqu operates on a "Zero‑Bloat" governance model. Bureaucracy slows down the predator. We do not have a 50‑person brand committee. We have a strict RACI matrix that empowers execution while protecting the core identity.

### 1.1 The Brand Triumvirate
Brand ownership is divided across three core functions:
1. **Brand Strategy (Marketing Lead):** Owns the positioning, competitive narrative, visual identity, and outbound messaging.
2. **Brand Experience (Product/Design Lead):** Owns the UI/UX, interaction design, in‑product copy, and motion.
3. **Brand Engineering (CTO/Tech Lead):** Owns the performance, architectural transparency, public status page, and developer evangelism.

### 1.2 The Decision Matrix (RACI)

| Initiative | Marketing | Product/Design | Engineering | CEO/Founders |
|------------|-----------|----------------|-------------|--------------|
| **Visual Identity Updates** | **R/A** | C | I | I |
| **In‑App UX Copy & Tone** | C | **R/A** | I | I |
| **Engineering Blog / Dev Evangelism** | C | I | **R/A** | I |
| **Competitor Kill Sheets / Pricing** | **R/A** | I | C | I |
| **Radical Transparency / RCAs** | C | I | **R/A** | I |
| **Core Brand Essence/Promise Changes**| R | R | R | **A** |

*(R = Responsible, A = Accountable, C = Consulted, I = Informed)*

---

## 2. THE "ZERO‑BLOAT" DECISION FILTER

When evaluating any new brand initiative, campaign, or UI feature, it must pass through the Zero‑Bloat Decision Filter. If it fails any of these three questions, it is rejected immediately.

1. **The Competence Test:** Does this prove our engineering or operational competence, or does it rely on empty marketing superlatives? (If we can't prove it with an architecture diagram or a metric, we don't say it).
2. **The Friction Test:** Does this add cognitive load or friction to the user? (If it requires a loading spinner, a multi‑step form, or confusing jargon, it is eradicated).
3. **The Lock‑In Test:** Does this implicitly trap the user? (If the copy or UX makes it hard to cancel or export data, it violates our core essence).

---

## 3. OPERATIONALIZING THE BRAND (ENFORCEMENT)

Governance is not a PDF; it is code, tooling, and process. Ataqu enforces its brand standards through automated pipelines and database-level controls.

### 3.1 Design System as Code (UI Governance)
The visual identity is not a Figma file that developers ignore; it is a strict, version‑controlled NPM package.
- **`@ataqu/ui‑kit`:** All UI components (buttons, modals, data grids) are strictly imported from a private, semantically versioned UI library.
- **Tailwind Config:** The color palette (Deep Night Blue, Amber) and the 8px spacing grid are hardcoded into the Tailwind configuration. Arbitrary hex codes and spacing values are strictly forbidden and will fail CI checks.
- **Typography CI:** Linters enforce the use of `Unbounded` for headings and `Inter` for body text. No other fonts can be loaded.

### 3.2 Lexical CI/CD (Copy Governance)
To prevent "SaaS slop" from entering the product or marketing, we implement automated copywriting checks.
- **Banned Words Linter:** We use a custom ESLint/Markdown linter that fails pull requests containing banned words (e.g., "seamless", "robust", "empower", "synergy").
- **Readability Checks:** All public‑facing documentation and blog posts must pass a readability check targeting a Grade 8 reading level. Short sentences. Action verbs.

### 3.3 Performance as a Brand Metric (Engineering Governance)
Speed is a brand attribute. A slow page damages the "Calm Predator" identity.
- **Core Web Vitals SLA:** All marketing pages must maintain a Lighthouse score of 95+. LCP (Largest Contentful Paint) must be under 1.5s.
- **Zero Spinner Rule:** PRs that introduce full‑page loading spinners into the Vite SPA will be rejected by the Tech Lead. Skeleton loaders and optimistic UI are mandatory.
- **UTC Timestamp Standard:** All backend timestamps must be stored in UTC (ISO 8601) to ensure global consistency. Enforced via CI linting on date‑handling code.
- **PostgreSQL Role & RLS Enforcement:** Bounded context isolation is enforced natively at the database level via PostgreSQL Roles, **Row Level Security (RLS)**, **Column-Level Privileges**, a type‑safe `schema` ENUM, and **Sequence Grants** on `core.outbox`. This replaces fragile CI linters with physical DB-level isolation and prevents cross-domain event spoofing.
- **PiiValue CI Lint: CI fails if any crate outside the approved list enables the `infra-pii-access` feature on `ataqu-security`. PII newtypes have no `Serialize` impl; serialization is handled by API wrapper structs.
- **Entity Boundary Lint:** CI fails if any `sea_orm::Model` or `sea_orm::ActiveModel` type appears in a `ataqu-domain-*` crate's public API.
- **IdGenerator/Clock Usage:** CI enforces that no domain crate calls `Uuid::now_v7()` or `SystemTime::now()` directly; all ID and time generation must use injected `IdGenerator` and `Clock`.
- **PII Serialization Isolation:** PII newtypes (`Email`, `PhoneNumber`) do not implement `Serialize`. JSON serialization of PII is strictly restricted to the `ataqu-api` layer via wrapper structs (e.g., `ApiEmail`) that implement `Serialize` by calling `reveal(&key)`. CI ensures only `ataqu-api` defines these wrapper types, preventing accidental PII serialization in application or domain logs.

### 3.4 Observability Governance
Brand health is measured by operational metrics. The engineering team tracks:
- `email_tracking_spill_depth` — Detects sustained email tracking DB outages.
- `email_tracking_dropped_total` — Monitors tracking channel saturation (DoS protection).
- `email_tracking_recovery_failed_total` — P0 alert on recovery failure.
- `ataqu_idempotency_lock_timeout_total` — Advisory lock collisions (negligible, but monitored).
- `ataqu_outbox_dispatch_total` — Outbox dispatch success/failure per schema.
- `no_show_detected_total` — Tracks no‑show detection health by reason (`attended_timeout` vs `hook_missed`).

---

## 4. THE RADICAL TRANSPARENCY PROTOCOL (CRISIS GOVERNANCE)

How a brand handles failure defines its trust. Ataqu does not hide outages behind PR speak. We practice Radical Transparency.

### 4.1 The 4‑Stage Outage Communication Protocol
When a P0/P1 incident occurs (e.g., PostgreSQL connection pool exhaustion, outbox relay lag, RLS misconfiguration, sequence grant failure):

1. **T‑Minus 0 (Detection):** The moment an anomaly is detected, the Public Status Page (`status.ataqu.com`) is automatically updated to "Degraded Performance" or "Outage". No human delay.
2. **T+15 Minutes (Acknowledgment):** An initial update is posted. State the specific failing component in plain technical English. (e.g., "CRON worker failing to dispatch scheduled tasks due to connection pool timeout. Investigating.")
3. **Resolution (The Fix):** State exactly what was done. (e.g., "Increased `max_connections` to 120. Restarted `ataqu-server`. Service restored.")
4. **T+24 Hours (The RCA):** A Root Cause Analysis is published on the Engineering Blog.
    - **No PR Speak:** We do not say "a brief disruption." We say "CRON worker missed 47 scheduled executions over 12 minutes."
    - **Technical Proof:** We explain the exact PostgreSQL query that timed out, the EXPLAIN QUERY PLAN output, and the code fix deployed.
    - **Action Items:** We list the exact architectural changes made to ensure it never happens again.

### 4.2 Competitor Attacks & Response Governance
When competitors (HubSpot, Slack) raise prices or change policies, Ataqu attacks. But we attack with math, not emotions.
- **Rule:** We never mock competitors. We simply expose their pricing models and contract clauses.
- **Response Time:** When a competitor announces a price hike, Marketing must publish a "Kill Sheet" or migration guide within 24 hours to intercept the churn search traffic.

---

## 5. PARTNERSHIP & INTEGRATION GOVERNANCE

As a Unified SMB OS, Ataqu will eventually integrate with external tools. We must ensure these integrations do not compromise our brand or performance.

### 5.1 The "No‑Brittle‑Webhooks" Rule
We do not allow third‑party integrations that rely on fragile, point‑to‑point webhooks if they can be avoided. If an integration is built, it must adhere to our internal reliability standards.
- **Requirement:** All external integrations must include retry logic, exponential backoff, and dead‑letter queuing (DLQ) routing – mirrored by our outbox pattern.

### 5.2 Co‑Marketing Guidelines
Ataqu does not do generic "co‑marketing webinars" with non‑technical partners.
- **Approved Partners:** Only deeply technical infrastructure providers (e.g., Cloudflare, IONOS, PostgreSQL ecosystem projects, Rust ecosystem projects).
- **Visual Integrity:** Partners may not alter the Ataqu logo or place it on cluttered, light‑mode backgrounds. The 2x clear space rule applies universally.

---

## 6. BRAND AUDITS & EVOLUTION

The brand must scale without diluting. We enforce quarterly audits to eradicate drift.

### 6.1 The Quarterly "Bloat Eradication" Audit
Every quarter, the Brand Triumvirate conducts a comprehensive review of:
1. **Product UI:** Are there new loading spinners? Has the 8px grid been violated? Are there drop‑shadows exceeding our strict 12px blur limit?
2. **Copywriting:** Have banned words crept into the UX copy? Are error messages vague?
3. **Performance:** Has the Lighthouse score dropped? Has the bundle size of the Vite SPA increased?
4. **Observability:** Are we tracking all critical brand health metrics (e.g., `email_tracking_spill_depth`, `ataqu_outbox_notify_lag_seconds`, `ataqu_idempotency_lock_timeout_total`)? Are RCAs published within 24 hours?
5. **Database Governance:** Are PostgreSQL Roles, RLS policies, Column-Level Privileges, `schema` ENUM, and sequence grants correctly scoped? Are any cross-schema queries being executed by application code? Is the entity boundary lint passing?
6. **Domain Purity:** Verify that no domain crate contains `Uuid::now_v7()` or `SystemTime::now()` calls (should use `IdGenerator` and `Clock`).
7. **PII Security:** Ensure PII newtypes are correctly redacting logs and serialization is strictly via API wrapper structs.

### 6.2 Brand Evolution Criteria
The Ataqu brand essence ("The Calm Predator") and core pillars (Price, Integration, Freedom, Performance) are immutable. However, the expression of the brand may evolve under the following strict conditions:
- **Category Shift:** If the market universally adopts flat pricing (unlikely), we may shift our primary differentiator to pure performance.
- **Scale Requirement:** If Ataqu scales to enterprise (500+ employees), we may introduce a "VISTA Enterprise" tier, but it will never include lock‑in contracts or per‑user pricing.

---

### FINAL GOVERNANCE DIRECTIVE
Ataqu is not a democracy; it is a meritocracy of ideas and execution. The brand guidelines are not suggestions; they are the architectural blueprints of our company’s soul. If you see a violation of this brand—whether in a Figma file, a pull request, or a marketing email—you are obligated to call it out and correct it.

The predators do not tolerate weakness. We do not tolerate bloat. We protect the brand.
