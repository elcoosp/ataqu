# ATAQU MLP FEATURE SPECIFICATION — "The Predator's Prey"

**Version:** 2.9 (MLP Competitive Drivers Update)
**Date:** 2026-08-08
**Document Type:** Product Feature Specification (MLP Scope)
**Brand Domain:** `ataqu.com`

> **PRODUCT NOTE:** Version 2.9 incorporates insights from competitor love-driver analysis (G2, Capterra, TrustRadius, Reddit 2024-2026) across 11 competitors. Four high-value, low-complexity features have been added to the MLP scope based on what users *adore* about competing tools: **Conversational Form Mode** (SOND), **Chart Drill-Down** (VISTA), **Shopify Sync** (VAULT), and **Ultra-Simple Booking UX** (TEMPO). All existing P0/P1/P2 priorities and cross-cutting features (2.1–2.12) remain unchanged. Features requiring AI, complex enterprise integrations, or significant backend overhauls have been explicitly ignored for MLP.

---

## 1. THE MLP PHILOSOPHY

> **"We don't clone everything. We clone the 80% that delivers 95% of daily value, make it 10x faster, and connect it natively. Then we wrap it in a layer of operational trust that no fragmented stack can match."**

### Free Tier (The Entry Point)
Ataqu offers a generous free tier to remove adoption friction entirely:
- **100 base elements** (contacts, deals, products, documents, employees, forms, workflows, channels, bookings)
- **Unlock up to 100 bonus elements** by completing activation tasks:
  - `Import data` → +25 elements
  - `Enable a native integration` → +25 elements
  - `Create a SPARK workflow` → +25 elements
  - `Invite a team member` → +25 elements
- **Max free tier** = 200 elements (100 base + 100 bonus)
- **All 10 apps** accessible — no gating, no "upgrade to unlock"
- **Unlimited users** per tenant — no per-seat tax from day one
- **Native integrations** enabled via pre-installed SPARK templates
- **No time limit** — forever free, because we earn your business every month

**Soft limit behavior:**
- At 85 elements : toast *"You're approaching the free tier limit. Complete tasks to earn more elements free."*
- At 100 elements : creating is **blocked**, but reading, editing, and integrations continue working.
- Upgrade prompt shows tasks completed and bonus earned : *"You've earned 50 bonus elements. Upgrade to Starter ($15/mo) to unlock unlimited."*

### Pricing Plans
| Plan | Price | Elements | Users | Apps |
|------|-------|----------|-------|------|
| **Free** | $0 | 100 | Unlimited | All 10 |
| **Starter** | $15/mo | 1,000 | Unlimited | All 10 |
| **Pro** | $39/mo | 10,000 | Unlimited | All 10 |
| **Suite** | $79/mo | Unlimited | Unlimited | All 10 |

### Feature Priority Framework
| Feature Type | Ataqu Strategy |
|--------------|----------------|
| **P0 (Must Have)** | Ship now. Core functionality + trust-building operational features. |
| **P1 (Should Have)** | Ship in v1.0 if time permits, otherwise v1.1. Differentiators, not blockers. |
| **P2 (Nice to Have)** | Post-launch polish. |

**2026 Market Context:** The SaaS market has split into two camps: AI-wrapped legacy tools and fragmented best-of-breed stacks. SMBs are exhausted. They don't want more features — they want **fewer surfaces**, **predictable costs**, **operational visibility**, and the confidence that their data and workflows won't break silently. Ataqu is built for this reality.

---

## 2. CROSS-CUTTING FEATURES (10 Total — 6 Existing + 4 New)

These features apply globally across all 10 apps. They were validated through real user interviews and social listening (Grok analysis of 200+ authentic founder/CTO/Ops posts).

---

### 2.1 Unified Search (P0)

**The Problem:** Users search for the same information (client name, product reference, ticket ID) across multiple tools. Each tool holds a piece of the puzzle, but none has the full picture. This forces context switching and manual data reconciliation.

**The Solution:** A single, global search bar accessible from anywhere (`⌘K` / `Ctrl+K`) that returns results across all apps simultaneously:
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
- Results grouped by app/entity type with context badges (e.g., "CINQ · Deal")
- Live fuzzy matching powered by PostgreSQL `tsvector` with GIN indexes (sub‑15ms)
- Keyboard shortcuts: `⌘K` to open, arrow keys to navigate, Enter to navigate
- Recent searches stored in localStorage for quick access
- Fallback: if an app's API is slow, results appear progressively (no spinner wall)

**Priority:** P0

---

### 2.2 Bulk Actions & Selection (P1)

