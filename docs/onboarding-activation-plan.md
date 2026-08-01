# ⚡ ATAQU ONBOARDING & ACTIVATION PLAN — Version 1.3 (Phase 1)
### The "Zero-Bloat" Pipeline to SaaS Decommissioning

> **Executive Note:** In traditional SaaS, onboarding is a punishment—a gauntlet of empty states, mandatory configuration webinars, and multi-week data migrations. At Ataqu, onboarding is a **Rescue Mission**. The goal is not to "teach the platform." The goal is to get the user to experience the 150ms Rust speed, connect two apps natively, and cancel their first competitor subscription within 7 days. If a user hits a loading spinner, an empty error message, or a Zapier webhook screen, we have failed.

---

## 1. THE ACTIVATION PHILOSOPHY

### 1.1 The "Wedge First, Suite Second" Principle
Ataqu is a Unified OS, but showing a new user 10 apps on day one causes choice paralysis. Onboarding strictly forces the user to select **one wedge app** (usually CINQ, DIAL, or PIVOT). They achieve value in that single app within 3 minutes. Only after the wedge is adopted do we reveal the power of the suite.

### 1.2 The 3 Unbreakable Onboarding Rules
1. **Zero Email Verification Loops:** SSO via Google/Microsoft (AEGIS). They click "Sign Up," they are in the app. We do not hold them hostage in an inbox.
2. **Zero "Book a Call" Walls:** The product must sell itself. If onboarding requires a human to explain the UI, the UI is broken.
3. **Zero Full-Page Spinners:** Every action must use Optimistic UI. The interface reacts instantly, assuming success. If the backend fails, it gracefully rolls back. Speed is the primary brand signal.

---

## 2. THE 4 PHASES OF ACTIVATION

### Phase 1: The Wedge Entry (0-3 Minutes)
**The Goal:** Sign up, select a wedge app, and create the first entity. Time-to-First-Value (TTFV) must be under 3 minutes.

1. **The SSO Gateway:** User lands on `app.ataqu.so` and clicks "Continue with Google/Workspace."
2. **The 1-Question Wedge Selection:** No 5‑page demographic survey. Just one question: *"What are you trying to escape today?"*
   - Options: "HubSpot (CRM)", "Slack (Chat)", "Notion (Docs)", "Zapier (Automation)".
3. **The Pre-Configured Workspace:** Based on the answer, the UI loads directly into that specific app (e.g., CINQ). The other 9 apps are visible in the sidebar but grayed out.
4. **The First Action:** An interactive, inline tooltip points to the "Create" button. User creates their first Deal/Doc/Chat. The UI responds in 150ms (optimistic UI) – the write goes to PostgreSQL via SeaORM with MVCC concurrency.
   - *Activation Event 1 Triggered:* `first_entity_created`

### Phase 2: The Speed & Competence Proof (3-10 Minutes)
**The Goal:** Prove the "Calm Predator" ethos. Show them the architecture isn't lying.

1. **The Data Import Prompt:** Once the first entity is created, a non‑blocking banner appears: *"Importing from [Competitor]? Drop your CSV here."*
2. **The Instant Mapping:** The user uploads a HubSpot or Notion CSV. Ataqu’s Rust backend parses and maps it instantly via SeaORM and the generic `transactional_batch_insert` helper, displaying a high‑density data grid of the imported records. No "processing" screen.
3. **The UX Reassurance:** If a user tries to navigate away during a large import, a native browser `beforeunload` event triggers: *"We are still moving your data. Are you sure?"*
   - *Activation Event 2 Triggered:* `first_data_imported`

### Phase 3: The Native Integration "Aha!" (10-60 Minutes)
**The Goal:** Prove the Unified OS thesis. This is where the user realizes they don't need Zapier.

1. **The Contextual Prompt:** The user is looking at a deal in CINQ. A native UI banner appears: *"When this deal is won, should we create a private channel in DIAL and an onboarding task in PIVOT?"*
2. **The 1-Click Toggle:** The user clicks "Yes." There is no API key entry. There is no OAuth redirect. The connection is enabled via outbox events with `LISTEN/NOTIFY` – the integration is already built into the unified outbox.
3. **The Demo Simulation:** The user moves the CINQ deal to "Won." In real‑time, via Server‑Sent Events (SSE), the UI updates. A badge appears on the DIAL icon in the sidebar. A task appears in PIVOT. The outbox relay (`LISTEN/NOTIFY` + safety-net polling) ensures the event is processed in <1s.
   - *Activation Event 3 Triggered:* `first_native_integration_enabled` (This is the PLG "Aha!" moment).

### Phase 4: The Decommission (Day 1 to Day 7)
**The Goal:** Convert the free/single‑app user to the $49/mo bundle by helping them cancel a competitor.

