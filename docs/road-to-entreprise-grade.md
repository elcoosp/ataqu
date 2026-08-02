# ATAQU — Road to Enterprise-Grade  
## Zero‑Budget Edition

**Version:** 1.0  
**Date:** 2026-08-01  
**Budget:** $0 (Bootstrapped)  
**Status:** Strategic Roadmap  

---

> **TL;DR** – You don’t need $50k for SOC 2 or $10k/month for AWS to become enterprise‑ready. This roadmap replaces every expensive service with **open‑source**, **free tiers**, **self‑hosted**, and **manual** alternatives. You ship enterprise features now, pay for certifications and managed services **only after** you have paying enterprise customers.

---

## 1. The Zero‑Budget Philosophy

| Instead of… | Do this… | Cost |
|-------------|----------|------|
| Paying $15k–$50k for SOC 2 audit | Write policies, implement controls, **self‑attest** with a public Security Whitepaper. Pay for the audit **only** when a customer requires it and puts money on the table. | $0 |
| AWS/GCP managed K8s | Stick to **Hetzner CX42** (€4/mo) or use **Oracle Cloud Free Tier** (4 ARM cores, 24GB RAM free forever). Auto‑scale? Not needed at <100 tenants. | $0–€4/mo |
| Managed Postgres (Neon/RDS) | Keep **self‑hosted PostgreSQL** on the same VPS. Use `wal‑g` for backups to free S3 (Hetzner Storage Box included). | $0 |
| Paid SIEM (Splunk/Datadog) | Use **open‑source Loki + Grafana** (self‑hosted) or **Axiom free tier** (10GB ingest/mo). | $0 |
| Paid SSO (Okta/Azure AD) | Implement SAML/OIDC and SCIM yourself – it’s **code**, not a service. Use free Okta Developer tenant for testing. | $0 |
| Paid Billing (Chargebee) | Use **Stripe** (free to start, 2.9% + $0.30 per transaction) – no monthly fee. | $0 (per‑transaction) |
| Multi‑region Active‑Active | Use **Cloudflare Load Balancing** (free) with **DNS‑based failover** to a standby VPS in another region. For RPO, replicate WAL to a free S3 bucket. | $0 |
| Enterprise TAM | **You** are the TAM for the first 5 enterprise customers. | $0 |

**The rule:** If it costs money, we either build it ourselves, use the free tier, or defer it until revenue covers the cost.

---

## 2. Phase 0: Compliance & Trust – $0

### 2.1. Security Whitepaper (instead of SOC 2)
- **Action:**
  - Write a 10‑page **Security & Compliance Whitepaper** covering:
    - Data encryption (at rest, in transit).
    - Tenant isolation (TenantId, RLS, schemas).
    - PII redaction (newtypes, compile‑time).
    - Incident response plan (already in `docs/incident-response-runbook.md`).
    - Vendor sub‑processors (Hetzner, Cloudflare, Stripe).
  - Publish it at `trust.ataqu.so` alongside:
    - Real‑time uptime status (UptimeRobot free tier or self‑hosted Uptime Kuma).
    - Security contact (`security@ataqu.so`).
- **Why this works:** Early enterprise buyers will ask for security docs. A well‑written whitepaper often suffices during the evaluation phase. When they demand a SOC 2 report, you say: *“We’re SOC 2 ready and can schedule the audit upon signing – we’ll cover the cost as part of the contract.”*

### 2.2. DDQ (Security Questionnaire) Library
- **Action:**
  - Download the **SIG (Standardized Information Gathering)** questionnaire template (free).
  - Fill it out once, comprehensively.
  - Keep it in a Google Doc. When a prospect sends their own questionnaire, copy‑paste the relevant answers.
- **Cost:** $0.

### 2.3. Data Residency
- **Action:**
  - Start with **only EU‑Frankfurt** (Hetzner). When you have a US customer, provision a second VPS in the US (Hetzner has US locations) and run a separate database cluster.
  - Use application‑level routing (`tenant.region` column) to direct traffic.
- **Cost:** €4/mo per additional region (Hetzner CX22).

---

## 3. Phase 1: Identity & Access – $0

### 3.1. SAML & OIDC – Build It Yourself
- **Action:**
  - Implement SAML 2.0 SP in Rust using the `saml` crate or `rust-oauth2`. This is a code task, not a purchase.
  - Add Azure AD / Okta / Google as IdPs (they provide free developer tenants).
  - JIT provisioning: parse SAML assertions to create user accounts.
- **Cost:** $0 (developer time).

### 3.2. SCIM 2.0 – Build It Yourself
- **Action:**
  - Implement the SCIM 2.0 spec (`/Users`, `/Groups`) in Axum. There’s a `scim` crate or you can write it from scratch (simple CRUD + sync logic).
  - Use Okta’s free SCIM tester.
