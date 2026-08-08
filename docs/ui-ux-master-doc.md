# 🎨 ATAQU UI/UX MASTER DOCUMENT — Version 12.0 (Phase 1)

**Version:** 12.0
**Date:** 2026-08-08
**Status:** Updated with MLP Competitive Drivers (Conversational Mode, Shopify Sync, Chart Drill‑Down, Ultra‑Simple Booking UX)

---

## The Definitive Blueprint, Research Synthesis, & Complete Feature Map for the "Calm Predator" Interface

> **Executive Note:** *Synthesized via the BMAD Creative Intelligence Suite, hardened with the UX Researcher skill, and integrated with `onboardjs`. Version 12.0 achieves 100% parity with the Phase 1 Feature Spec (v2.9) and incorporates four high‑value MLP features based on competitor love‑driver analysis: **Conversational Form Mode** (SOND), **Chart Drill‑Down** (VISTA), **Shopify Sync** (VAULT), and **Ultra‑Simple Booking UX** (TEMPO). Ataqu's UI is the physical manifestation of our "Calm Predator" ethos: dark, glassmorphic, ruthlessly fast, mathematically precise, and silently powerful. If a design decision, research insight, or user flow is not in this document, it is out of scope.*

---

## 1. UX RESEARCH SYNTHESIS & AFFINITY DIAGRAM

Before defining the interface, we must anchor it to the psychological reality of our buyers. The following affinity diagram synthesizes research on SMB decision-makers (Alex, CEO; Sam, CTO; Jordan, Ops) suffering from SaaS bloat.

### 1.1 Affinity Clusters (The User's Reality)

**Cluster A: Financial Trauma & Distrust**
- *Quotes/Observations:* "HubSpot hidden fees", "Slack 30% hike", "Zapier task limits penalize success".
- *UX Implication:* Pricing must be globally visible. Cancellation must be a 1-click button, not a hidden support ticket. No dark patterns.

**Cluster B: Integration Debt & Brittle Workflows**
- *Quotes/Observations:* "Zapier breaks when APIs change", "Data lives in 5 different silos", "Context switching eats 2 hours a day".
- *UX Implication:* Native integrations must be 1-click toggles. The UI must visually prove data is flowing between apps without configuration.

**Cluster C: Cognitive Overload & Bloat Fatigue**
- *Quotes/Observations:* "Notion takes too long to set up", "Too many features we never use", "Support bots are useless".
- *UX Implication:* High-density but strictly scoped UI. Zero bloat. Human support accessible directly in the UI.

**Cluster D: Operational Invisibility & Silent Failures (NEW)**
- *Quotes/Observations:* "Every dollar that comes in has a support ticket attached to it on the way out", "Zapier silently drops leads", "The bots break at month two".
- *UX Implication:* The UI must make system health visible. Users should see workflow status, outbox health, and DLQ depth without digging through logs.

**Cluster E: Governance Chaos & Permission Fragmentation (NEW)**
- *Quotes/Observations:* "Searching five tools to find one answer is the actual daily pain… how do you deal with permissions across sources?", "What stops permissions from becoming invisible once the ecosystem reaches 50 tools?"
- *UX Implication:* A single permission matrix and unified audit log must be front-and-center in the administration UI.

**Cluster F: Silent Churn & Onboarding Abandonment (NEW)**
- *Quotes/Observations:* "Great product, customers complete onboarding… but six months later too many quietly disappear."
- *UX Implication:* Onboarding must be progressive, tracked, and proactively intervened upon. Inactivity alerts and achievement milestones keep users engaged.

**Cluster G: Data Consolidation Hell (NEW)**
- *Quotes/Observations:* "Spend weeks manually consolidating data from multiple sources before they can begin meaningful analysis. That's the real bottleneck—not the insights, but the setup time."
- *UX Implication:* Cross-app dashboards and a "Combine Data" feature must eliminate manual copy-paste.

### 1.2 Design Recommendations (Based on Research)

1. **The "Escape Hatch" UI Pattern:** Users stay because they can leave. The UI must constantly reinforce data portability.
2. **The "Silent Speed" Pattern:** Users doubt cheap software. The UI must feel subconsciously expensive via 150ms optimistic updates and glassmorphic depth.
3. **The "Context Preservation" Pattern:** Users hate context switching. The Unified Shell and Command Palette must make 10 apps feel like 1.
4. **The "Action-First" Pattern:** Users hate hand-holding. Onboarding (`onboardjs`) must be contextual micro-tours that guide actions, not passive feature showcases.
5. **The "Observability-First" Pattern (NEW):** Users fear silent failures. The UI must expose system health (outbox lag, workflow status, DLQ depth) in a permanent, glanceable location.
6. **The "Governance-First" Pattern (NEW):** Users fear losing control. The UI must provide a single, cross-app permission matrix and audit log accessible from the Shell.
7. **The "Progressive Activation" Pattern (NEW):** Users fear wasting time. The UI must track onboarding progress, celebrate milestones, and intervene before silence.

---

## 2. JOURNEY MAP: THE DECOMMISSION FLOW

This is the primary user journey. Ataqu is not just a tool; it is a rescue mission. The UX must guide the user from SaaS hostage to liberated operator.

| Phase | User Goal | Emotional State | Touchpoints / UI Flows | UX Opportunities & Solutions |
|--------|-----------|-----------------|------------------------|------------------------------|
| **1. Trigger** | Realize they are overpaying | Frustrated, Cynical | Hacker News, Kill Sheet SEO page, Ataqu Landing Page | **Kill Sheet UI:** Ruthless, math-heavy comparison tables. No marketing fluff. Direct CTA: "Start Rescue Mission". |
| **2. Wedge Entry** | Prove it works fast | Skeptical, Impatient | AEGIS SSO (`/login`), App Selection | **1-Question Onboarding:** "What are you escaping?" Pre-configures the workspace instantly. Zero email verification loops. |
| **3. Migration** | Move data safely | Anxious, Fearful of data loss | CINQ `/import`, DIAL JSON import | **Live CSV Diff:** Drag-and-drop dropzone. UI shows exactly how HubSpot columns map to Ataqu columns before committing. |
| **4. Aha! Moment** | See native integration | Surprised, Relieved | CINQ `/deals` → DIAL `/channels` | **1-Click Native Toggle:** "When this deal is won, create a DIAL channel? [Toggle]". No OAuth. No Zapier. Instant execution. |
| **5. Decommission** | Cancel competitor | Liberated, Empowered | Global OS `/audit` dashboard | **Stack Audit Dashboard:** Check off "Slack". Progress bar shows $X saved/mo. Direct links to competitor cancellation pages. |
| **6. Governance** | Control access across the OS | Confident, Secure | AEGIS `/admin/access-matrix`, `/admin/audit` | **Permission Matrix:** See all users, all apps, all roles in one table. **Unified Audit Log:** Searchable, exportable history of all actions. |
| **7. Operational Confidence** | Ensure workflows are healthy | Reassured, Trusting | Global Health Widget, VISTA `/health` dashboard | **System Health Dashboard:** Outbox lag, workflow failures, DLQ depth. Proactive alerts before customers complain. |
| **8. Offboarding** | Leave Ataqu (if desired) | Respected, Loyal | Settings → Cancel & Export | **1-Click Escape Hatch:** Generates ZIP of CSV/JSON instantly. Cancels subscription. No guilt trips. Plain text box: "Tell us what sucked." |