**The Problem:** Users manually re-select items when moving between tools or performing repetitive operations. "Re-select everything" is a common frustration. The research shows this is a top-5 daily time-waster.

**The Solution:** Consistent bulk selection and action patterns across all apps, with selection state preserved across navigation.

| App | Bulk Action Examples |
|-----|---------------------|
| **CINQ** | Select 50 contacts → Export CSV, Assign to deal, Delete |
| **VAULT** | Select 30 products → Adjust stock, Delete, Archive |
| **PAUSE** | Select 5 employees → Export directory, Assign role |
| **SOND** | Select 100 submissions → Export CSV, Delete |
| **PIVOT** | Select 20 database rows → Move to another database, Delete |
| **DIAL** | Select 10 messages → Delete, Archive |
| **SPARK** | Select 5 workflows → Enable/Disable, Delete |

**Implementation:**
- Multi-select checkboxes in all table/list views (consistent visual style)
- "Select All" / "Select Visible" actions in the header
- Bulk operation modals with progress bars (for large batches)
- Inline feedback on partial failures (DLQ-style for batch operations, showing which rows failed and why)
- Selection persistence: selected items remain selected when navigating away and back (Zustand store)

**Priority:** P1 (v1.1)

---

### 2.3 Multi-Context Entities (P1)

**The Problem:** A single customer/entity can have multiple contexts (e.g., different SIRET numbers for headquarters vs. delivery sites; different billing vs. shipping addresses). Users struggle to manage these contexts within a single record, leading to duplicate entries and data inconsistency.

**The Solution:** Allow multiple addresses/contexts per entity, with context selection at transaction time.

**In CINQ:**
- A `Company` can have multiple `Establishments` (each with its own SIRET, address, contact, VAT number)
- When creating a Deal or Order, users select the relevant Establishment context
- Contexts are visible throughout the transaction flow (badges on deals, invoices, activities)

**In VAULT:**
- Products can be assigned to multiple warehouses/locations
- Stock movements select the relevant context (warehouse)
- Inventory reports can be filtered by warehouse

**Implementation:**
- JSONB fields for multiple addresses (ADR-030 three-tier query strategy)
- UI for managing contexts inline (accordion or tabbed interface within the detail view)
- Context badges visible in list views (e.g., "HQ · Paris" / "Delivery · Lyon")
- Default context selection based on user's last choice or tenant defaults

**Priority:** P1

---

### 2.4 Conditional Routing for Forms (P1)

**The Problem:** Form submissions from websites or external portals often go to the wrong person, causing delays and frustration. Research shows this is a top complaint for marketing and sales ops.

**The Solution:** SOND forms can route submissions based on conditional logic, powered by SPARK workflows.

| Routing Rule | Example |
|--------------|---------|
| By region | `If country = "France" → route to French sales team` |
| By product type | `If product_category = "Pump" → route to pump specialist` |
| By deal size | `If estimated_value > 50,000 → route to senior sales` |
| By customer segment | `If existing_customer = true → route to account manager` |
| By form field value | `If support_tier = "premium" → route to priority queue` |

**Implementation:**
- Visual rule builder in SOND form settings (condition + action)
- SPARK workflows consume the routing rules via native outbox events
- Notifications sent via DIAL to the routed recipient (or email fallback)
- Routing history visible in form submissions (who received it, when, status)

**Priority:** P1

---

### 2.5 Validation Workflows (P2)

**The Problem:** No standardized validation process. Different managers approve differently, and users don't know where a request stands. Research shows this leads to operational bottlenecks and frustration.

**The Solution:** Configurable validation workflows in SPARK.

**Examples:**
- `Deal > 10,000€ → manager approval`
- `Deal > 50,000€ → director + finance approval`
- `Leave request > 5 days → HR approval`
- `Form submission with sensitive data → compliance review`
- `Purchase order > 5,000€ → procurement approval`

**Implementation:**
- Visual workflow builder in SPARK (drag and drop approval nodes)
- Status tracking: `pending → in_review → approved → completed` or `rejected`
- Notifications via DIAL at each stage (mentions the approver)
- Visibility into where a request is stuck (dashboard of pending approvals)
- Escalation: if no action in 48 hours, notify the next level

**Priority:** P2

---

### 2.6 Conversation Export & Audit (P2)

**The Problem:** Users screenshot chat conversations and forward them via email to create a "paper trail" for audits or compliance. This is manual, insecure, and unprofessional.

**The Solution:** Native conversation export in DIAL.

