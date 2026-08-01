# ⚖️ ATAQU TERMS OF SERVICE & PRIVACY POLICY — Version 1.2 (Phase 1)
### The "No-Bullshit" Legal Framework

> **Executive Note:** Standard SaaS legal documents are designed to confuse users, hide dark patterns, and protect the vendor’s right to hold data hostage. Ataqu’s legal framework is an extension of our brand: transparent, direct, and ruthlessly fair. We use plain English because we have nothing to hide. If a clause exists here, it exists for a strict operational or compliance reason, not to trap you.

---

# PART 1: TERMS OF SERVICE

**Last Updated: August 29, 2026**

### 1. The Agreement
By creating an Ataqu account, you agree to these Terms of Service ("ToS"). You ("Customer", "you", or "your") are entering into a binding agreement with Ataqu ("we", "us", or "Ataqu") to use our Unified SMB Operating System (the "Service").

If you are accepting these terms on behalf of a company, you represent that you have the authority to bind that entity.

### 2. The Service & The Bundle
Ataqu provides a suite of 10 natively integrated business applications. You may purchase individual apps or the 10-app bundle.
*   **Pricing is Fixed:** The price you agree to at checkout is the price you pay. We do not charge per-user fees. We do not charge per-task fees. We do not have hidden tiered pricing.
*   **No Long-Term Contracts:** All subscriptions are month-to-month unless explicitly stated otherwise. We do not use 3-year lock-in clauses.

### 3. The Escape Hatch (Cancellation & Data Export)
We believe software must earn your business every month.
*   **1-Click Cancellation:** You can cancel your subscription at any time directly within the Ataqu Admin settings. You do not need to call us, email us, or speak to a "retention specialist."
*   **Data Export:** Upon cancellation, you have the right to export all your data to standard CSV and JSON formats.
*   **Data Deletion:** Following cancellation, your workspace and all associated data will be permanently and cryptographically erased from our production PostgreSQL databases within 30 days. We do not retain your data to prevent you from returning.

### 4. Acceptable Use Policy
You agree not to use the Service to:
*   Violate any local, national, or international law.
*   Infringe upon the intellectual property rights of others.
*   Upload malware, malicious code, or conduct unauthorized cyberattacks.
*   Attempt to reverse engineer, decompile, or bypass the security measures of the Ataqu architecture (including our database-level tenant isolation via PostgreSQL Roles, RLS, and compile-time `TenantId` enforcement).
*   Resell or white‑label the Service without explicit written permission.

### 5. Intellectual Property
*   **Ataqu IP:** We own the Ataqu software, the Rust codebase, the UI design, and the "Ataqu" brand. You do not gain any ownership rights by using the Service.
*   **Your IP:** You retain all intellectual property rights to the data you input into Ataqu (deals, chats, docs, etc.). We are a data processor, not a data owner.

### 6. Security & Architecture Transparency
We build in Rust with PostgreSQL, SeaORM 2.0, and raw SQL escape hatch for Postgres primitives. We enforce strict tenant isolation via PostgreSQL Roles, Row Level Security (RLS), Column-Level Privileges, and a type‑safe `schema` ENUM on the unified `core.outbox` table.
*   **No AI Training:** We strictly forbid the use of Customer Data to train machine learning models, Large Language Models (LLMs), or artificial intelligence systems. Your data is never used for our internal research and development. PII is redacted at compile time via redacting newtypes (`Email`, `PhoneNumber`) with `Debug`/`Display` as `[REDACTED]`; JSON serialization is strictly restricted to the API layer via wrapper structs.
*   **Status & RCAs:** We maintain a public status page. In the event of a P0/P1 outage, we will publish a technical Root Cause Analysis (RCA) within 24 hours of resolution.

### 7. Service Availability
We target 99.9% uptime. However, we do not offer SLA‑backed financial credits for standard plans, as the flat $49/mo pricing does not support enterprise SLA infrastructure costs. If we experience catastrophic downtime, we will communicate it transparently and apply service credits at our discretion.

### 8. Limitation of Liability
To the maximum extent permitted by law:
*   Ataqu is provided "as is" and "as available."
*   We are not liable for indirect, incidental, or consequential damages (e.g., lost profits, lost revenue, or business interruption).
*   Our total liability for any claim arising from the Service is limited to the amount you paid us in the 3 months preceding the claim.

### 9. Termination for Cause
We may suspend or terminate your account immediately if you violate the Acceptable Use Policy (Section 4) or if your usage threatens the operational stability of the PostgreSQL database architecture.

### 10. Changes to These Terms
We may update these ToS. We will notify you 30 days before material changes take effect. If you disagree with the changes, your recourse is the 1‑Click Cancel button.

---
---

# PART 2: PRIVACY POLICY

**Last Updated: August 29, 2026**

### 1. The Philosophy
Ataqu does not spy on you. We do not sell your data. We do not use your CRM deals or internal DIAL chats to train AI models. We collect the absolute minimum data required to operate the 10 apps, process your billing, and comply with the law.