---

## 3. USABILITY TEST PLAN & SUCCESS METRICS

To ensure the UI delivers on the "Calm Predator" promise, we validate against strict usability heuristics.

### 3.1 Key Metrics
- **Time-to-First-Value (TTFV):** Must be < 3 minutes from SSO click to first entity created.
- **Time-to-First-Native-Integration (TTFNI):** Must be < 24 hours.
- **Error Recovery Rate:** 100% of transient backend errors must be handled by Optimistic UI rollback without crashing the SPA.
- **Perceived Latency:** 95% of user interactions must feel instantaneous (< 150ms) via optimistic updates.
- **System Health Visibility:** 100% of users must be able to see the System Health Widget and understand their workflow status within 5 seconds of looking at the Shell.
- **Permission Matrix Usability:** Admins must be able to find and modify a user's role across all apps in under 30 seconds.

### 3.2 Usability Test Scenarios
1. **The Import Test:** Give user a messy HubSpot CSV. Task: Import 500 contacts into CINQ. *Pass criteria: User maps columns without help, sees progress bar, handles DLQ errors inline.*
2. **The Automation Test:** Task: Create a SPARK workflow that sends a DIAL message when a CINQ deal is won. *Pass criteria: User uses Command Palette to find SPARK, drags nodes on canvas, toggles native integration without reading docs.*
3. **The Governance Test:** Task: As an admin, find all users who have "Editor" access to CINQ and change one to "Viewer." *Pass criteria: User navigates to the Permission Matrix, finds the user, changes role, sees the update reflected immediately.*
4. **The Health Test:** Task: A SPARK workflow fails. The user notices via the Health Widget, clicks to the Health Dashboard, sees the DLQ entry, and replays it. *Pass criteria: User completes all actions without contacting support.*

---

## 4. GLOBAL UX ARCHITECTURE & THE UNIFIED SHELL

### 4.1 The "Calm Predator" Aesthetic
We reject the "playful" SaaS aesthetic. We use glassmorphism purposefully—to create depth and separation without heavy borders, mimicking the sleek, instrument-panel feel of a high-performance vehicle. Dark mode native, high-density data, zero-bloat.

### 4.2 The Unified Shell (Independent SPAs + Shared UI Kit)
The 10 apps live on subdomains (`crm.ataqu.com`, `chat.ataqu.com`) as strictly independent Vite SPAs. The "Unified OS" feel is achieved through a shared npm package (`@ataqu/ui-kit`).

- **The Shell:** A persistent, glassmorphic left sidebar displaying the 10 distinct App Icons. Hovering reveals the app name. Clicking an icon navigates to the corresponding subdomain.
- **Seamless Transitions:** To prevent the "flash of white" during subdomain jumps, all SPAs share the exact same Deep Night Blue background (`#0A1628`) and shell layout. The View Transitions API is used for morphing transitions where supported.

### 4.3 The Header (NEW — Centralized Trust & Status)
The Shell header now includes a **Status Bar** with three persistent elements:

1. **System Health Widget** (Left-aligned, next to the app name):
   - A small indicator (dot) with text: `All systems nominal` (green), `1 workflow failed` (amber), or `Outbox lag: 2s` (red).
   - Clicking opens the full System Health Dashboard in VISTA.
   - **Design:** Glassmorphic pill background. Green/amber/red dot pulses subtly every 2 seconds when healthy. Amber/red states use a slow breathing animation (not flashing).

2. **Element Counter** (Center-aligned):
   - Glassmorphic pill showing: `100/100 elements used`
   - At 90%, turns amber. At 100%, turns red.
   - Clicking opens the upgrade modal (1-click to Starter/Pro/Suite).

3. **Setup Progress Tracker** (Right-aligned, next to user avatar):
   - Glassmorphic pill showing: `Setup: 60% (3/5)`
   - Clicking opens a dropdown modal showing the 5 tasks with checkmarks.
   - Hovering shows tooltip: *"Complete these to unlock the full OS."*
   - **Design:** Progress bar inside the pill (small, 2px height). Green when > 50%, amber when < 50%.

4. **Changelog Bell** (Right-aligned, next to Setup Progress):
   - Bell icon with a red dot if there are unread changelog entries since the user's last visit.
   - Clicking opens a glassmorphic modal: *"What's new this week"* with the last 3-5 entries.

5. **User Avatar** (Far right):
   - Clicking opens a dropdown with: Settings, Billing, Stack Audit (`/audit`), Logout.

### 4.4 The Command Palette (`⌘ K` / `Ctrl+K`)

- **Scope & Architecture:** Because Ataqu uses independent SPAs, the Command Palette handles two distinct scopes:
  1. *Current App Context:* Live fuzzy-search of the current subdomain's data (e.g., in CINQ, it searches deals/contacts).
  2. *Global Navigation:* Hardcoded "Quick Switch" links to the other 9 subdomains. This respects the independent SPA boundary while maintaining the OS feel without requiring a unified backend search endpoint.
- **UI:** A global, Spotlight-like glassmorphic search bar accessible from anywhere.
- **Placeholder Text:** *"Search across CRM, Chat, Inventory, Docs..."* (not just "Search").

### 4.5 The `onboardjs` Strategy (Action-Oriented Micro-Tours)

We do not use multi-step "product tours" that block the UI and read like a manual. We use `onboardjs` to trigger contextual, 3-step micro-tours on first visit to a critical view.
- **Styling:** `onboardjs` tooltips must use Glassmorphic Level 2 styling (`background: rgba(10, 22, 40, 0.9); backdrop-filter: blur(12px)`). Focus rings must be Amber/Orange.
- **Interaction:** Tours are strictly opt-in. A "Skip Tour" button is always visible. Tours advance when the user completes the action (e.g., clicking the button), not just by clicking "Next".
- **Accessibility:** Tooltips must trap focus and return it to the triggering element upon dismissal.

### 4.6 Free Tier UI (The Conversion Engine)

The free tier is not hidden — it's a feature.

- **Element counter:** Glassmorphic pill in the header: `100/100 elements used`
- **Upgrade prompt:** When you hit 90%, a subtle toast appears: "You're approaching your free tier limit. Upgrade to Starter ($15/mo) for 1,000 elements."
- **Blocking behavior:** At 100 elements, creation is blocked, but reads and existing integrations continue working. No data loss.
- **Upgrade flow:** 1-click from the counter. No support ticket. No sales call.