**Features:**
- Export a channel or conversation as PDF (with timestamp, sender, and message content)
- Message pinning for important communications (pinned messages appear at the top)
- Audit log of messages (who said what, when, edit history)
- Export includes metadata: channel name, participants, timestamps

**Implementation:**
- Export button in DIAL channel header (admin/moderator only)
- PDF generation with clean, branded formatting (Ataqu header, dark-mode compatible)
- Permission-controlled (configurable per role)
- Exports are stored in the user's download folder, not on Ataqu servers (privacy-first)

**Priority:** P2

---

### 2.7 Selection Persistence (P1)

**The Problem:** Users select items in one view, navigate to another, and lose their selection state. This is a small but persistent friction point that accumulates over a day.

**The Solution:** Selected items persist across views within a session.

**Example Flow:**
1. User selects 5 contacts in CINQ
2. Navigates to a deal detail
3. Returns to the contact list — the 5 are still selected
4. User can then perform a bulk action on them

**Implementation:**
- Session-based selection state (Zustand store, cleared on logout)
- Selection persists through navigation (using `useEffect` and URL state)
- Clear selection action available in the UI (deselect all)
- Selection count displayed in the header (e.g., "5 selected")

**Priority:** P1

---

### 🆕 2.8 System Health & Observability (P0)

**The Problem (from research):** *"Every dollar that comes in has a support ticket attached to it on the way out."* — silent failures (Zapier drops, API changes, cache staleness) go unnoticed until a customer complains. Founders lose nights debugging. Operators lose trust.

**The Solution:** A native, always-visible health dashboard that reports the status of all critical background processes, integrated into the global Shell and VISTA.

**Features:**
- **Global Health Widget:** A small indicator in the Shell header (green/amber/red dot) with text: `"All systems nominal"` or `"1 workflow failed"` or `"Outbox lag: 2s"`. Clicking opens the full dashboard.
- **Dedicated `/health` Dashboard (in VISTA):**
  - **Workflow Execution Status:** For every SPARK workflow, show last run timestamp, success/failure, and DLQ depth.
  - **Outbox Relay Health:** Lag in seconds (`LISTEN/NOTIFY` delay), number of pending events in `core.outbox`.
  - **Integration Status:** Native connectors (CINQ→DIAL, SOND→CINQ, VAULT→CINQ) with green/yellow/red indicators and last event timestamp.
  - **Connection Pools:** Current DB connection usage (35 max), pool wait times.
  - **DLQ Viewer:** List of failed events with payload, error reason, and retry/delete actions.
- **Alerting:** Proactive in-app toast when a workflow fails or an integration degrades (e.g., "Outbox relay lag > 5s").
- **Email Alerts (optional):** Send a weekly health digest or P0 alerts to admin email.

**Implementation:**
- Backend exposes `/api/health/status` aggregating metrics from `core.outbox`, `spark.workflows`, and connection pools.
- Frontend polls every 10 seconds (or uses SSE for real-time updates).
- The health widget is part of `@ataqu/ui` Shell component.
- VISTA dashboard uses the same data to render charts and tables.

**Priority:** **P0** (ship now)

---

### 🆕 2.9 Access Governance & Audit Matrix (P0)

**The Problem (from research):** *"searching five tools to find one answer is the actual daily pain… how do you deal with permissions across sources?"* — as teams grow (20+ employees), managing who has access to what becomes a nightmare. No unified view of roles/permissions. Audit trails are scattered.

**The Solution:** A single, cross-app permission matrix and unified audit trail, built into AEGIS.

**Features:**
- **Permission Matrix (The "Who Has Access" View):** A high-density table in AEGIS where rows = users, columns = apps, cells = role (Admin/Edit/View/None). Admins can update roles directly from this view via inline dropdowns.
- **Role Templates:** Pre-built roles (Admin, Member, Viewer) that apply consistently across all apps. Custom roles can be created (e.g., "Sales Manager" with Edit rights on CINQ and View on VAULT).
- **Unified Audit Log:** A chronological list of all actions performed across all apps (login, create, update, delete, export, role change) with:
  - User (who)
  - Action (what)
  - App (where)
  - Timestamp (when)
  - IP address (optional)
  - Searchable and exportable to CSV/JSON.
- **SSO/SCIM Readiness:** Even if not fully implemented in v1.0, the UI includes a "SCIM / SAML" section with a tooltip: *"Available on Pro plans. Automate user provisioning."* (signals enterprise readiness).

