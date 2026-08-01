# 📊 ATAQU FINANCIAL MODEL & UNIT ECONOMICS BLUEPRINT — Version 1.2 (Phase 1)
### The Capital-Efficient Path to SaaS Decommissioning

> **Executive Note:** Ataqu is not a ZIRP-era SaaS company burning VC capital to buy Super Bowl ads. We are a "Calm Predator"—capital‑efficient, mathematically sound, and profitable from day one. Because we build in Rust and share a single codebase (with a single PostgreSQL instance, SeaORM 2.0, and raw SQL for Postgres primitives), our infrastructure costs are absurdly low. This document provides the 24‑month financial projection, unit economics, and the spec for our internal SaaS metrics dashboard. This is the blueprint that proves $49/month is not a gimmick; it's a highly scalable, permanent business model.

---

## 1. UNIT ECONOMICS (The Math of the $49 Bundle)

In traditional SaaS, high CAC (Customer Acquisition Cost) and per‑user infrastructure scaling destroy margins. Ataqu flips this: our CAC is near‑zero (Engineering Evangelism), and our marginal cost per tenant is pennies.

### 1.1 CAC (Customer Acquisition Cost)
*   **Marketing Spend:** $0 (No paid ads, no SDRs).
*   **Acquisition Channel:** Engineering Blog, Hacker News, Reddit, Organic SEO "Kill Sheets".
*   **Blended CAC:** ~$5.00 (Cost of the founder/engineer's time to write blog posts, amortized).
*   **CAC Payback Period:** Less than 1 month. (If a user pays $49/mo, we recoup acquisition costs instantly).

### 1.2 LTV (Lifetime Value)
*   **ARPU (Average Revenue Per User):** $49/mo (Assuming eventual upgrade to the bundle).
*   **Gross Margin:** 95%+ (Software with shared infrastructure).
*   **Monthly Churn Rate Estimate:** 5% (SMB churn is naturally higher than enterprise, but the low price mitigates sticker‑shock churn).
*   **LTV Calculation:** $49 / 0.05 = $980.
*   **LTV:CAC Ratio:** $980 / $5 = **196:1** (Anything above 3:1 is considered good. We are astronomically healthy).

### 1.3 Marginal Infrastructure Cost Per Tenant (Phase 1 – PostgreSQL on Hetzner CX42)
*   **VPS (Hetzner CX42):** ~$0.03 / tenant / mo (shared across 200 tenants).
*   **PostgreSQL:** Negligible marginal cost (MVCC, shared buffers).
*   **SeaORM / raw SQL:** No external cost.
*   **moka Cache:** In‑memory, no external cost.
*   **Total Marginal Cost:** ~$0.03 / tenant / mo (dominated by VPS amortisation).
*   **Gross Profit per Tenant:** $48.97 / mo.

---

## 2. FIXED INFRASTRUCTURE COSTS (Phase 1: 0‑200 Users)

We do not scale infrastructure until pain is felt.

| Component | Provider / Tool | Monthly Cost | Notes |
|-----------|-----------------|--------------|-------|
| **Core VPS (8 vCores, 8 GB RAM, 160 GB SSD)** | Hetzner CX42 | ~$10 (first year) | Runs the single Rust binary, PostgreSQL 16.14, SeaORM, Caddy. |
| **CDN & DDoS Protection** | Cloudflare | $0 | Free tier. |
| **Email Deliverability** | SendGrid / Postmark | $15 | Transactional emails (AEGIS, Support). |
| **Domain & DNS** | Cloudflare | $0 | Included. |
| **Error Tracking** | Sentry (Dev Tier) | $0 | Free tier for Rust panics. |
| **Monitoring** | Axiom (Free Tier) + `tracing` logs | $0 | OTLP HTTP, local JSON log rotation. |
| **Backup** | `wal-g` 3.0.8 | $0 | WAL archiving to Hetzner Storage Box (included in VPS cost). |
| **Storage** | Hetzner Storage Box (S3-compatible) | $0 | Included with VPS. |
| **Total Fixed Burn** | | **~$25 / mo** | |

**The Break‑Even Point:** At $49/mo per tenant, exactly **1 paying tenant** covers all fixed infrastructure costs (actually $25 / $49 = 0.51 tenants). Everything after tenant #1 is pure profit.

---

## 3. 24‑MONTH PROJECTION (The 3‑Statement Summary)

This is a conservative, bootstrapped projection. It assumes zero VC funding and relies entirely on organic PLG growth.

### 3.1 P&L Projection (Monthly)

| Month | 1 | 3 | 6 | 9 | 12 | 18 | 24 |
|-------|---|---|---|---|----|----|----|
| **Paying Tenants** | 5 | 25 | 75 | 150 | 300 | 800 | 1,500 |
| **MRR** | $245 | $1,225 | $3,675 | $7,350 | $14,700 | $39,200 | $73,500 |
| **Infra Costs** | $25 | $25 | $25 | $50 | $100 | $300 | $600 |
| **Founder Salary**| $0 | $0 | $2,000 | $4,000 | $6,000 | $10,000 | $15,000 |
| **Contractors** | $0 | $0 | $0 | $0 | $1,000 | $3,000 | $8,000 |
| **Net Profit** | **$220** | **$1,200** | **$1,650** | **$3,300** | **$7,600** | **$25,900** | **$49,900** |

### 3.2 Cash Flow & Runway
*   **Initial Capital:** $5,000 (Founder savings).
*   **Burn Rate (Months 1‑2):** ~$25/mo. Runway is infinite.
*   **Cash Flow Positive:** Month 1 (Infrastructure is covered by the first tenant).
*   **Phase 2 Trigger (Month 12):** At 300 tenants ($14.7k MRR), we upgrade to a dedicated managed Postgres (Neon/RDS) and scale the VPS. We hire a part‑time Rust engineer and a dedicated Support Agent.

---

## 4. SAAS METRICS DASHBOARD SPEC (VISTA Internal App)

We do not use ProfitWell or Baremetrics. Those are third‑party SaaS bloat. We build our own metrics dashboard natively inside Ataqu VISTA, querying our own PostgreSQL tables.

### 4.1 Data Source
All billing data is synced from Stripe via SPARK webhooks into the `collab_crm.billing_events` table. VISTA pre‑aggregated daily totals calculate the metrics.

### 4.2 The Dashboard Layout
The "Ataqu Command Center" dashboard consists of 4 high‑density data blocks:

**Block 1: The Headline Metrics (Top Row)**
*   **MRR (Monthly Recurring Revenue):** Sum of active subscriptions.
*   **ARR (Annual Recurring Revenue):** MRR * 12.
*   **Active Tenants:** Count of `tenant_id` with `status = 'active'` in `core.subscriptions`.
*   **Bundle Adoption Rate:** % of active tenants on the $49 plan vs. single‑app plans.

**Block 2: The Growth Funnel (Middle Left)**
*   **Signups (30d):** Count of new `core.users`.
*   **Activations (30d):** Count of users who triggered `first_entity_created`.
*   **Trial‑to‑Paid Conversion:** % of signups who entered a credit card within 14 days.
*   **Decommission Rate:** % of new $49 bundle users who used the CSV import tool within 7 days.

**Block 3: Churn & Retention (Middle Right)**
*   **Gross Churn Rate (30d):** Lost MRR / Previous Month MRR.
*   **Net Churn Rate (30d):** (Lost MRR - Expansion MRR) / Previous Month MRR. (Will be negative due to land‑and‑expand).
*   **Cancellation Reasons:** A raw text word‑cloud fed by the `core.cancellations` table feedback text.

**Block 4: Infrastructure Health (Bottom)**
*   **Gross Margin:** (MRR - Infra Costs) / MRR.
*   **p99 API Latency:** Pulled from Prometheus/Grafana.
*   **Outbox DLQ Depth:** Count of poison messages in the last 24h (`core.outbox` with `status='dlq'`).

---

### FINAL FINANCIAL DIRECTIVE
Ataqu is designed to be a cash machine. We do not need $5M in seed funding to buy Google Ads. We need a ruthlessly efficient Rust/PostgreSQL/SeaORM architecture, high‑converting SEO "Kill Sheets," and a $49 price point that makes saying "yes" mathematically obvious for any SMB. If we hit 1,000 tenants ($49k MRR), we have a highly profitable, self‑sustaining business that cannot be killed by a market downturn.
