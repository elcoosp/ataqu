# 👥 Ataqu — Use Cases by Persona & App

> *Real‑world scenarios for Alex (CEO), Sam (CTO), and Jordan (Ops) — anchored in 2026 market data.*

---

## 1. AEGIS (SSO & Security)

### Alex (CEO)
*“Before, I had to manage 10 different logins for my team. Every new employee = 10 accounts to create, 10 passwords to remember. When someone left, I had to revoke 10 accesses individually. After, one AEGIS account gives access to all apps — and it's all managed in one place.”*

**Bridge:** Okta charges $2‑8/user/mo depending on features. A 20‑person SMB pays $40‑160/mo just for SSO. AEGIS is included.

### Sam (CTO)
*“Before, I maintained SSO integrations with external providers — each had its own API quirks and timeouts. After, AEGIS handles JWT, MFA, and RBAC natively across all apps.”*

**Bridge:** AEGIS is built into the OS, not a bolt‑on module.

### Jordan (Ops)
*“Before, onboarding a new employee took 2 hours (account creation, invitations, permission setup). After, it takes 2 minutes.”*

**Bridge:** AEGIS automates role assignment and access provisioning.

---

## 2. CINQ (CRM)

### Alex (CEO)
*“Before, HubSpot charged us thousands per month for reporting and automation. And we were locked into 3‑year contracts. After, CINQ does everything for $15‑79/mo.”*

**Bridge:** HubSpot can cost up to $4,500/mo for a full team. CINQ is included in Pro/Suite.

### Sam (CTO)
*“Before, CRM integrations broke every time an API changed. We spent weeks debugging Zapier failures. After, CINQ emits events in real‑time directly into the OS.”*

**Bridge:** The integrated outbox eliminates fragile webhooks.

### Jordan (Ops)
*“Before, I manually extracted reports for sales meetings — Excel sheets full of errors. After, VISTA dashboards auto‑update from CINQ.”*

**Bridge:** Data flows natively from CINQ to VISTA — no ETL required.

---

## 3. DIAL (Chat & Support)

### Alex (CEO)
*“Before, Slack cost $8.75‑15/user/mo and Intercom $85‑132/agent/mo. A 20‑person team was paying $175‑300/mo for Slack + $85‑132/mo for Intercom. After, DIAL does both for a fixed price.”*

**Bridge:** Intercom now charges $0.99/AI resolution — costs can skyrocket at volume.

### Sam (CTO)
*“Before, webhooks between Slack, Intercom, and our CRM caused data loss and delays. After, DIAL uses WebSockets and the native outbox.”*

**Bridge:** Reliable, real‑time, no third‑party middleware.

### Jordan (Ops)
*“Before, support agents had no context — they had to search for customer info in 3 different tools. After, when a customer messages, their CINQ deal history appears automatically.”*

**Bridge:** DIAL and CINQ share the same database — context is instant.

---

## 4. PIVOT (Docs & Databases)

### Alex (CEO)
*“Before, Notion Business cost $20/user and Airtable $20‑45/user. A 20‑person team was paying $400‑900/mo for two tools that don't talk to each other. After, PIVOT replaces both.”*

**Bridge:** Notion AI is now bundled at $45/user — a 125% increase.

### Sam (CTO)
*“Before, Notion search was slow (2‑5 seconds) and Airtable had API rate limits. After, PIVOT search is instant and the database is fully relational.”*

**Bridge:** PIVOT uses PostgreSQL `tsvector` — sub‑15ms search.

### Jordan (Ops)
*“Before, I had to juggle between Notion docs and Airtable bases. After, PIVOT lets me link a doc directly to a CINQ deal.”*

**Bridge:** Native foreign keys between apps — no manual copy‑paste.

---

## 5. SPARK (Automation)

### Alex (CEO)
*“Before, Zapier charged us $49‑69/mo for 2,000 tasks. A 6‑step workflow could cost $200/mo. We constantly hit limits. After, SPARK is included.”*

**Bridge:** A typical SMB consumes 10,000‑20,000 tasks/mo. That's $200‑400/mo on Zapier.

### Sam (CTO)
*“Before, Zapier outages caused silent data loss — we'd only discover it days later. After, SPARK uses the native outbox. We can trace every event.”*

**Bridge:** The outbox is observable — no more black boxes.

### Jordan (Ops)
*“Before, automating 'when a deal is won, create a DIAL channel' required 5 steps in Zapier. After, it's a toggle in SPARK.”*