### 2. What We Collect
**A. Account Data:** Email address, company name, and hashed password (if not using SSO via Google/Microsoft).
**B. Billing Data:** Credit card number, expiration date, and billing address. Payment processing is strictly handled by our PCI‑DSS compliant payment processor (e.g., Stripe). We never store your full credit card number on our servers.
**C. Customer Data:** The business information you actively input into the apps (e.g., deals in CINQ, messages in DIAL, docs in PIVOT).
**D. Technical/Usage Data:** IP addresses, browser type, and aggregate usage metrics (e.g., number of API calls, active integrations) to monitor system health and prevent abuse.

### 3. How We Use Your Data
*   **To Provide the Service:** To run the 10 apps, execute SPARK automations, and display VISTA analytics.
*   **To Bill You:** To process your $49/mo subscription.
*   **To Secure the System:** To monitor for unauthorized access, enforce tenant isolation, and prevent abuse of the platform.
*   **To Provide Support:** If you contact our human support team, we will use your communication history to resolve your issue.

### 4. The AI Guarantee (Strict Prohibition)
**Ataqu explicitly prohibits the use of Customer Data for training artificial intelligence.**
*   Your data is never fed into internal or external LLMs.
*   Your data is never used for algorithmic tuning.
*   If we introduce AI features in the future (e.g., smart text generation in PIVOT), it will be strictly opt‑in, and the data from that session will not be persisted for model training.

### 5. Data Architecture & Tenant Isolation
Your Customer Data is stored in a single PostgreSQL 16.14 instance with schemas for bounded context isolation (`core`, `collab_crm`, `collab_ops`, `vault`, `dial`, `vista`). Logical separation is strictly enforced at the database level via PostgreSQL Roles, Row Level Security (RLS), Column-Level Privileges, and a type‑safe `schema` ENUM.
*   Every database query executed by the Ataqu Rust backend is scoped to your `TenantId` via compile-time `Repository` traits.
*   RLS on `core.outbox` prevents cross-domain event spoofing. Cross-schema queries are physically impossible at the database level.
*   It is architecturally impossible for one Ataqu tenant to query another tenant's data.
*   **Future Phase 2:** We will migrate to managed Postgres (Neon/RDS) while maintaining the same strict isolation guarantees.

### 6. Data Retention & Deletion
*   **Active Accounts:** Your data is retained as long as your account is active.
*   **Canceled Accounts:** Upon account cancellation, your data remains accessible for export for 7 days. After 30 days, all Customer Data is permanently and irreversibly deleted from the primary PostgreSQL databases and all backups.
*   **PII Anonymization:** In certain apps (like PAUSE/HR), GDPR anonymization routines (compiled table registry) automatically strip Personally Identifiable Information (PII) when records are deleted, replacing them with irreversible cryptographic hashes.

### 7. Sub-Processors
We use highly vetted, enterprise‑grade infrastructure providers. We do not share your Customer Data with marketing or advertising networks. Our core sub‑processors are:
*   **Hetzner:** VPS hosting for the Rust binary and PostgreSQL 16.14.
*   **Cloudflare:** Edge network, DDoS protection, and SSL termination.
*   **Stripe:** Payment processing.
*   **Google/Microsoft:** SSO identity verification (via OIDC).
*   **SendGrid / Postmark:** Transactional email delivery.
*   **Axiom / Tempo:** Logs, traces, and metrics (via OTLP HTTP).

*If we add a new sub‑processor that processes Customer Data, we will notify you 30 days in advance.*

### 8. Your Rights (GDPR & CCPA)
Depending on your location (EU/EEA or California), you have specific rights regarding your data:
*   **Right to Access:** You can request a copy of your data (or just use the 1‑click export tool).
*   **Right to Rectification:** You can correct inaccurate data.
*   **Right to Erasure:** You can request immediate deletion of your data (or just use the 1‑click cancel button).
*   **Right to Object:** You can object to certain types of processing.
*   **Data Portability:** You can export your data in machine‑readable CSV/JSON formats.

To exercise these rights, simply use the in‑app tools. If you need assistance, email `privacy@ataqu.so` from your registered email address.

### 9. International Data Transfers
Ataqu infrastructure is hosted primarily in Germany (EU). If you are outside the EU, your data may be transferred. We rely on Standard Contractual Clauses (SCCs) to ensure your data is transferred in compliance with GDPR.

### 10. Security Breach Protocol
In the event of a confirmed data breach:
1.  We will immediately secure the affected systems.
2.  We will publish an initial incident report on `status.ataqu.so` within 24 hours of detection.
3.  We will notify affected customers via email within 72 hours of detection, including the scope of the breach and the remediation steps taken.

### 11. Changes to This Policy
If we change how we process your data, we will update this document and notify you 30 days in advance. We will never retroactively apply a policy that reduces your privacy rights.

---

### FINAL LEGAL DIRECTIVE
These documents are our covenant with the user. We do not use legal text as a weapon. If a user asks what our cancellation policy is, the answer is: *"You click a button. We delete your data. We don't charge you again."* If a user asks if we train AI on their data, the answer is: *"No. Ever."* The law is simple when the intent is honest.