- **Cost:** $0.

### 3.3. RBAC – Already Planned, Just Extend
- **Action:**
  - Extend the current role system to support custom roles (Admin, Member, Viewer, Custom).
  - Store permissions in a `core.permissions` table.
  - Build an admin UI for role management (see Phase 3).
- **Cost:** $0.

### 3.4. KMS – Use the OS
- **Action:**
  - Instead of AWS KMS, use **Linux kernel encryption** (`dm-crypt` on the VPS block device) and **environment variables** for master keys.
  - For envelope encryption, use `openssl` + `age` (simple, free) or the `ring` crate with a static key derived from a passphrase.
- **Cost:** $0.

---

## 4. Phase 2: Reliability & High Availability – $0

### 4.1. Infrastructure – Stay on Hetzner, but Prepare for Scale
- **Action:**
  - Keep the single VPS (CX42) for now.
  - Set up **daily snapshots** (Hetzner offers free snapshot storage for a limited number of snapshots).
  - Use `wal‑g` to stream WAL to **Hetzner Storage Box** (included free with some plans, otherwise €3/mo for 100GB).
- **Cost:** €0–€3/mo.

### 4.2. DNS‑Based Failover (Cheap “Multi‑Region”)
- **Action:**
  - Provision a second VPS in a different Hetzner location (e.g., Finland, US) for €4/mo.
  - Replicate PostgreSQL asynchronously (use `pg_basebackup` + WAL streaming).
  - Use **Cloudflare Load Balancer** (free) with health checks pointing to the primary IP. If primary fails, Cloudflare routes to the secondary.
  - Manual failover: promote the secondary to primary (RTO ~10 minutes). Good enough for early enterprise.
- **Cost:** €4/mo for standby VPS.

### 4.3. Disaster Recovery Plan (DRP) – Document + Script
- **Action:**
  - Write a one‑page DRP with RTO = 15 min, RPO = 1 min.
  - Write a bash script that:
    1. Provisions a new VPS (using Hetzner API, free).
    2. Restores the latest WAL backup from S3.
    3. Starts the Rust binary.
  - Test it once a quarter.
- **Cost:** $0.

### 4.4. SLAs – Honor System
- **Action:**
  - Define a 99.9% uptime SLA (no financial penalties until you have revenue).
  - Publish monthly uptime reports on the Trust Center.
  - When you get your first paid enterprise customer, offer a **Service Credit** (e.g., 10% refund for downtime exceeding 1 hour) – this costs you nothing unless you actually have an outage.
- **Cost:** $0.

---

## 5. Phase 3: Administration & Governance – Build It Yourself

### 5.1. Web Admin Console – It’s Just a React App
- **Action:**
  - Create a new SPA `apps/admin` using the same stack (React, Vite, shadcn/ui).
  - Include:
    - User management (list, invite, roles).
    - Audit log viewer (fetch from `core.audit_logs` API).
    - Security settings (SSO config, IP allowlist – store in `core.tenant_settings` table).
    - Billing overview (read from Stripe webhooks).
  - Deploy it under `admin.ataqu.so`.
- **Cost:** $0 (developer time).

### 5.2. Audit Logs – Already in the Schema
- **Action:**
  - Ensure `core.audit_logs` includes all required fields (`user_id`, `action`, `ip`, `timestamp`, `tenant_id`).
  - Add an API endpoint: `GET /api/v1/audit-logs` (paginated, filterable).
  - For SIEM integration, offer a **webhook exporter** (Phase 4) or a simple CSV export for manual uploads.
- **Cost:** $0.

### 5.3. IP Allowlisting – Middleware
- **Action:**
  - Add an Axum middleware that checks the incoming IP against a tenant‑specific allowlist stored in the DB.
  - Expose an endpoint for admins to update the list.
- **Cost:** $0.

---

## 6. Phase 4: Integration & Ecosystem – $0

### 6.1. API Versioning – Prefix in Code
- **Action:**
  - Routes: `/api/v1/...`, `/api/v2/...`.
  - Copy existing handlers to new version folders when breaking changes occur.
  - Maintain both versions for 12 months.
- **Cost:** $0.

### 6.2. Outbound Webhooks – Use the Outbox Pattern
- **Action:**
  - Add a `webhook_subscriptions` table storing: `tenant_id`, `event_type`, `url`, `secret`, `retry_count`, `last_status`.
  - Run a background worker (Tokio task) that reads from `core.outbox` for `status = 'pending'` and also checks the subscriptions table.
  - If an event matches a subscription, `POST` to the URL with the payload.
  - Implement exponential backoff (2s, 4s, 8s, …) and DLQ after 5 retries.
  - Build a simple UI in the admin console to manage webhooks.