**Empty State Copy:**
- *"You've used 100/100 elements on the Free tier. Upgrade to Starter to keep building."*

### 4.7 Global Interaction Rules
- **The 150ms Rule & Zero Spinners:** All interactions must feel instantaneous. Optimistic UI is mandatory. Skeleton loaders for initial loads.
- **Stale-While-Revalidate:** TanStack Query serves cached data instantly while fetching updates.
- **Routing & State:** URL reflects state (filters, tabs, pagination) via `nuqs`. Use `<a>`/`<Link>` for navigation, `<button>` for actions.
- **Idempotency:** All POST/PUT/DELETE requests must send an `Idempotency-Key` header (UUIDv4) via a central Axios/fetch wrapper.

---

## 5. GLOBAL INTERACTION PATTERNS & RESILIENCE

### 5.1 System Feedback, Error States & Empty States
Ataqu does not use generic "Something went wrong" errors. The UI must be ruthlessly specific, aligning with the "Calm Predator" ethos. No celebratory micro-copy ("Awesome! Task created"). Just "Task created."

- **Advisory Lock Timeouts (503 Retry-After):** If a request hits an idempotency lock timeout, the UI must display a subtle, non-blocking toast: `"Processing conflict. Retrying in 5s…"`
- **DLQ (Dead Letter Queue) UI:** For batch operations (like CSV imports), if rows fail data validation, they must be highlighted inline with a red border. A dedicated button appears: `"Download Failed Rows (CSV)"`. No full-screen error states.
- **Standardized Empty States:** Every empty state is a micro-onboarding session and a competitive attack.
  - *CINQ:* "No revenue tracked yet. Drop your HubSpot CSV here, or create your first deal."
  - *SPARK:* "You have 0 automations. Zapier would charge you $30/mo for this. Turn on your first native trigger."
  - *Health Dashboard:* "No failed workflows in the last 7 days. All systems nominal."

### 5.2 Visualizing Native Integrations (The "OS" Feel)
Ataqu's core differentiator is native data flow. The UI must visually prove data is flowing between apps without Zapier.

- **The "Context Chip":** If a DIAL channel was created by a CINQ deal won, the DIAL channel header must display a subtle CINQ app icon next to the channel name. Hovering reveals a glassmorphic tooltip: `"Created by Acme Corp Deal Won via Outbox"`.
- **The "Outbox Success" Indicator:** When a user toggles a native integration (e.g., SPARK workflow), the UI must show a 150ms green pulse on the toggle. No spinners. The user implicitly understands the event was registered to the `core.outbox` table.

### 5.3 Real-time Connection Resilience (WebSocket & SSE UX)
The "Calm Predator" handles network drops silently and gracefully, without jarring red banners or full-screen disconnect overlays.

- **WebSocket Drops (DIAL):** If the WebSocket connection drops, DIAL displays a subtle, gray "Reconnecting…" pill next to the channel name. Messages typed during this state are queued locally (optimistic UI) and sent silently upon reconnection. The UI never blocks the input.
- **SSE Drops (VISTA):** If the SSE stream drops, VISTA silently falls back to 5-second TanStack Query polling in the background. The UI does not change. When SSE reconnects, polling ceases.

### 5.4 Animation Guidelines
- **Easing**: `ease-out` for entering, `ease-in` for leaving. Never `linear`.
- **Duration**: 150ms for micro-interactions. 250ms for modals/page transitions.
- **Properties**: Animate `transform` and `opacity` only (compositor-friendly). Never animate `width`, `height`, `top`, `left`. Explicitly list transition properties—never use `transition: all`.
- **Accessibility**: Animations must honor `prefers-reduced-motion`.

### 5.5 Sound Design
Ataqu is silent. No notification dings, no swooshes. The only visual cue for a new message is a subtle badge update.

---

## 6. VISUAL IDENTITY SYSTEM & TYPOGRAPHY

### 6.1 Color Palette & Theming
| Color | Hex Code | Usage |
|-------|----------|-------|
| **Deep Night Blue** | `#0A1628` | Primary background (trust, power, seriousness) |
| **Amber/Orange** | `#F59E0B` | Secondary, CTAs, active states, focus rings (2px thickness) |
| **Emerald Green** | `#10B981` | Success states, System Health "All nominal", positive trends |
| **Crimson Red** | `#EF4444` | Error states, System Health "Outage", destructive actions |
| **Light Gray** | `#F3F4F6` | Neutral backgrounds (readability) |
| **White** | `#FFFFFF` | Text on dark backgrounds |
| **Black** | `#000000` | Primary text on light backgrounds |

- **Dark Mode Native:** Set `color-scheme: dark` on `<html>` to fix native scrollbars and inputs. `<meta name="theme-color">` must match the page background.
- **Native Controls:** `<select>` elements must have explicit `background-color` and `color` to prevent Windows dark mode rendering issues.

### 6.2 Typography Rules
- **Headings**: Unbounded (using `clamp()` for fluid scaling: e.g., `clamp(2rem, 5vw, 3.5rem)`). Fallback: `system-ui`.
- **Body**: Inter (16px regular, 14px small). Fallback: `system-ui`.
- **Measurements:** Use `font-variant-numeric: tabular-nums` for all number columns, tables, and financial comparisons.
- **Layout:** Apply `text-wrap: balance` or `text-pretty` on headings to prevent widows.
- **Spacing:** Use non-breaking spaces for measurements and commands: `10&nbsp;MB`, `⌘&nbsp;K`, `Ataqu`. Brand names, code tokens, and identifiers must use `translate="no"`.
- **Bans:** No gradient text. Tracking stops at -0.04em. No system display face (Impact, Arial Black) as the display voice. No discrete breakpoint typography (use fluid `clamp()`).

### 6.3 Grid, Spacing & Depth (The Glassmorphism System)
- **8px Base Grid**: All spacing, margins, and padding must be multiples of 8 (8, 16, 24, 32, 48, 64). This creates mathematical rhythm.
- **Container Queries:** Components must respond to their container size rather than the viewport. Use `@container` queries for modular components instead of `@media` queries.
- **Level 0 (Flat)**: Backgrounds, base text.
- **Level 1 (App Icons)**: 24x24px bespoke, minimalist icons representing each of the 10 apps. Crisp SVGs, single stroke weight, `aria-hidden="true"` when decorative.
- **Level 2 (Glassmorphic Surfaces)**: Used for the Unified Shell, Command Palette, `onboardjs` tooltips, Health Widget, Setup Progress, and floating modals.
- **Level 3 (Popover/Modals)**: Strict, sharp shadow below the glass surface. `box-shadow: 0 4px 12px rgba(0,0,0,0.4);` Max blur 12px.
- **Z-Axis Management:** Strict z-index scale (e.g., `0` base, `10` dropdowns, `20` drawers, `30` modals, `40` toasts, `50` onboardjs overlays).