1. **The "Stack Audit" Dashboard:** After 24 hours, the user sees a "Decommission Checklist" widget. It lists their inferred competitors based on the apps they are using.
2. **The Upgrade Trigger:** The user is on the $15/mo CINQ plan. They want to add DIAL. They click "Activate DIAL." The UI shows: *"Adding DIAL standalone: $9/mo. Upgrading to the 10‑App Bundle: $49/mo. Choose."*
3. **The Migration Engine:** Upon upgrading, the user is presented with step‑by‑step "Escape Hatch" guides for their specific competitors.
   - *Activation Event 4 Triggered:* `upgraded_to_suite` + `competitor_decommissioned`

---

## 3. BEHAVIORAL TRIGGER ARCHITECTURE

We do not send generic "Welcome to Ataqu" drip campaigns. All communication is strictly triggered by behavioral events inside the product.

| User Behavior | Trigger Condition | Ataqu Action | Channel |
|---------------|-------------------|--------------|---------|
| **The Tourist** | Signed up, but no entity created in 10 mins. | Plain text email: *"Stuck? Hit reply and tell us what's confusing. No bots."* | Email |
| **The Silo User** | Created 50+ entities in CINQ, but 0 native integrations after 2 days. | In‑app banner: *"Stop copying data by hand. Connect CINQ to DIAL in 1 click."* | In‑App |
| **The Power User** | Hit 1,000 actions in a single day. | In‑app confetti (subtle, 1‑second): *"You just fired 1,000 actions. Your Zapier bill would have spiked. Here it's $49."* | In‑App |
| **The Hostage** | Tried to export data via CSV 3 times in one session. | Human support reaches out: *"Looks like you're trying to migrate a lot of data. We can help format the CSVs."* | Email/DIAL |
| **The Churn Risk** | Visited the "Cancel" page but didn't click. | Plain text email from CEO: *"We noticed you looked at cancellation. We don't trap you. Tell us what broke."* | Email |

---

## 4. THE "ESCAPE HATCH" MIGRATION ENGINE

Onboarding at Ataqu is uniquely focused on *offboarding* from competitors. We provide the tools to extract data from walled gardens.

### 4.1 The Native Importers
We build strictly typed Rust importers for the top 5 competitors (HubSpot, Slack, Notion, Zapier, Calendly).
- **The UX:** Drag and drop the exported CSV/JSON. The Ataqu parser maps it to our schema instantly via SeaORM, showing a live diff of what will be created. All writes go through a single `sea_orm::DatabaseTransaction` for atomicity.
- **The Rule:** If the competitor intentionally makes it hard to export data (e.g., hiding the button in admin settings), our migration guide includes screenshots of exactly where to find it, even if it requires a support call to the competitor.

### 4.2 The SPARK Replication
For users migrating from Zapier, we do not ask them to rebuild workflows manually.
- **The Tool:** A "Zapier JSON Importer." The user exports their Zapier Zap (if available) or pastes the webhook URLs. Ataqu attempts to auto‑map the trigger/action into a native SPARK workflow using the unified outbox instead of webhooks.

---

## 5. EMPTY STATES AS CONVERSION TOOLS

Ataqu does not use "passive" empty states. Every empty state is a micro‑onboarding session.

| App | ❌ Standard SaaS Empty State | ✅ Ataqu Empty State |
|-----|------------------------------|----------------------|
| **CINQ (CRM)** | "No deals yet. Click + to add one." | "No revenue tracked yet. Drop your HubSpot CSV here, or create your first deal." |
| **DIAL (Chat)** | "No channels. Create one!" | "Silence. Connect DIAL to CINQ, and we'll auto‑create a channel for every active deal." |
| **SPARK** | "Automate your work." | "You have 0 automations. Zapier would charge you $30/mo for this. Turn on your first native trigger." |
| **VISTA** | "No data to display." | "Dashboards are empty because you haven't connected CINQ and VAULT yet. 1 click to connect." |

---

## 6. ACTIVATION METRICS & NORTH STARS

We measure the health of our onboarding pipeline with ruthless precision.

1. **TTFV (Time‑to‑First‑Value):** The time between SSO login and the first entity created. **Target: < 3 minutes.**
2. **TTFNI (Time‑to‑First‑Native‑Integration):** The time between the first entity created and the first cross‑app connection (e.g., CINQ -> DIAL). **Target: < 24 hours.**
3. **The Decommission Rate:** The percentage of users who, within 7 days of upgrading to the $49 bundle, actively use the migration tools to cancel a competitor. **Target: 40%+.**
4. **Onboarding Friction Score:** Derived from the number of "stuck" behaviors (e.g., visiting the same screen 3 times without clicking). If this rises, the UI is too complex, and we must eradicate bloat.

---

### FINAL ACTIVATION DIRECTIVE
Onboarding is not a tutorial; it is an intervention. The user comes to Ataqu bleeding from SaaS sprawl and vendor lock‑in. Our onboarding must be a tourniquet. No slideshows. No configuration menus. Just instant SSO, instant data import, and the visceral proof that two apps can talk to each other without Zapier. If they feel the 150ms speed in the first 3 minutes, the rest of the $49 suite sells itself.