**Implementation:**
- Backend: AEGIS stores permissions in `core.roles` and `core.permissions` tables. The matrix is built by joining users, apps, and roles.
- Frontend: AEGIS `_auth/admin/access-matrix.tsx` renders a virtualized table (TanStack Virtual) for performance.
- Audit logs are stored in `core.audit_logs` (already designed) and exposed via a VISTA dashboard widget.
- Permission changes are audited themselves (who changed what role, when).

**Priority:** **P0** (ship now)

---

### 🆕 2.10 Onboarding Activation & Churn Prevention (P1)

**The Problem (from research):** *"great product, customers complete onboarding… but six months later too many quietly disappear."* — the silent churn. Users sign up, complete the initial setup, but never reach the "aha" moment. No feedback loop, no intervention.

**The Solution:** A proactive onboarding activation system that tracks progress, celebrates milestones, and intervenes before silence.

**Features:**
- **Setup Progress Tracker:** A persistent widget in the Shell (top-right or sidebar) showing a percentage: `"Setup progress: 60% (3/5 tasks completed)"`. Tasks are context-specific:
  - "Import 10 contacts" (CINQ)
  - "Connect CINQ to DIAL" (native integration)
  - "Create your first SPARK workflow"
  - "Invite 2 team members"
  - "Create a VISTA dashboard"
- **Achievement Badges:** When a user completes a milestone, a subtle, non-intrusive badge appears (e.g., "Automator" for first SPARK workflow). No confetti, just a quiet acknowledgment.
- **Inactivity Alerts:** If a user hasn't logged in for 7 days, show a subtle toast on the next login: *"We noticed you've been away. Here's what changed in your workspace."* (links to changelog).
- **Team Activation View (for Admins):** In AEGIS or VISTA, admins can see the last login date and activation progress of each team member. Helps managers identify who needs a nudge.

**Implementation:**
- Zustand store tracks completed tasks (persisted in localStorage).
- Backend API endpoints record activation events (e.g., `POST /api/onboarding/task-complete`).
- The Setup Progress widget is part of the global Shell.
- Inactivity detection: cron job checks last login date; triggers in-app notification on next login.

**Priority:** **P1**

---

### 🆕 2.11 Data Consolidation & Cross-App Dashboards (P1)

**The Problem (from research):** *"spend weeks manually consolidating data from multiple sources before they can begin meaningful analysis."* — the real bottleneck is not insights, but setup time. Users copy-paste data from CRM to spreadsheets to presentation decks.

**The Solution:** Pre-built, cross-app dashboards and a "Combine Data" feature that eliminates manual consolidation.

**Features:**
- **Cross-App Dashboards (in VISTA):** Pre-configured dashboards that pull data from multiple apps:
  - *Revenue + Inventory:* CINQ deals won + VAULT stock levels (are we selling what we have?)
  - *Support + Sales:* DIAL ticket volume + CINQ deal pipeline (are support issues affecting sales?)
  - *HR + Security:* PAUSE leave requests + AEGIS access logs (who is out, who has access?)
- **"Combine Data" Button:** In any VISTA dashboard, a button that allows users to overlay data from two sources (e.g., deals + stock) on a single chart without writing SQL. Powered by pre-aggregated views in PostgreSQL.
- **One-Click Export of Combined Data:** Export the combined view as CSV/JSON for use in external presentations.

**Implementation:**
- Backend: VISTA aggregator already listens to all outbox events. We add pre-aggregated `cross_app_views` materialized views.
- Frontend: VISTA widget picker includes a "Cross-App" category. When selected, user chooses the primary and secondary data source.
- The "Combine Data" feature uses a simple dropdown UI (no SQL required).

**Priority:** **P1**

---

### 🆕 2.12 Changelog & Stability Policy (P2)

**The Problem (from research):** Tools that remove features, change UI without warning, or force migrations to worse versions erode trust. Users feel held hostage by the vendor's roadmap.

**The Solution:** A transparent changelog and a documented stability policy, visible directly in the app.

**Features:**
- **In-App Changelog:** A bell icon in the Shell header. Clicking opens a modal: *"What's new this week"* listing the last 3-5 features, improvements, and bug fixes. Each entry has a date and a category (New / Improved / Fixed).
- **Stability Policy Page:** A dedicated `/changelog` page (public) that outlines:
  - No feature will be removed without 30 days' notice.
  - No breaking UI changes without a legacy toggle for 30 days.
  - Deprecation notices are posted in the changelog and sent via email to admins.
- **Legacy Toggles:** If a major UI change is introduced, an admin can revert to the old UI for 30 days via a toggle in Settings.