**Bridge:** Pre‑wired native actions — no API configuration.

---

## 6. SOND (Forms & Surveys)

### Alex (CEO)
*“Before, Typeform charged $25‑29/mo for 100 responses. If 500 people signed up for a waitlist, the form stopped working without warning. After, SOND is unlimited.”*

**Bridge:** Typeform's response limits penalize success.

### Sam (CTO)
*“Before, Typeform submissions had to be exported and re‑imported into the CRM. After, SOND pushes submissions directly to CINQ.”*

**Bridge:** Native integration — forms feed directly into the OS.

### Jordan (Ops)
*“Before, I had to pay $39/mo just to remove Typeform branding. After, SOND includes custom branding.”*

**Bridge:** No hidden costs — everything is included.

---

## 7. TEMPO (Scheduling)

### Alex (CEO)
*“Before, Calendly charged $12/seat/mo for Standard. A 10‑person team = $120/mo. After, TEMPO is included.”*

**Bridge:** Calendly Teams is now $20/seat/mo.

### Sam (CTO)
*“Before, calendar integrations were fragile — OAuth tokens expired constantly. After, TEMPO handles token refresh automatically.”*

**Bridge:** Robust OAuth management — no more broken sync.

### Jordan (Ops)
*“Before, no‑shows were only detected the next day. After, TEMPO detects within 15 minutes and sends a follow‑up.”*

**Bridge:** WebSocket hook + 5‑minute poll with sargable `ends_at` column.

---

## 8. VAULT (Inventory)

### Alex (CEO)
*“Before, Cin7 Core cost $349/mo for 5 users. After, VAULT is included in Pro/Suite.”*

**Bridge:** Cin7 Pro goes up to $599/mo.

### Sam (CTO)
*“Before, stock updates could cause overselling — race conditions in the database. After, VAULT uses atomic UPDATE queries.”*

**Bridge:** `UPDATE ... SET stock = stock - 1 WHERE stock >= 1` — database‑level safety.

### Jordan (Ops)
*“Before, I had to manually sync stock with CINQ deals. After, VAULT auto‑reserves stock when a deal is won.”*

**Bridge:** Native outbox event reserves inventory instantly.

---

## 9. PAUSE (HR)

### Alex (CEO)
*“Before, BambooHR cost $10‑25/user/mo. A 20‑person team = $200‑500/mo. After, PAUSE is included.”*

**Bridge:** Personio costs $8‑20/user/mo — another per‑user tax.

### Sam (CTO)
*“Before, when an employee left, their access wasn't automatically revoked. After, PAUSE emits an event that revokes AEGIS access.”*

**Bridge:** Auto‑deprovisioning — security by default.

### Jordan (Ops)
*“Before, I had to manually track leave balances in a spreadsheet. After, PAUSE shows balances in real‑time.”*

**Bridge:** Accrual is calculated automatically from approved requests.

---

## 10. VISTA (Analytics)

### Alex (CEO)
*“Before, Tableau Creator cost $75/user/mo. A team of 5 analysts = $375/mo. After, VISTA is included.”*

**Bridge:** Tableau requires at least one Creator license per team.

### Sam (CTO)
*“Before, configuring Tableau was a nightmare — complex data sources, expensive connectors. After, VISTA is pre‑configured for all Ataqu apps.”*

**Bridge:** Data is already there — no ETL, no connectors.

### Jordan (Ops)
*“Before, reporting was done in Excel — error‑prone and time‑consuming. After, VISTA generates dashboards automatically.”*

**Bridge:** Pre‑built KPIs for every app — revenue, pipeline, stock, support, etc.

---

## 📊 Summary: What Each Persona Saves

| Persona | Monthly Savings (20‑person team) | Key Wins |
|---------|----------------------------------|----------|
| **Alex (CEO)** | **$2,800‑$8,200/mo** | Predictable budget, no lock‑in, simple management |
| **Sam (CTO)** | **$2,800‑$8,200/mo** | Reliable integrations, no fragile webhooks, full observability |
| **Jordan (Ops)** | **$2,800‑$8,200/mo** | No manual work, no errors, instant context |

---

*Last updated: August 2026 — based on 2026 market data (HubSpot, Slack, Zapier, Notion, Calendly, Typeform, Cin7, BambooHR, Okta, Tableau pricing).*