### 6.4 Glassmorphism Math & Accessibility Limits
Glassmorphism is notorious for destroying text contrast, especially when background data scrolls behind it. To ensure WCAG 2.2 AA compliance (≥ 4.5:1 contrast), all glassmorphic surfaces containing text MUST use an explicit, dark base overlay. Never place text directly over a raw `backdrop-filter` blur where the background is unpredictable.

**The "Ataqu Glass" Utility Class:**
```css
.ataqu-glass {
  background: rgba(10, 22, 40, 0.75); /* Deep Night Blue at 75% opacity */
  backdrop-filter: blur(12px) saturate(180%);
  -webkit-backdrop-filter: blur(12px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #FFFFFF; /* Ensures strict contrast */
}
```
*Rule:* If the component requires a lighter feel (e.g., a hover state), increase the `blur()` radius, do not lower the `0.75` background opacity.

---

## 7. RESPONSIVE & MOBILE STRATEGY

Ataqu is a high-density data OS. We do not force complex grids onto mobile screens. We ruthlessly optimize for the primary use case of each app.

### 7.1 App Categorization
- **Mobile-First (Fully Responsive):** AEGIS, DIAL, TEMPO, PAUSE, SOND.
  - *Strategy:* These apps handle communication, scheduling, and quick approvals. They must be fully functional on mobile.
- **Desktop-Optimized (Adaptive Fallbacks):** CINQ, PIVOT, VISTA, SPARK, VAULT.
  - *Strategy:* These apps rely on high-density data grids, complex visual canvases, or multi-pane layouts. On mobile, they do not render their desktop layouts.

### 7.2 Mobile Fallback Patterns (Desktop-Optimized Apps)
- **CINQ & VAULT:** Instead of a 1000-row TanStack Table, mobile users see a Master-Detail list (Card view). Filters are accessible via a bottom-sheet modal.
- **VISTA & SPARK:** Complex dashboards and React Flow canvases are unusable on mobile. On screens < 768px, these apps display a glassmorphic full-screen modal: `"Optimized for desktop. View read-only summary?"` which renders a stacked list of KPIs or workflow statuses.
- **PIVOT:** Doc editor is responsive. Database view falls back to the Master-Detail list.

### 7.3 Header Responsiveness
- **Desktop (≥ 1024px):** Full header with Health Widget, Element Counter, Setup Progress, Changelog Bell, and User Avatar.
- **Tablet (768–1024px):** Health Widget becomes an icon-only dot. Setup Progress shows percentage only (text hidden). Element Counter remains full.
- **Mobile (< 768px):** Health Widget collapses to a small dot in the top-left corner. Element Counter and Setup Progress are hidden behind a "Status" button in the header. Changelog Bell remains.

---

## 8. APP-SPECIFIC ROUTES, USER FLOWS, & ONBOARDING (100% Feature Spec Parity)

### 8.1 The Global OS Dashboard (Stack Audit)
**Purpose:** The decommission engine. A persistent route accessible from the Unified Shell that tracks competitor cancellations and savings.

**Routes:**
- `/audit` (Global Stack Audit Dashboard)

**Primary User Flows:**
1. **The Decommission Flow:** User navigates to `/audit`. UI displays a glassmorphic card grid of competitor logos (Slack, HubSpot, Notion, etc.).
2. User clicks "Mark as Canceled" on the Slack card.
3. *UI:* A 1-second subtle green pulse fires. The card dims.
4. *KPI Update:* The "Total Monthly Savings" KPI at the top of the page animates instantly (using `tabular-nums` for smooth number interpolation) – the amount depends on the user's plan: Starter saves ~$15/mo per canceled tool, Pro saves more, Suite maximizes savings.
5. A toast appears: `"Decommissioned: Slack. Here is your next target: HubSpot."`

---

### 8.2 AEGIS (SSO & Security) — UPDATED with Permission Matrix & Audit Log

**Purpose:** Identity, access control, and tenant management. The foundation of the OS.

**Routes:**
- `/login` (SSO + Email/Password fallback)
- `/mfa-setup` (TOTP QR code)
- `/admin/users` (User management table)
- `/admin/roles` (RBAC: Admin, Member, Viewer, Custom)
- `/admin/api-keys` (Developer API keys)
- **🆕 `/admin/access-matrix`** (Permission Matrix — cross-app role visibility)
- **🆕 `/admin/audit`** (Unified Audit Log)

**Primary User Flows:**

1. **SSO Login Flow:** User clicks "Continue with Google" → OIDC redirect → JWT stored in Zustand → redirect to last active app instantly.
2. **User Invitation Flow:** Admin clicks "Invite User" → Modal opens → `POST /api/v1/users` → Row appears instantly with "Pending" status.
3. **RBAC Creation Flow:** Admin navigates to `/admin/roles` → Clicks "Create Role" → Modifies permission matrix (e.g., "Can view VISTA, cannot edit CINQ") → Saves.

**🆕 4. Permission Matrix Flow:**
- Admin navigates to `/admin/access-matrix`.
- UI displays a high-density TanStack Table: rows = users, columns = apps (CINQ, DIAL, PIVOT, etc.), cells = role (Admin/Edit/View/None).
- Inline dropdowns in each cell allow role changes.
- **Optimistic UI:** Role changes instantly, reverts on error with toast.
- **Search/Filter:** Filter by user name, app, or role.
- **Export:** Download the matrix as CSV.
- **Empty State:** "No users yet. Invite your team to see the permission matrix."

**🆕 5. Unified Audit Log Flow:**
- Admin navigates to `/admin/audit`.
- UI displays a chronological list of all actions across all apps: `[User] [Action] [App] [Timestamp] [IP]`.
- **Search:** Filter by user, app, action type (login/create/update/delete/export/role-change), date range.
- **Export:** Download the audit log as CSV/JSON.
- **Real-time:** New audit events appear instantly via SSE (no page refresh).
- **Empty State:** "No audit events yet. Start using Ataqu to populate the log."

**`onboardjs` Micro-Tour (Admin UI):**
- *Trigger:* First visit to `/admin/users`.
- *Step 1:* Highlight "Invite User" button. Text: "Your team is alone here. No per-seat taxes. Invite your whole company."
- *Action:* Tour advances when user clicks the button.

---

### 8.3 CINQ (CRM)
**Purpose:** Revenue engine. Contacts, deals, pipeline tracking, tasks, and email tracking.

**Routes:**
- `/` (Dashboard: Revenue metrics)
- `/contacts` (Master contact list)
- `/contacts/:id` (Contact detail + activities timeline)
- `/deals` (Kanban pipeline view)
- `/deals/:id` (Deal detail panel)
- `/tasks` (To-do list & assignments)
- `/import` (CSV Import flow)
- `/settings/custom-fields` (JSONB field schema creator)
- `/settings/email-tracking` (DoS-isolated open/click metrics)

