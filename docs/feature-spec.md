# ATAQU MLP FEATURE SPECIFICATION — "The Predator's Prey"

**Version:** 2.6
**Date:** 2026-08-04
**Document Type:** Product Feature Specification (MLP Scope)
**Brand Domain:** `ataqu.com`

> **PRODUCT NOTE:** This document defines the *what* — the exact feature set required for Ataqu's Minimum Lovable Product (MLP). Version 2.6 incorporates insights from real user interviews (industrial B2B environment with 12 fragmented tools) across all 10 apps. These are **cross-cutting, horizontal features** that apply universally to SMBs — not vertical-specific niche functionality.

---

## 1. THE MLP PHILOSOPHY

> **"We don't clone everything. We clone the 80% that delivers 95% of daily value, make it 10x faster, and connect it natively."**

### Free Tier (The Entry Point)
Ataqu offers a free tier to remove adoption friction:
- **100 elements** (contacts, deals, products, documents, employees, forms, workflows, channels, bookings)
- **All 10 apps** accessible
- **Unlimited users** per tenant
- **Native integrations** enabled via pre-installed SPARK templates
- **No time limit** — forever free

### Pricing Plans
| Plan | Price | Elements | Users | Apps |
|------|-------|----------|-------|------|
| **Free** | $0 | 100 | Unlimited | All 10 |
| **Starter** | $15/mo | 1,000 | Unlimited | All 10 |
| **Pro** | $39/mo | 10,000 | Unlimited | All 10 |
| **Suite** | $79/mo | Unlimited | Unlimited | All 10 |