- **Cost:** $0.

### 6.3. Developer Portal – Static Documentation + Interactive
- **Action:**
  - Generate OpenAPI (Swagger) spec from your Axum routes (using `utoipa`).
  - Host the spec in a public repo and use **Redoc** or **Swagger UI** (free, self‑hosted) at `api.ataqu.so/docs`.
  - Provide a simple API key generator endpoint (store keys in `core.api_keys`).
- **Cost:** $0.

### 6.4. Management API – Reuse Internal Services
- **Action:**
  - Expose `/management/v1/users`, `/management/v1/groups`, `/management/v1/billing` endpoints.
  - These are just wrappers around your existing application services with a different auth middleware (bearer token).
- **Cost:** $0.

---

## 7. Phase 5: Commercial & Customer Success – $0

### 7.1. Billing – Use Stripe’s Free Tier
- **Action:**
  - Stripe has a free tier (no monthly fee, only per‑transaction).
  - Implement `ataqu-domain-billing` to handle:
    - Subscriptions (monthly/annual).
    - Usage‑based billing (e.g., $0.001 per automated task beyond a certain quota – use the `core.metrics` table).
    - Invoices (Stripe handles this).
  - For enterprise contracts, just send a PDF invoice manually (generate from a template) – you can do this in a spreadsheet until you have 10+ enterprise customers.
- **Cost:** 2.9% + $0.30 per transaction.

### 7.2. Customer Success – You Are the TAM
- **Action:**
  - For the first 5 enterprise customers, be their personal TAM.
  - Give them direct Slack/Discord access.
  - Offer a **Migration Guarantee**: if they fail to migrate within 7 days, you’ll do it for them (manually) – this costs you time, not money.
- **Cost:** $0 (your time).

### 7.3. White‑Glove Migration – Build an Importer
- **Action:**
  - Reuse the existing CSV importers and add support for HubSpot/Salesforce API pulls (free API quotas).
  - Create a CLI tool that runs on your VPS to batch‑migrate a tenant’s data.
- **Cost:** $0.

---

## 8. Revised Timeline (Zero‑Budget)

| Phase | Milestone | Month 0 | M3 | M6 | M9 | M12 | M15 | M18 |
|-------|-----------|---------|----|----|----|-----|-----|-----|
| **0** | Security Whitepaper + Trust Center (self‑attested) | ████████ | | | | | | |
| **1** | SAML + SCIM (code) | | ██████████ | | | | | |
| **2** | DRP + DNS failover (€4/mo standby VPS) | | | ████████████ | | | | |
| **3** | Admin Console (React) | | | | ██████████ | | | |
| **4** | Webhooks + Management API | | | | | ██████████ | | |
| **5** | Manual Enterprise Billing + First Paid TAM | | | | | | ██████████ | |
| **First Enterprise Deal** | Target: sign first paying enterprise customer | | | | | | | 🚀 |

---

## 9. What This Means for Your MLP

- **You are already 60% of the way.** Most of the “enterprise” features are just **code** – not expensive services.
- **The expensive parts (SOC 2, managed K8s, external KMS) are deferred.** You can absolutely sell to mid‑market companies without them – you just need to be transparent.
- **Your pitch:** *“We are SOC 2 ready and will undergo the audit at your request. Our architecture already meets all the controls. In the meantime, here’s our Security Whitepaper and our detailed DDQ responses.”*
- **Cash flow:** The first enterprise deal (e.g., $1,500/mo) will fund the SOC 2 audit ($15k) and the managed infrastructure upgrades.

---

## 10. Immediate Zero‑Cost Actions (Next 7 Days)

1. **Write the Security Whitepaper** (`docs/security-whitepaper.md`) – use the ADRs as source material.
2. **Set up Uptime Kuma** (self‑hosted on the same VPS) and publish a status page (`status.ataqu.so`).
3. **Fill out the SIG questionnaire** (Google Doc) – you can reuse answers from your ADRs.
4. **Create a simple admin UI mockup** – you’ll build it later, but have the design ready.
5. **Outline the SAML/SCIM implementation** – decide which Rust crates to use (`saml` or `rust-oauth2`).
6. **Set up Hetzner Storage Box** for WAL‑G backups (free).

---

## 11. Conclusion

**Enterprise readiness is not a function of budget – it’s a function of execution.**

You have:

- An **outstanding architecture** (Rust, PostgreSQL, RLS, outbox).
- A **clear MLP** (10 apps, functional features).
- A **playbook** for enterprise features (this document).

By building the features yourself (SAML, SCIM, Webhooks, Admin Console) and using free/open‑source tooling for the rest, you can **start selling to enterprise customers within 6 months** – with **zero upfront cost**.

The first enterprise deal pays for the rest. Go hunt.