**Implementation:**
- Backend: A simple `core.changelog` table with `date`, `title`, `description`, `category`, `breaking_change` boolean.
- Frontend: Bell icon with a red dot if there are unread entries since the user's last visit. Modal uses the same glassmorphic styling as the Command Palette.
- Legacy toggle: Stored in `core.tenant_settings` (JSONB).

**Priority:** P2

### 2.13 Migration Wizards (P1)

**The Problem:** Users are afraid to leave competitors because they don't know how to export their data or fear the migration effort.

**The Solution:** An in-app step-by-step migration wizard for each major competitor (HubSpot, Slack, Zapier, Notion). The wizard guides the user through:
1. Exporting data from the competitor (with screenshots)
2. Uploading the CSV/JSON file to Ataqu
3. Automatic column mapping (with manual override)
4. Preview of the data before import
5. One-click import and confirmation

**Implementation:**
- Route: `/migration/:competitor` (e.g., `/migration/hubspot`)
- Backend: `POST /api/v1/migration/parse` and `POST /api/v1/migration/import`
- Integration with the Stack Audit dashboard (`/audit`) – when a user marks a competitor as "decommissioned", they are prompted to use the migration wizard.

**Priority:** P1

---

## 3. CINQ (CRM) — vs HubSpot

**Ataqu Advantage:** CINQ is "HubSpot without the bloat, without the 3-year lock-in, without the per-user tax, and with native integration to DIAL and SPARK."

| Feature | Status | Justification |
|---------|--------|---------------|
| Contacts | P0 | 100% of users. The atomic unit. |
| Deals | P0 | 100% of users. The revenue engine. |
| Pipeline (drag-and-drop) | P0 | Visual deal tracking. Activities (notes, calls, emails) | P0 | Deal context and history. |
| **Search (global, <50ms)** | P0 | Unified search across all apps. |
| CSV Import (mapping) | P0 | Migration — the "escape hatch." |
| CSV Export | P0 | "No lock-in." |
| **Bulk Actions** | P1 | Select multiple contacts: export, assign, delete. |
| **Multi-Context (multiple SIRET/addresses)** | P1 | Manage establishments per company. |
| Tasks | P1 | To-dos, assignments. |
| Email Tracking | P0 | Opens/clicks with bounded channel spill. |
| Custom Fields (JSONB) | P0 | Three-tier query strategy. |
| PII Redaction (newtypes) | P0 | Compile-time protection. |
| AI Features | Ignored | We are not an AI company. |

---

## 4. DIAL (Chat & Support) — vs Slack

**Ataqu Advantage:** DIAL is "Slack without the per-user tax, without the AI bloat, with native CRM and support ticket integration, and with a native audit trail."

| Feature | Status | Justification |
|---------|--------|---------------|
| Channels (public + private) | P0 | Container for communication. |
| Messages (text, emojis, reactions) | P0 | Core unit. |
| Threads | P0 | Organization. |
| Mentions (`@user`, `@channel`) | P0 | Notification engine. |
| File Sharing | P0 | Images, documents. |
| **Search (global, message history)** | P0 | Unified search across all apps. |
| Presence (online/offline/away) | P1 | Useful. |
| Focus Mode | P1 | Mute non-mentions. |
| **Conversation Export (PDF)** | P2 | Audit trail / paper trail. |
| **Bulk Operations (messages)** | P2 | Select and delete multiple messages. |
| Huddles (audio) | Ignored | Most users use Zoom. |
| 3rd-party Apps | Ignored | We are native. |

**Cross-cutting note:** DIAL's conversation history is included in the **Unified Audit Log** (2.9), so admins can see who said what across all channels.

---

## 5. PIVOT (Docs & Databases) — vs Notion

**Ataqu Advantage:** PIVOT is "Notion without the AI bloat, with sub-15ms search, and with native CRM and inventory relations."

| Feature | Status | Justification |
|---------|--------|---------------|
| Documents (Markdown) | P0 | Core unit. |
| Databases (tables, views) | P0 | Reason people use Notion. |
| **Search (global, <15ms)** | P0 | Notion search is slow (2-5s). |
| Relations (link to CINQ deals) | P0 | Native integration. |
| Templates | P1 | Save time. |
| Checklists | P1 | Simple but essential. |
| Version History | P1 | Compliance. |
| **Bulk Actions (database rows)** | P1 | Select and move/delete rows. |
| AI Features | Ignored | We are not an AI company. |

---

## 6. SPARK (Automation) — vs Zapier

**Ataqu Advantage:** SPARK is "Zapier without the task limits, without the webhooks, without the 5-15 minute polling delays, with native integration to our 10 apps, and with built-in health monitoring."