**Primary User Flows:**
1. **Pipeline Drag-and-Drop:** User drags "Acme Corp" from "Qualified" to "Won". Card moves instantly (Optimistic UI). If SPARK workflow exists, toast: "Onboarding sequence triggered."
2. **CSV Import:** User drops `hubspot-contacts.csv` → Client-side parses → Live mapping table displays → `POST /api/v1/contacts/batch` → Progress bar fills (blurred data). DLQ failures highlighted in red inline with a "Download Failed Rows" button.
3. **Custom Field Creation:** Admin navigates to `/settings/custom-fields` → Defines new field (e.g., "Shirt Size", Type: Choice) → Form UI instantly updates across CINQ to include the new JSONB-backed field.
4. **Email Tracking View:** User navigates to `/settings/email-tracking` → UI displays a high-density grid of sent emails with "Opened" and "Clicked" timestamps. Backend isolates tracking pixels via bounded channel, but UI displays data natively.

**`onboardjs` Micro-Tour (Pipeline):**
- *Trigger:* First visit to `/deals`.
- *Step 1:* Highlight the Kanban board. Text: "This is your revenue engine. No 3-year lock-in, just deals."
- *Step 2:* Highlight a deal card. Text: "Drag this to 'Won' to trigger native automations across the OS."
- *Action:* Tour completes when user successfully drags a card.

---

### 8.4 DIAL (Chat & Support)
**Purpose:** Unified internal team chat and external customer support.

**Routes:**
- `/` (Channel list + Thread view)
- `/channels/:id` (Specific channel)
- `/threads/:id` (Side thread)
- `/tickets` (Support inbox)
- `/tickets/:id` (Support ticket thread)
- `/files` (Centralized file/media gallery)
- `/settings/notifications` (Focus mode & mention preferences)

**Primary User Flows:**
1. **Instant Messaging:** User types message → hits Enter → message appears instantly with "Sending..." indicator → WebSocket echo changes to checkmark.
2. **Unified Support Ticket:** Agent opens ticket → Right Context Sidebar auto-queries CINQ → displays "Customer: Acme Corp. Deal Value: $50k." via the Context Chip.
3. **Focus Mode Toggle:** User navigates to `/settings/notifications` → Toggles "Focus Mode" → UI instantly mutes all non-mention badges across the app.

**`onboardjs` Micro-Tour (Unified Inbox):**
- *Trigger:* First visit to `/tickets`.
- *Step 1:* Highlight the Context Sidebar. Text: "Support isn't an island. Customer data from CINQ lives right here."
- *Step 2:* Highlight the reply box. Text: "Reply instantly. No Zapier required."

---

### 8.5 PIVOT (Docs & Databases)
**Purpose:** High-density operational databases and docs.

**Routes:**
- `/` (Workspace tree sidebar)
- `/doc/:id` (Markdown doc editor)
- `/doc/:id/history` (Version history modal/view)
- `/db/:id` (Database table view)
- `/templates` (Gallery of workspace templates)

**Primary User Flows:**
1. **Doc Autosave:** User types in BlockNote editor → Debounced autosave (500ms) → Header flashes "Saving…" → "Saved".
2. **Relational Database:** User clicks "Linked Deal" cell → Command Palette opens filtered to CINQ deals → selects deal → link saved instantly.
3. **Version Restoration:** User navigates to `/doc/:id/history` → Selects a previous timestamp → UI displays diff view → Clicks "Restore".

**`onboardjs` Micro-Tour (Database View):**
- *Trigger:* First visit to `/db/:id`.
- *Step 1:* Highlight the "New Row" button. Text: "High-density data. No 5-second load times."
- *Step 2:* Highlight a relational column. Text: "Link natively to CINQ deals. No API keys required."

---

### 8.6 SPARK (Automation) — UPDATED with Health Monitoring

**Purpose:** Native event-driven automation replacing Zapier.

**Routes:**
- `/` (Workflow list)
- `/workflows/:id` (Visual canvas editor)
- `/workflows/:id/settings` (Webhooks, scheduling, error handling config)
- `/runs` (Execution history)
- `/runs/:id` (Detailed execution view: payload & DLQ status)

**🆕 Templates Section:**
SPARK's homepage shows two sections:
1. **Templates essentials** (pre-installed): The 6 native integrations as ready-to-use workflows
2. **My workflows**: User-created workflows

Each template has:
- A toggle: active/inactive
- A "Duplicate" button: copies the template to "My workflows" for customization
- A "View" button: opens the workflow in the canvas

**This is the only interface for native integrations.** No separate "toggles" in CINQ/DIAL/VAULT. Everything lives in SPARK.

**🆕 Health Status Column:**
In the workflow list, each workflow has a status column showing:
- `✅ Success` (green) + timestamp of last run
- `❌ Failed` (red) + error count
- `⏳ Pending` (amber) + time since last attempt
- Clicking the status opens the Health Dashboard filtered to that workflow.

**Primary User Flows:**
1. **Workflow Creation:** User drags "Trigger: CINQ Deal Won" → drags "Action: Create DIAL Channel" → connects them → saves.
2. **Test Run:** User clicks "Test Run" → Execution path lights up green in <1s → Toast: "Test successful."
3. **DLQ Recovery:** User navigates to `/runs/:id` → View shows failed execution and payload → User clicks "Replay Event" after fixing the underlying issue.

**`onboardjs` Micro-Tour (Canvas):**
- *Trigger:* First visit to `/workflows/new`.
- *Step 1:* Highlight the left sidebar (Triggers). Text: "Zapier charges per task. We charge $0. Pick a trigger."
- *Step 2:* Highlight the canvas. Text: "Drag it here. Connect it to an action. You're done."

---

### 8.7 TEMPO (Scheduling) — UPDATED with Ultra‑Simple Booking UX

**Purpose:** Calendar sync, booking links, no‑show detection.

**Routes:**
- `/` (Dashboard: Upcoming meetings)
- `/event-types` (Configuration)
- `/event-types/:id/customization` (Custom invitation/reminder email templates)
- `/book/:slug` (Public booking page)
- `/meetings/:id` (Meeting detail + no‑show status)
- `/settings/calendars` (OAuth integration for Google/Outlook)

**Primary User Flows:**
1. **Public Booking:** Prospect clicks 30‑min slot → Form appears → clicks "Book" → Slot turns gray instantly (Optimistic UI).
2. **No‑Show Detection:** Meeting time passes → if no WebSocket `MeetingJoined` event, `no_show_worker` triggers → UI updates status to "No‑Show" with red badge.
3. **Calendar Sync Setup:** User navigates to `/settings/calendars` → Clicks "Connect Google" → OAuth flow → Calendars sync bidirectionally.

**🆕 8.7.5 Ultra‑Simple Booking UX (P0)**

**The Problem:** Calendly users love its *radical simplicity*. The booking page should be so simple that anyone can book in under 30 seconds without reading instructions.

**The Solution:** Redesign the public booking page (`/book/:slug`) to be a 3‑screen maximum flow.

**Screen 1: Event Type Selection (if multiple event types exist)**
- Clean, card‑based layout showing each event type with:
  - Event name (bold, large)
  - Duration badge (e.g., "30 min")
  - Brief description (1 line)
  - Primary CTA: "Select"