| Feature Type | Ataqu Strategy |
|--------------|----------------|
| **P0 (Must Have)** | Faithful clone — the 80% of features used daily |
| **P1 (Should Have)** | Simplified clone — acceptable for v1.0, polish for v1.1 |
| **Ignored (Won't Have)** | Bloat — enterprise niche features, AI gimmicks, or scope creep |

**2026 Market Context:** The SaaS market has split into two camps. AI is no longer just a feature — it's becoming the fabric of every platform. However, for SMBs, the core operational features remain the same. We are not chasing AI gimmicks; we are building a reliable, fast, native OS.

---

## 2. CROSS-CUTTING FEATURES (From User Research)

These features apply globally across all 10 apps. They were validated through real user interviews with B2B professionals managing fragmented tool stacks.

### 2.1 Unified Search (P0)

**The Problem:** Users search for the same information (client name, product reference, ticket ID) across multiple tools. Each tool holds a piece of the puzzle, but none has the full picture.

**The Solution:** A single, global search bar accessible from anywhere (`⌘K` / `Ctrl+K`) that returns results across all apps:
- **CINQ:** Contacts, Deals, Activities
- **DIAL:** Channels, Messages, Threads, Tickets
- **PIVOT:** Documents, Databases, Rows
- **VAULT:** Products, Variants, Movements, Reservations
- **PAUSE:** Employees, Leave Requests
- **VISTA:** Dashboards, KPI definitions
- **SPARK:** Workflows, Runs
- **TEMPO:** Meetings, Event Types
- **SOND:** Forms, Submissions
- **AEGIS:** Users, Roles, API Keys

**Implementation:**
- Results grouped by app/entity type with context badges
- Live fuzzy matching (PostgreSQL tsvector)
- Keyboard shortcuts for quick navigation
- Recent searches stored for quick access

**Priority:** P0

---

### 2.2 Bulk Actions & Selection (P1)

**The Problem:** Users manually re-select items when moving between tools or performing repetitive operations. "Re-select everything" is a common frustration.

**The Solution:** Consistent bulk selection and action patterns across all apps:

| App | Bulk Action Examples |
|-----|---------------------|
| **CINQ** | Select 50 contacts → Export CSV, Assign to deal, Delete |
| **VAULT** | Select 30 products → Adjust stock, Delete, Archive |
| **PAUSE** | Select 5 employees → Export directory, Assign role |
| **SOND** | Select 100 submissions → Export CSV, Delete |
| **PIVOT** | Select 20 database rows → Move to another database, Delete |

**Implementation:**
- Multi-select checkboxes in all table/list views
- "Select All" / "Select Visible" actions
- Bulk operation modals with progress bars
- Inline feedback on partial failures (DLQ-style for batch operations)

**Priority:** P1 (v1.1)

---

### 2.3 Multi-Context Entities (P1)

**The Problem:** A single customer/entity can have multiple contexts (e.g., different SIRET numbers for headquarters vs. delivery sites; different billing vs. shipping addresses). Users struggle to manage these contexts within a single record.

**The Solution:** Allow multiple addresses/contexts per entity, with context selection at transaction time.

**In CINQ:**
- A `Company` can have multiple `Establishments` (each with its own SIRET, address, contact)
- When creating a Deal or Order, users select the relevant Establishment context
- Contexts are visible throughout the transaction flow

**In VAULT:**
- Products can be assigned to multiple warehouses/locations
- Stock movements select the relevant context

**Implementation:**
- JSONB fields for multiple addresses
- UI for managing contexts inline (accordion or tabbed interface)
- Context badges visible in list views

**Priority:** P1

---

### 2.4 Conditional Routing for Forms (P1)

**The Problem:** Form submissions from websites or external portals often go to the wrong person, causing delays and frustration.

**The Solution:** SOND forms can route submissions based on conditional logic:

| Routing Rule | Example |
|--------------|---------|
| By region | `If country = "France" → route to French sales team` |
| By product type | `If product_category = "Pump" → route to pump specialist` |
| By deal size | `If estimated_value > 50,000 → route to senior sales` |
| By customer segment | `If existing_customer = true → route to account manager` |

**Implementation:**
- Visual rule builder in SOND form settings
- SPARK workflows consume the routing rules
- Notifications sent via DIAL to the routed recipient

**Priority:** P1

---

### 2.5 Validation Workflows (P2)

**The Problem:** No standardized validation process. Different managers approve differently, and users don't know where a request stands.

**The Solution:** Configurable validation workflows in SPARK:

**Examples:**
- `Deal > 10,000€ → manager approval`
- `Deal > 50,000€ → director + finance approval`
- `Leave request > 5 days → HR approval`
- `Form submission with sensitive data → compliance review`

**Implementation:**
- Visual workflow builder in SPARK
- Status tracking: `pending → in_review → approved → completed`
- Notifications via DIAL at each stage
- Visibility into where a request is stuck

**Priority:** P2

---

### 2.6 Conversation Export & Audit (P2)

**The Problem:** Users screenshot chat conversations and forward them via email to create a "paper trail" for audits or compliance.

**The Solution:** Native conversation export in DIAL:
- Export a channel or conversation as PDF
- Include timestamps, sender, and message content
- Message pinning for important communications
- Audit log of messages (who said what, when)

**Implementation:**
- Export button in DIAL channel header
- PDF generation with clean formatting
- Permission-controlled (admin/moderator only)

**Priority:** P2

---

### 2.7 Selection Persistence (P1)

**The Problem:** Users select items in one view, navigate to another, and lose their selection state.

**The Solution:** Selected items persist across views within a session.

**Example:**
1. User selects 5 contacts in CINQ
2. Navigates to a deal detail
3. Returns to the contact list — the 5 are still selected

**Implementation:**
- Session-based selection state (Zustand store)
- Selection persists through navigation
- Clear selection action available

**Priority:** P1

---

## 3. CINQ (CRM) — vs HubSpot

**Ataqu Advantage:** CINQ is "HubSpot without the bloat, without the 3-year lock-in, without the per-user tax, and with native integration to DIAL and SPARK."

| Feature | Status | Justification |
|---------|--------|---------------|
| Contacts | P0 | 100% of users. The atomic unit. |
| Deals | P0 | 100% of users. The revenue engine. |
| Pipeline (drag-and-drop) | P0 | Visual deal tracking. |
| Activities (notes, calls, emails) | P0 | Deal context and history. |
| **Search (global, <50ms)** | P0 | **Unified search across all apps.** |
| CSV Import (mapping) | P0 | Migration — the "escape hatch." |
| CSV Export | P0 | "No lock-in." |
| **Bulk Actions** | P1 | **Select multiple contacts: export, assign, delete.** |
| **Multi-Context (multiple SIRET/addresses)** | P1 | **Manage establishments per company.** |
| Tasks | P1 | To-dos, assignments. |
| Email Tracking | P0 | Opens/clicks with bounded channel spill. |
| Custom Fields (JSONB) | P0 | Three-tier query strategy. |
| PII Redaction (newtypes) | P0 | Compile-time protection. |
| AI Features | Ignored | We are not an AI company. |

---

## 4. DIAL (Chat) — vs Slack

**Ataqu Advantage:** DIAL is "Slack without the per-user tax, without the AI bloat, with native CRM and support ticket integration."

| Feature | Status | Justification |
|---------|--------|---------------|
| Channels (public + private) | P0 | Container for communication. |
| Messages (text, emojis, reactions) | P0 | Core unit. |
| Threads | P0 | Organization. |
| Mentions (`@user`, `@channel`) | P0 | Notification engine. |
| File Sharing | P0 | Images, documents. |
| **Search (global, message history)** | P0 | **Unified search across all apps.** |
| Presence (online/offline/away) | P1 | Useful. |
| Focus Mode | P1 | Mute non-mentions. |
| **Conversation Export (PDF)** | P2 | **Audit trail / paper trail.** |
| **Bulk Operations (messages)** | P2 | **Select and delete multiple messages.** |
| Huddles (audio) | Ignored | Most users use Zoom. |
| 3rd-party Apps | Ignored | We are native. |

---

## 5. PIVOT (Docs & Databases) — vs Notion

**Ataqu Advantage:** PIVOT is "Notion without the AI bloat, with sub-15ms search, and with native CRM and inventory relations."

| Feature | Status | Justification |
|---------|--------|---------------|
| Documents (Markdown) | P0 | Core unit. |
| Databases (tables, views) | P0 | Reason people use Notion. |
| **Search (global, <15ms)** | P0 | **Notion search is slow (2-5s).** |
| Relations (link to CINQ deals) | P0 | Native integration. |
| Templates | P1 | Save time. |
| Checklists | P1 | Simple but essential. |
| Version History | P1 | Compliance. |
| **Bulk Actions (database rows)** | P1 | **Select and move/delete rows.** |
| AI Features | Ignored | We are not an AI company. |

---

## 6. SPARK (Automation) — vs Zapier

**Ataqu Advantage:** SPARK is "Zapier without the task limits, without the webhooks, without the 5-15 minute polling delays, and with native integration to our 10 apps."

| Feature | Status | Justification |
|---------|--------|---------------|
| Triggers ("When X happens") | P0 | Starting point. |
| Actions ("Then do Y") | P0 | Output. |
| Conditions ("If amount > 1000") | P0 | Branching logic. |
| Native Execution (<1s) | P0 | No Zapier polling delays. |
| **Conditional Routing** | P1 | **Route form submissions by region/product.** |
| **Validation Workflows** | P2 | **Configure approval processes.** |
| **Bulk Action Triggers** | P1 | **Trigger automation on bulk actions.** |
| Outbound Webhooks | P1 | External systems. |
| Scheduling | P1 | Time-based triggers. |
| 9,000+ Integrations | Ignored | We integrate our 10 apps. |

---

## 7. TEMPO (Scheduling) — vs Calendly

**Ataqu Advantage:** TEMPO is "Calendly without the per-user fees, with native CRM integration, and with timely no-show detection within 15 minutes."

| Feature | Status | Justification |
|---------|--------|---------------|
| Booking Links | P0 | Primary interface. |
| Calendar Sync | P0 | OAuth with auto-refresh. |
| Event Types | P0 | Core configuration. |
| Availability | P0 | Scheduling engine. |
| Reminders | P0 | Reduces no-shows. |
| **Search (global, meetings)** | P0 | **Unified search across all apps.** |
| No-Show Workflows | P1 | Timely detection (15-30 min). |
| CRM Integration | P1 | Creates CINQ activity. |
| ChatGPT Integration | Ignored | Gimmick. |

---

## 8. SOND (Forms) — vs Typeform

**Ataqu Advantage:** SOND is "Typeform without the response limits, with native CRM and automation integration."

| Feature | Status | Justification |
|---------|--------|---------------|
| Visual Builder (drag-and-drop) | P0 | Primary interface. |
| Question Types | P0 | Core building blocks. |
| Conditional Logic | P0 | Branching. |
| Submissions | P0 | The output. |
| CSV Export | P0 | Data portability. |
| **Conditional Routing** | P1 | **Route submissions by region/product.** |
| **Bulk Actions (submissions)** | P1 | **Select and export/delete submissions.** |
| Branding | P1 | Professional appearance. |
| Notifications | P1 | Real-time alerts. |
| AI Features | Ignored | We are not an AI company. |

---

## 9. VAULT (Inventory) — vs Cin7

**Ataqu Advantage:** VAULT is "Cin7 without the AI bloat, with native CRM and order management integration."

| Feature | Status | Justification |
|---------|--------|---------------|
| Products (name, SKU, price) | P0 | The catalog. |
| Variants (size, color, stock) | P0 | Essential for retail. |
| Real-time Stock | P0 | Core function. |
| Movements | P0 | Audit trail. |
| Low Stock Alerts | P0 | Prevents stockouts. |
| **Search (global, products)** | P0 | **Unified search across all apps.** |
| **Bulk Actions (products)** | P1 | **Select and adjust stock/delete/export.** |
| Multi-Warehouse | P1 | Multiple locations. |
| **Selection Persistence** | P1 | **Selection state persists across views.** |
| Reservations (CINQ integration) | P1 | Auto-reserve on deal won. |
| AI Forecasting | Ignored | Overkill for SMBs. |

---

## 10. PAUSE (HR) — vs Personio

**Ataqu Advantage:** PAUSE is "Personio without the payroll complexity, with native AEGIS integration."

| Feature | Status | Justification |
|---------|--------|---------------|
| Employees (name, email, role) | P0 | Employee database. |
| Leave Requests (request, approval, balance) | P0 | Primary HR function. |
| Approval Workflow | P0 | Manager → approve/reject. |
| **Search (global, employees)** | P0 | **Unified search across all apps.** |
| **Bulk Actions (employees)** | P1 | **Select and export/assign roles.** |
| Documents | P1 | Contracts, pay slips. |
| Payroll | Ignored | Too complex, regulatory. |
| Performance Reviews | Ignored | Too complex. |

---

## 11. AEGIS (SSO & Security) — vs Okta

**Ataqu Advantage:** AEGIS is "Okta without the per-user fees, built into the OS."

| Feature | Status | Justification |
|---------|--------|---------------|
| SSO (Google, Microsoft) | P0 | Core function. |
| MFA (TOTP) | P0 | Security baseline. |
| User Management | P0 | The admin interface. |
| JWT | P0 | Authentication. |
| **Search (global, users)** | P0 | **Unified search across all apps.** |
| API Keys | P1 | For developers. |
| RBAC | P1 | Roles: admin, member, viewer. |
| SCIM Provisioning | Ignored | Enterprise. Overkill for SMBs. |

---

## 12. VISTA (Analytics & BI) — vs Tableau

**Ataqu Advantage:** VISTA is "Tableau without the data engineers, without the ETL pipelines, with native data from your CRM, inventory, and chat."

| Feature | Status | Justification |
|---------|--------|---------------|
| Dashboards (widgets) | P0 | Primary output. |
| Real-time KPIs | P0 | No ETL. Native data. |
| Charts (bar, line, pie) | P0 | Visualization basics. |
| Filters (by date, team, product) | P0 | Data slicing. |
| **Search (global, dashboards)** | P0 | **Unified search across all apps.** |
| Export (PDF, CSV, PNG) | P1 | Sharing and reporting. |
| Custom SQL | P1 | Power users. |
| AI Features | Ignored | We are not an AI company. |

---

## 13. SUMMARY: MLP FEATURE MATRIX

| App | P0 Features (Ship Now) | P1 Features (v1.1) | Ignored |
|-----|----------------------|-------------------|---------|
| **Cross-Cutting** | **Unified Search** | **Bulk Actions, Multi-Context, Selection Persistence, Conditional Routing** | — |
| **CINQ** | Contacts, Deals, Pipeline, Activities, Import/Export, Search | Tasks, Email Tracking, Custom Fields, Multi-Context | AI Features |
| **DIAL** | Channels, Messages, Threads, Mentions, Files, Search | Presence, Focus Mode, Export (PDF) | Huddles, Apps |
| **PIVOT** | Docs, Databases, Search, Relations | Templates, Checklists, Version History, Bulk Actions | AI Features |
| **SPARK** | Triggers, Actions, Conditions, Native Execution | Webhooks, Scheduling, Conditional Routing, Validation Workflows | 9,000+ Integrations |
| **TEMPO** | Links, Calendar Sync, Event Types, Availability, Reminders | No-Show, CRM Integration | ChatGPT |
| **SOND** | Builder, Question Types, Logic, Submissions, Export | Branding, Notifications, Conditional Routing | AI Features |
| **VAULT** | Products, Variants, Stock, Movements, Alerts, Search | Multi-Warehouse, Reservations, Bulk Actions | AI Forecasting |
| **PAUSE** | Employees, Leave, Approvals, Search | Documents, Directory, Bulk Actions | Payroll |
| **AEGIS** | SSO, MFA, Users, JWT, Search | API Keys, RBAC | SCIM |
| **VISTA** | Dashboards, Charts, Filters, Real-time KPIs, Search | Export, Custom SQL | AI Features |

---

## 14. BUILD ORDER RECOMMENDATION

With the new cross-cutting features integrated:

| Week | Apps | Rationale |
|------|------|-----------|
| **Week 1** | AEGIS + CINQ | Foundation + Revenue path + Unified Search |
| **Week 2** | DIAL + PIVOT | Engagement + Collaboration |
| **Week 3** | SPARK + TEMPO + SOND | Automation + Productivity + Conditional Routing |
| **Week 4** | VAULT + PAUSE + VISTA | Complements + Bulk Actions |
| **v1.1** | — | Multi-Context, Selection Persistence, Validation Workflows |

---

## 15. THE ATAQU DIFFERENTIATOR (Why We Win)

| Competitor | Their MoaT | Our Counter-Strategy |
|------------|------------|---------------------|
| **HubSpot** | AI + Ecosystem | Price ($49/mo vs $1,200/mo) + No lock-in + Native integration + **Unified Search across all apps** |
| **Slack** | Ubiquity | No per-user fees + Unified chat/support + **Conversation Export** |
| **Notion** | Flexibility | Sub-15ms search + Native relations + **Bulk Actions** |
| **Zapier** | 9,000+ apps | No task limits + <1s execution + **Conditional Routing** |
| **Calendly** | Simplicity | No per-user fees + Native CRM activity + Timely no-show |
| **Typeform** | UX | No response limits + Native CRM lead creation + **Conditional Routing** |
| **Cin7** | Depth | No AI bloat + Native CRM order integration + **Bulk Actions** |
| **Personio** | Compliance | No payroll complexity + Native AEGIS deprovisioning |
| **Okta** | Enterprise | No per-user fees + Built into the OS + **Unified Search** |
| **Tableau** | Visual power | No ETL + Native real-time data + **Unified Search** |

---

**Document prepared for Ataqu Architecture Team. Ready for AI agent implementation.**