| Feature | Status | Justification |
|---------|--------|---------------|
| Triggers ("When X happens") | P0 | Starting point. |
| Actions ("Then do Y") | P0 | Output. |
| Conditions ("If amount > 1000") | P0 | Branching logic. |
| Native Execution (<1s) | P0 | No Zapier polling delays. |
| **Conditional Routing** | P1 | Route form submissions by region/product. |
| **Validation Workflows** | P2 | Configure approval processes. |
| **Bulk Action Triggers** | P1 | Trigger automation on bulk actions. |
| Outbound Webhooks | P1 | External systems. |
| Scheduling | P1 | Time-based triggers. |
| 9,000+ Integrations | Ignored | We integrate our 10 apps. |

**Cross-cutting note:** SPARK workflows are **monitored by the System Health dashboard (2.8)**. Each workflow shows last run status, failure count, and DLQ depth.

---

## 7. TEMPO (Scheduling) — vs Calendly

**Ataqu Advantage:** TEMPO is "Calendly without the per-user fees, with native CRM integration, with timely no-show detection within 15 minutes, and with an ultra‑simple booking UX."

| Feature | Status | Justification |
|---------|--------|---------------|
| Booking Links | P0 | Primary interface. |
| Calendar Sync | P0 | OAuth with auto-refresh. |
| Event Types | P0 | Core configuration. |
| Availability | P0 | Scheduling engine. |
| Reminders | P0 | Reduces no-shows. |
| **Search (global, meetings)** | P0 | Unified search across all apps. |
| No-Show Workflows | P1 | Timely detection (15-30 min). |
| CRM Integration | P1 | Creates CINQ activity. |
| **🆕 Ultra-Simple Booking UX** | **P0** | **The public booking page must be 3 clicks max. No complex configuration visible to the invitee. Mobile-first, single-screen layout.** |
| ChatGPT Integration | Ignored | Gimmick. |

**UX Note (from competitor research):** Calendly users love its *radical simplicity*. The booking page should show: (1) Event type, (2) Time slot picker, (3) Name + email. That's it. No extra fields, no configuration overload. Implement this as the default view. Advanced options (buffers, custom questions) are hidden behind a "Show advanced" toggle.

---

## 8. SOND (Forms) — vs Typeform

**Ataqu Advantage:** SOND is "Typeform without the response limits, with native CRM and automation integration, with conditional routing built‑in, and with a conversational mode that boosts completion rates."

| Feature | Status | Justification |
|---------|--------|---------------|
| Visual Builder (drag-and-drop) | P0 | Primary interface. |
| Question Types | P0 | Core building blocks. |
| Conditional Logic | P0 | Branching. |
| Submissions | P0 | The output. |
| CSV Export | P0 | Data portability. |
| **Conditional Routing** | P1 | Route submissions by region/product. |
| **Bulk Actions (submissions)** | P1 | Select and export/delete submissions. |
| Branding | P1 | Professional appearance. |
| Notifications | P1 | Real-time alerts. |
| **🆕 Conversational Mode** | **P0** | **Toggle in the builder to switch from "standard" (all questions on one page) to "conversational" (one question per slide, with smooth transitions). This mimics Typeform's UX and increases completion rates by 30%+.** |
| AI Features | Ignored | We are not an AI company. |

**Implementation Note (Conversational Mode):**
- Frontend-only feature (no backend changes).
- When toggled, the form renders one question at a time with a "Next" button.
- Progress bar shows completion percentage.
- Smooth slide transitions (150ms ease-out).
- Works with conditional logic (questions appear/disappear per slide).
- Mobile-first: large touch targets, readable text.

---

## 9. VAULT (Inventory) — vs Cin7

**Ataqu Advantage:** VAULT is "Cin7 without the AI bloat, with native CRM and order management integration, with real‑time stock visibility, and with native Shopify sync."

| Feature | Status | Justification |
|---------|--------|---------------|
| Products (name, SKU, price) | P0 | The catalog. |
| Variants (size, color, stock) | P0 | Essential for retail. |
| Real-time Stock | P0 | Core function. |
| Movements | P0 | Audit trail. |
| Low Stock Alerts | P0 | Prevents stockouts. |
| **Search (global, products)** | P0 | Unified search across all apps. |
| **Bulk Actions (products)** | P1 | Select and adjust stock/delete/export. |
| Multi-Warehouse | P1 | Multiple locations. |
| **Selection Persistence** | P1 | Selection state persists across views. |
| Reservations (CINQ integration) | P1 | Auto-reserve on deal won. |
| **🆕 Shopify Sync** | **P0** | **Connect VAULT to Shopify. Sync products, inventory levels, and orders bi-directionally. One-click OAuth setup. Worker polls Shopify API every 5 minutes.** |
| **🆕 Amazon Sync** | **P1** | **Connect VAULT to Amazon Seller Central. Sync inventory levels. (More complex than Shopify, defer to v1.1 if needed.)** |
| AI Forecasting | Ignored | Overkill for SMBs. |