- If only one event type exists → skip this screen entirely.

**Screen 2: Time Slot Picker**
- Calendar grid showing the next 30 days.
- Available slots highlighted in amber (`bg-primary/20` on hover, `bg-primary` when selected).
- Timezone selector: auto‑detected via `Intl.DateTimeFormat`, but user can change via dropdown.
- "Show more dates" button at the bottom.
- Once a slot is selected → button appears: "Continue to details".

**Screen 3: Guest Details + Confirmation**
- Simple form: Name (required), Email (required).
- Optional fields (company, phone) are **hidden** behind a "Show more" link.
- "Book" button (primary CTA).
- On success: confirmation screen with meeting details + "Add to Calendar" button.
- On failure: inline error message (e.g., "This slot is no longer available. Please select another.")

**Design Rules:**
- **No configuration visible to the invitee.** Buffers, custom questions, and advanced settings are hidden.
- **Mobile‑first:** All screens must be fully functional on a 375px screen.
- **3‑clicks max:** Select event → Select time → Enter name/email → Book.
- **Glassmorphic styling:** Use `.ataqu-glass` for the container.
- **Loading:** Skeleton loader while slots load. **No spinners.**

**`onboardjs` Micro‑Tour (Event Types):**
- *Trigger:* First visit to `/event-types`.
- *Step 1:* Highlight "New Event Type". Text: "Calendly charges per user. We include this. Create a link."
- *Step 2:* Highlight the "No‑Show Detection" toggle. Text: "If they don't show up, we'll trigger a follow‑up automatically in 15 minutes."

---

### 8.8 SOND (Forms & Surveys) — UPDATED with Conversational Mode

**Purpose:** Data collection feeding natively into the OS.

**Routes:**
- `/` (Form list)
- `/builder/:id` (Drag‑and‑drop editor)
- `/builder/:id/style` (Branding: colors, logos, fonts)
- `/builder/:id/settings` (Notifications and outbound webhooks)
- `/submissions/:id` (Data table view)

**Primary User Flows:**
1. **Form Builder:** User drags "Choice" question → adds options → configures conditional logic in right panel → autosaves.
2. **Submission Processing:** User clicks "Export CSV" → File downloads instantly → Background outbox event fires `FormSubmittedV1` → SPARK creates CINQ lead.
3. **Webhook Config:** User navigates to `/builder/:id/settings` → Adds outbound webhook URL to push submissions to an external Make.com scenario.

**🆕 8.8.4 Conversational Mode (P0)**

**The Problem:** Typeform's conversational format (one question at a time) is beloved because it feels like a conversation, not a form. It increases completion rates by 30%+.

**The Solution:** A toggle in the form builder that switches between "Standard" (all questions on one page) and "Conversational" (one question per slide).

**Builder UI:**
- A toggle in the form settings panel: `[Standard] [Conversational]`.
- Label: *"Display mode"* with tooltip: *"Conversational mode shows one question at a time — higher completion rates."*
- Default: Standard.

**Conversational Mode Behavior:**
- The form renders one question per slide.
- Each slide contains: question text + input (or choices) + "Next" button.
- Progress bar at the top: `Question 3 of 10`.
- Smooth slide transitions: 150ms ease‑out (compositor‑friendly: `transform: translateX`).
- Conditional logic: if a question is hidden by logic, skip it silently in the count.
- Last question: "Next" button changes to "Submit".
- On submit: standard POST to `/api/v1/sond/forms/:id/submissions`.

**Validation:**
- Each question is validated when the user clicks "Next" (inline error).
- The user cannot proceed to the next question until the current one is valid.
- On error: shake animation (subtle) + red border + error message below the input.

**Confirmation Screen (after submission):**
- Shows: "Thank you! Your response has been recorded."
- Optional: redirect to a custom URL (if configured in the form settings).

**Design Rules:**
- **Mobile‑first:** Large touch targets, readable text, no side‑by‑side layout.
- **Branding:** Uses the form's configured branding (colors, logo, font).
- **Accessibility:** Focus is trapped inside the slide. Keyboard navigation works.
- **No spinners:** Use skeleton loaders during submission.

**`onboardjs` Micro‑Tour (Builder):**
- *Trigger:* First visit to `/builder/new`.
- *Step 1:* Highlight the left sidebar. Text: "Typeform taxes your success. We don't. Drag a question."
- *Step 2:* Highlight the right sidebar (Logic). Text: "Add conditional logic. When they submit, it natively creates a lead in CINQ."

---

### 8.9 VAULT (Inventory) — UPDATED with Shopify Sync

**Purpose:** Real‑time stock control, atomic updates, multi‑warehouse.

**Routes:**
- `/` (Dashboard: Low stock alerts)
- `/products` (Catalog grid)
- `/products/:id` (Product detail + variants)
- `/movements` (Audit trail)
- `/warehouses` (Manage multiple locations)
- `/reservations` (View stock reserved by CINQ deals)
- `/settings/channels` (Shopify/Amazon sync config)

**Primary User Flows:**
1. **Stock Adjustment:** User clicks "Adjust Stock" → Glassmorphic Popover opens → selects "Remove", types "10" → clicks "Save" → Number instantly animates from 150 → 140 (Optimistic UI).
2. **Stock Reservation:** User navigates to `/reservations` → UI displays a TanStack Table mapping CINQ Deal IDs to VAULT Product IDs, showing reserved quantities.

**🆕 8.9.5 Shopify Sync (P0)**

**The Problem:** Cin7 users love the ability to sync inventory with their e‑commerce store automatically. Manual stock updates cause overselling and customer complaints.

**The Solution:** A one‑click OAuth connection to Shopify that syncs products, inventory levels, and orders bi‑directionally.

**UI: Shopify Connection Settings (in VAULT → Settings → Channels)**
- **Before connection:**
  - A card: "Connect Shopify"
  - Description: "Sync your Shopify products and inventory with VAULT."
  - CTA: "Connect Shopify" button → redirects to Shopify OAuth.
- **During connection:**
  - Shopify OAuth screen (user logs in, authorizes the Ataqu app).
  - Redirects back to VAULT with `?shopify_sync=success`.
- **After connection:**
  - Status card showing:
    - Shop name
    - Connection status: `Connected` (green badge) or `Error` (red badge).
    - Last sync timestamp: `Last sync: 2 minutes ago`.
    - Product count: `1,234 products synced`.
  - Actions: "Sync now" button (manual force sync) + "Disconnect" button (with confirmation modal).
  - Error log: expandable section showing recent sync errors (max 20 entries) with "Retry" button per error.

**Sync Status in the System Health Dashboard:**
- The System Health Dashboard (2.8) shows a new component: "Shopify Sync" with status (green/yellow/red) and last sync timestamp.
- If sync fails for more than 1 hour → amber alert. More than 6 hours → red alert.