**Implementation Note (Shopify Sync):**
- OAuth flow: User clicks "Connect Shopify" → redirects to Shopify OAuth → installs Ataqu app → redirects back.
- Background worker: polls Shopify API every 5 minutes for product updates, inventory changes, and new orders.
- Webhooks: optionally, Shopify can push updates in real-time (webhook endpoint: `/api/v1/vault/shopify/webhook`).
- Inventory sync: when stock changes in VAULT, push to Shopify. When an order is placed in Shopify, decrement stock in VAULT.
- Error handling: if sync fails, log to DLQ and show a warning in the System Health dashboard.

---

## 10. PAUSE (HR) — vs Personio

**Ataqu Advantage:** PAUSE is "Personio without the payroll complexity, with native AEGIS deprovisioning, and with a unified employee directory."

| Feature | Status | Justification |
|---------|--------|---------------|
| Employees (name, email, role) | P0 | Employee database. |
| Leave Requests (request, approval, balance) | P0 | Primary HR function. |
| Approval Workflow | P0 | Manager → approve/reject. |
| **Search (global, employees)** | P0 | Unified search across all apps. |
| **Bulk Actions (employees)** | P1 | Select and export/assign roles. |
| Documents | P1 | Contracts, pay slips. |
| Payroll | Ignored | Too complex, regulatory. |
| Performance Reviews | Ignored | Too complex. |

**Cross-cutting note:** PAUSE's offboarding flow triggers AEGIS access revocation via outbox (EmployeeOffboardedV1 → AEGIS revokes JWT).

---

## 11. AEGIS (SSO & Security) — vs Okta

**Ataqu Advantage:** AEGIS is "Okta without the per-user fees, built into the OS, with a unified permission matrix and audit trail."

| Feature | Status | Justification |
|---------|--------|---------------|
| SSO (Google, Microsoft) | P0 | Core function. |
| MFA (TOTP) | P0 | Security baseline. |
| User Management | P0 | The admin interface. |
| JWT | P0 | Authentication. |
| **Search (global, users)** | P0 | Unified search across all apps. |
| **Permission Matrix** | **P0** | **Cross-app role visibility and management.** |
| **Unified Audit Log** | **P0** | **See all actions across all apps.** |
| API Keys | P1 | For developers. |
| RBAC | P1 | Roles: admin, member, viewer. |
| SCIM Provisioning | Ignored | Enterprise. Overkill for SMBs. |

---

## 12. VISTA (Analytics & BI) — vs Tableau

**Ataqu Advantage:** VISTA is "Tableau without the data engineers, without the ETL pipelines, with native data from your CRM, inventory, and chat, with a built‑in health dashboard, and with interactive chart drill‑down."

| Feature | Status | Justification |
|---------|--------|---------------|
| Dashboards (widgets) | P0 | Primary output. |
| Real-time KPIs | P0 | No ETL. Native data. |
| Charts (bar, line, pie) | P0 | Visualization basics. |
| Filters (by date, team, product) | P0 | Data slicing. |
| **Search (global, dashboards)** | P0 | Unified search across all apps. |
| **System Health Dashboard** | **P0** | **Outbox lag, workflow failures, DLQ.** |
| **Cross-App Dashboards** | **P1** | **Combine data from multiple apps.** |
| **🆕 Chart Drill-Down** | **P0** | **Click on a bar, line, or pie segment → open a modal/sheet showing the underlying raw data (e.g., list of deals that make up that bar). This mimics Tableau's interactivity and makes charts actionable.** |
| Export (PDF, CSV, PNG) | P1 | Sharing and reporting. |
| Custom SQL | P1 | Power users. |
| AI Features | Ignored | We are not an AI company. |

**Implementation Note (Chart Drill-Down):**
- Uses Recharts `onClick` event on `<Bar>`, `<Line>`, or `<Pie>` components.
- When clicked, fetch raw data from backend using the same filters + the specific dimension clicked (e.g., "month=2026-08").
- Display results in a glassmorphic modal or sheet with a TanStack Table.
- The data is already in the PostgreSQL database — no complex pre-aggregation needed.
- Allows users to "investigate" the data behind the chart, making VISTA feel more powerful than a static dashboard.