**Data Synced:**
- **Products:** Name, SKU, description, price, images (URLs only).
- **Variants:** Size, color, stock_quantity, price.
- **Orders:** Order number, items, quantities, status.
- **Inventory:** Stock levels are synchronized bi‑directionally.

**Implementation Notes:**
- OAuth flow: `GET /api/v1/vault/shopify/auth` → redirects to Shopify → callback to `GET /api/v1/vault/shopify/callback`.
- Worker: runs every 5 minutes, polls Shopify API for changes.
- Webhooks: optional webhook endpoint `/api/v1/vault/shopify/webhook` for real‑time updates.

**Error Handling:**
- If Shopify API returns an error → log to DLQ, show in error log.
- If a product fails to sync → individual error entry with product name and reason.
- If the connection is revoked → UI shows "Disconnected" with a "Reconnect" button.

**`onboardjs` Micro‑Tour (Product Detail):**
- *Trigger:* First visit to `/products/:id`.
- *Step 1:* Highlight the current stock number. Text: "Real‑time stock. Zero race conditions."
- *Step 2:* Highlight "Adjust Stock". Text: "Adjust it. The math is protected at the database level. No overselling."

---

### 8.10 PAUSE (HR)
**Purpose:** Employee directory, leave management, onboarding, and time tracking.

**Routes:**
- `/` (Dashboard: Out of office today)
- `/directory` (Employee grid)
- `/employees/:id` (Profile)
- `/employees/:id/documents` (Contracts, pay slips, centralized docs)
- `/leave` (Leave requests)
- `/onboarding` (New hire checklists)
- `/timesheets` (Time tracking with overnight logic)

**Primary User Flows:**
1. **Leave Request:** Employee clicks "Request Leave" → Modal opens → Zod validation prevents end‑date < start‑date → clicks "Submit" → Request appears in "Pending" list instantly.
2. **Manager Approval:** Manager clicks "Approve" → Row moves to "Approved" tab instantly → Outbox fires `LeaveApprovedV1` → AEGIS adjusts permissions.
3. **Document Upload:** Manager navigates to `/employees/:id/documents` → Drags PDF contract into dropzone → File uploads directly to S3 via presigned URL → Appears in document list instantly.

**`onboardjs` Micro‑Tour (Leave View):**
- *Trigger:* First visit to `/leave`.
- *Step 1:* Highlight "Request Leave". Text: "No payroll bloat. Just leave tracking."
- *Step 2:* Highlight the pending list (if manager). Text: "Approve here, and their system access updates automatically via AEGIS."

---

### 8.11 VISTA (Analytics) — UPDATED with System Health Dashboard, Cross‑App Dashboards, and Chart Drill‑Down

**Purpose:** Real‑time BI, zero ETL, native SQL, drag‑and‑drop dashboard, and operational observability.

**Routes:**
- `/` (Dashboard list)
- `/dashboards/:id` (Configurable grid - read/view mode)
- `/dashboards/:id/edit` (Visual editor mode for `react-grid-layout`)
- `/explore` (Custom SQL editor)
- **🆕 `/health`** (System Health Dashboard)

**Primary User Flows:**

1. **Real‑time Dashboard:** Initial fetch via TanStack Query → SSE hook connects to backend → CINQ deal won triggers SSE event → KPI card updates with subtle 100ms fade‑in.
2. **Custom SQL Query:** User writes SQL in Monaco editor → clicks "Run" → `SET LOCAL statement_timeout = '15s'` on backend → Results render in TanStack Table.
3. **Dashboard Editing:** User navigates to `/dashboards/:id/edit` → Drags a new "Bar Chart" widget onto the grid → Configures data source via dropdown → Clicks "Save Layout".

**🆕 4. System Health Dashboard Flow:**
- User clicks the Health Widget in the Shell (or navigates to `/health`).
- UI displays a high‑density dashboard with four key sections:
  - **Workflow Status:** List of all SPARK workflows with last run, success/failure, and DLQ depth.
  - **Outbox Health:** Lag in seconds, pending events, last dispatched event timestamp.
  - **Integration Status:** Native connectors (CINQ→DIAL, SOND→CINQ, VAULT→CINQ) with green/yellow/red indicators.
  - **Connection Pools:** Current DB connection usage (X/35), pool wait times.
- **DLQ Viewer:** Expandable section showing failed events with payload, error reason, and "Replay" / "Delete" buttons.
- **Auto‑refresh:** Polls every 10 seconds (or SSE for real‑time updates).
- **Export:** Download health report as PDF/CSV.
- **Empty State:** "No failed workflows in the last 7 days. All systems nominal."

**🆕 5. Cross‑App "Combine Data" Flow:**
- User is in any VISTA dashboard.
- Clicks the "Combine Data" button (top‑right).
- UI opens a modal: select primary data source (e.g., "CINQ Deals") and secondary data source (e.g., "VAULT Stock").
- Chart updates instantly to overlay both datasets.
- No SQL required. Powered by pre‑aggregated materialized views in PostgreSQL.
- **Export:** Download the combined view as CSV/PNG.

**🆕 6. Chart Drill‑Down (P0)**

**The Problem:** Tableau users love the interactivity of clicking on a chart to "drill down" into the underlying data. Static charts feel superficial.

**The Solution:** Click on any chart element (bar, line, pie segment) → opens a side panel (sheet/drawer) showing the raw data behind that element.

**Interaction Flow:**
1. User hovers over a chart element → subtle highlight (amber border, 2px).
2. User clicks the element → a side panel slides in from the right (350px width, `.ataqu-glass` styling).
3. The side panel shows:
   - **Title:** `"Deals in August 2026"` (or whatever dimension was clicked).
   - **Data Table:** TanStack Table with all relevant columns (e.g., Deal Name, Amount, Stage, Contact).
   - **Export:** "Export CSV" button.
   - **Close:** "X" button or click outside to close.

**Supported Chart Types:**
- **Bar Chart:** Click on a bar → shows items in that category (e.g., all deals for that month).
- **Line Chart:** Click on a data point → shows items at that timestamp.
- **Pie Chart:** Click on a segment → shows items in that segment (e.g., all deals in "Won" stage).
- **Area Chart:** Click on a data point → same as line chart.

**Data Fetching:**
- The frontend sends a `POST /api/v1/vista/drill-down` request with:
  - `dashboardId: string`
  - `widgetId: string`
  - `dimension: string` (e.g., "month", "stage", "product")
  - `value: string` (e.g., "2026-08", "Won", "Acme Corp")
  - `filters: Record<string, any>` (same filters applied to the dashboard)
- Backend returns an array of records (up to 1000 rows, paginated if more).
- The table is virtualized (`TanStack Virtual`) for performance.

**Design Rules:**
- **No modal:** Use a side panel (drawer/sheet) to avoid breaking the dashboard context.
- **Glassmorphic:** `.ataqu-glass` styling with `box-shadow: 0 4px 12px rgba(0,0,0,0.4)`.
- **Smooth animation:** 200ms slide‑in (translateX), 200ms slide‑out.
- **Loading:** Skeleton loader in the side panel while data fetches.
- **Empty state:** "No data found for this selection."

**`onboardjs` Micro‑Tour (Dashboard):**
- *Trigger:* First visit to `/dashboards/:id`.
- *Step 1:* Highlight a KPI card. Text: "No ETL pipelines. This data is live from CINQ, right now."
- *Step 2:* Highlight the "SSE" indicator. Text: "When a deal closes, this updates in milliseconds. No refresh button needed."

---

## 9. ACCESSIBILITY & FORMS (WCAG 2.2 AA Compliant)

### 9.1 Core Accessibility
- **Semantic HTML:** Use `<button>`, `<a>`, `<label>`, `<table>` before ARIA.
- **Labels:** Icon-only buttons need `aria-label`. Form controls need `<label>` (clickable, sharing a single hit target) or `aria-label`. Decorative icons need `aria-hidden="true"`.
- **Images:** Need explicit `width` and `height` (prevents CLS). Below-fold images: `loading="lazy"`. Above-fold critical: `fetchpriority="high"`.
- **Live Regions:** Async updates (toasts, validation) need `aria-live="polite"`.
- **Structure:** Headings must be hierarchical `<h1>`–`<h6>`. Include a skip link for main content. Set `scroll-margin-top` on heading anchors.
- **Focus Not Obscured (WCAG 2.2):** Elements must not be entirely hidden by sticky headers/footers when receiving focus.
- **Target Size Minimum (WCAG 2.2):** Interactive elements must have a minimum target size of 24x24 CSS pixels.
- **Glassmorphism Contrast:** Ensure text contrast on glassmorphic backgrounds remains ≥ 4.5:1. Use a subtle dark overlay behind text if the blurred background reduces legibility.

### 9.2 Focus States
- Interactive elements need visible focus: `focus-visible:ring-*` or equivalent.
- Never use `outline-none` / `outline: none` without a focus replacement.
- Use `:focus-visible` over `:focus` to avoid focus rings on mouse click.
- Group focus with `:focus-within` for compound controls.

### 9.3 Form Engineering
- **Attributes:** Inputs need `autocomplete` and meaningful `name`. Use correct `type` (`email`, `tel`, `url`, `number`) and `inputmode`. Disable spellcheck on emails, codes, usernames (`spellCheck={false}`).
- **UX:** Never block paste (`onPaste` + `preventDefault`). Placeholders must end with `…` and show an example pattern.
- **Submission:** Submit button stays enabled until the request starts; show spinner during the request. Errors must appear inline next to fields; focus the first error on submit.
- **Hydration:** Inputs with `value` need `onChange` (or use `defaultValue` for uncontrolled). Guard against hydration mismatches on date/time rendering.

---

## 10. THE CRAFT FLOOR (ABSOLUTE BANS)

The following moves are never allowed—they signal AI-generated slop or violate engineering best practices:
- No same-size cards of icon + heading + text as the page structure. Cards are lazy containers.
- No "kicker" or "eyebrow" above a heading. The heading carries its own weight.
- No section numbers (`01 / 02 / 03`) unless the sequence carries information.
- No modal for a task that needs neither interruption nor protected focus.
- No colored `border-left` or `border-right` above 1px on cards.
- No hard offset shadows (`4px 4px 0`) outside a neobrutalist world.
- No sparklines, progress rings, and soft-shadowed rounded rectangles standing in for content.
- No Unicode glyphs or emoji standing in for an icon system. Use a real library (e.g., Lucide) or authored SVG.
- No sketch-style SVG scenes or `feTurbulence` grain.
- **Anti-Patterns:** `user-scalable=no`, `onPaste` with `preventDefault`, `transition: all`, `outline-none` without `focus-visible` replacement, `<div>` or `<span>` with click handlers, images without dimensions, large arrays `.map()` without virtualization, hardcoded date/number formats (must use `Intl.*`), `autoFocus` without clear justification, `@media` queries for component-level styling (use `@container`).

---

## 11. TECHNICAL IMPLEMENTATION CONSTRAINTS

- **Bundle Size**: ≤ 500 KB gzipped per app (Vite manualChunks, dynamic imports for heavy libs like BlockNote/React Flow, `onboardjs`). Independent SPAs share dependencies via npm workspace `@ataqu/ui-kit`.
- **Idempotency**: All POST/PUT/DELETE requests must generate and send an `Idempotency-Key` header (UUIDv4) via a central Axios/fetch wrapper.
- **Styling**: Tailwind 4 + shadcn/ui (CLI v4). Dark-mode native.
- **State**: Zustand for global UI state, TanStack Query for server state.
- **Forms**: React Hook Form + Zod for all validation.
- **Performance**: No layout reads in render (`getBoundingClientRect`, `offsetHeight`). Batch DOM reads/writes. Use `<link rel="preconnect">` for CDN/asset domains. Critical fonts: `<link rel="preload" as="font">` with `font-display: swap`.
- **Locale**: Use `Intl.DateTimeFormat` and `Intl.NumberFormat` exclusively. Detect language via `Accept-Language` / `navigator.languages`, never via IP.
- **Touch & Safe Areas**: Use `touch-action: manipulation` to prevent double-tap zoom delay. Set `-webkit-tap-highlight-color` intentionally. Use `overscroll-behavior: contain` in modals/drawers/sheets. Full-bleed layouts must use `env(safe-area-inset-*)` for notches. During drag: disable text selection, set `inert` on dragged elements.
- **Copy**: Active voice. Title Case for headings/buttons. Numerals for counts ("8 deployments" not "eight"). Specific button labels ("Save API Key" not "Continue"). Error messages must include a fix/next step. Second person; avoid first person. `&` over "and" where space-constrained.

---

## 12. APP-SPECIFIC UI UPDATES SUMMARY

| App | New/Updated UI Elements | Priority |
|-----|------------------------|----------|
| **Shell (Global)** | System Health Widget, Setup Progress Tracker, Changelog Bell, Element Counter | P0 |
| **AEGIS** | Permission Matrix (`/admin/access-matrix`), Unified Audit Log (`/admin/audit`) | P0 |
| **SPARK** | Health Status Column in workflow list, Health Dashboard link | P0 |
| **VISTA** | System Health Dashboard (`/health`), Cross-App "Combine Data" button, Chart Drill‑Down side panel | P0/P1 |
| **TEMPO** | Ultra‑Simple Booking UX (3‑screen public booking) | P0 |
| **SOND** | Conversational Mode toggle in builder, one‑question‑per‑slide preview | P0 |
| **VAULT** | Shopify Sync connection UI, status card, error log | P0 |
| **All Apps** | Setup Progress tasks (5 per app), Inactivity Alerts | P1 |

---

**Document prepared for Ataqu Architecture Team. Version 12.0 is ready for AI agent implementation.**