---

## 13. SUMMARY: MLP FEATURE MATRIX (Updated)

| App | P0 Features (Ship Now) | P1 Features (v1.1) | Ignored |
|-----|----------------------|-------------------|---------|
| **Cross-Cutting** | Unified Search, **System Health**, **Access Governance** | Bulk Actions, Multi-Context, Selection Persistence, Conditional Routing, **Onboarding Activation**, **Data Consolidation** | — |
| **CINQ** | Contacts, Deals, Pipeline, Activities, Import/Export, Search, Email Tracking, Custom Fields | Tasks, Multi-Context | AI Features |
| **DIAL** | Channels, Messages, Threads, Mentions, Files, Search | Presence, Focus Mode | Huddles, Apps |
| **PIVOT** | Docs, Databases, Search, Relations | Templates, Checklists, Version History, Bulk Actions | AI Features |
| **SPARK** | Triggers, Actions, Conditions, Native Execution | Webhooks, Scheduling, Conditional Routing | 9,000+ Integrations |
| **TEMPO** | Links, Calendar Sync, Event Types, Availability, Reminders, **Ultra-Simple UX** | No-Show, CRM Integration | ChatGPT |
| **SOND** | Builder, Question Types, Logic, Submissions, Export, **Conversational Mode** | Branding, Notifications, Conditional Routing | AI Features |
| **VAULT** | Products, Variants, Stock, Movements, Alerts, Search, **Shopify Sync** | Multi-Warehouse, Reservations, Bulk Actions, **Amazon Sync** | AI Forecasting |
| **PAUSE** | Employees, Leave, Approvals, Search | Documents, Directory, Bulk Actions | Payroll |
| **AEGIS** | SSO, MFA, Users, JWT, Search, **Permission Matrix**, **Unified Audit Log** | API Keys, RBAC | SCIM |
| **VISTA** | Dashboards, Charts, Filters, Real-time KPIs, Search, **System Health Dashboard**, **Chart Drill-Down** | Export, Custom SQL, **Cross-App Dashboards** | AI Features |

---

## 14. BUILD ORDER RECOMMENDATION (Updated)

With the new P0 features integrated:

| Week | Apps | Rationale |
|------|------|-----------|
| **Week 1** | AEGIS + CINQ | Foundation + Revenue path + Unified Search + **Access Governance (matrix + audit log)** |
| **Week 2** | DIAL + PIVOT | Engagement + Collaboration + **System Health widget (observability)** |
| **Week 3** | SPARK + TEMPO + SOND | Automation + Productivity + Conditional Routing + **Workflow health monitoring** + **TEMPO ultra-simple UX** + **SOND conversational mode** |
| **Week 4** | VAULT + PAUSE + VISTA | Complements + **System Health Dashboard (full UI)** + Cross-App Dashboards + **VAULT Shopify Sync** + **VISTA chart drill-down** |
| **v1.1** | — | Multi-Context, Selection Persistence, Validation Workflows, Onboarding Activation, Amazon Sync |

---

## 15. THE ATAQU DIFFERENTIATOR (Why We Win — Updated)

| Competitor | Their MoaT | Our Counter-Strategy |
|------------|------------|---------------------|
| **HubSpot** | AI + Ecosystem | Price ($49/mo vs $1,200/mo) + No lock-in + Native integration + Unified Search + **Access Governance** |
| **Slack** | Ubiquity | No per-user fees + Unified chat/support + Conversation Export + **Audit Log** |
| **Notion** | Flexibility | Sub-15ms search + Native relations + Bulk Actions |
| **Zapier** | 9,000+ apps | No task limits + <1s execution + Conditional Routing + **System Health (no silent failures)** |
| **Calendly** | Simplicity | No per-user fees + Native CRM activity + Timely no-show + **Ultra-simple UX (3-click booking)** |
| **Typeform** | UX | No response limits + Native CRM lead creation + Conditional Routing + **Conversational Mode** |
| **Cin7** | Depth | No AI bloat + Native CRM order integration + Bulk Actions + **Shopify Sync** |
| **Personio** | Compliance | No payroll complexity + Native AEGIS deprovisioning |
| **Okta** | Enterprise | No per-user fees + Built into the OS + Unified Search + **Permission Matrix + Audit Log** |
| **Tableau** | Visual power | No ETL + Native real-time data + Unified Search + **Cross-App Dashboards** + **Chart Drill-Down** |

---

**Document prepared for Ataqu Architecture Team. Version 2.9 is ready for AI agent implementation.**
