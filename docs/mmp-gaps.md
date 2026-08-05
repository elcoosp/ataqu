---
title: "MMP Gap Specification – Frontend Features"
status: draft
date: 2026-08-03
target: Frontend agents
---

# MMP Gap Specification – Frontend Features

This document defines the **missing features** that transform your functional MLP into a marketable product. All items are **inside the apps** (not the landing page) and are required for a prospect to understand, try, and buy the product.

---

## Summary of Gaps

| # | Feature | App(s) | Priority | Status |
|---|---------|--------|----------|--------|
| 1 | Actionable Empty States | All | P0 | Missing |
| 2 | Native Integrations (SPARK Templates) | SPARK | P0 | Missing |
| 3 | Stack Decommission Dashboard | Global (`/audit`) | P0 | Missing |
| 4 | Onboardjs Micro‑Tours | All (first visit) | P1 | Missing |
| 5 | Command Palette Actions | Global | P1 | Partial |
| 6 | Cross-App Integration Views | CINQ, VAULT, DIAL | P1 | Missing |
| 7 | Contextual Feedback (Toasts) | All | P1 | Partial |

---

## 1. Actionable Empty States

**The Problem:** Empty states currently just show "No deals" or "No messages". They don't guide the user toward their first action.

**What's Required:** Every empty state must:
- Display a **clear next action** (e.g., drag & drop, create button, or import).
- For data import, provide a **functional drag-and-drop zone** that accepts CSV/JSON.
- Show a **native integration hook** when relevant (e.g., "Connect CINQ to DIAL to auto‑create channels").

**Examples:**

| App | Empty State Action |
|-----|---------------------|
| CINQ (`/deals`) | "Drop your HubSpot CSV here, or create your first deal." |
| DIAL (`/`) | "Connect DIAL to CINQ, and we'll auto‑create a channel for every active deal." |
| VAULT (`/products`) | "Import your product catalog from CSV, or add your first product." |
| PIVOT (`/doc`) | "Create your first document, or link it to a CINQ deal." |

**Technical Requirements:**
- Use `react-dropzone` for drag‑and‑drop.
- Implement client‑side CSV parsing with `PapaParse`.
- Show a **live mapping preview** before submission (for CINQ/VAULT imports).
- Use the generic batch import endpoint (`/api/cinq/csv/import`) with idempotency key.

**Files to modify:**
- `apps/cinq/src/routes/_auth.import.tsx`
- `apps/dial/src/routes/_auth.index.tsx`
- `apps/vault/src/routes/_auth.products.tsx`
- `apps/pivot/src/routes/_auth.doc.tsx`
- All `packages/ui/src/components/empty-state.tsx`

---

## 2. Native Integrations (SPARK Templates)

**The Problem:** Users don't see that apps are connected. The "Zapier killer" feature is invisible.

**What's Required:** All native integrations are delivered as **pre-installed SPARK templates**.

**Pre-installed templates:**
1. CINQ → DIAL: Create a channel when a deal is won
2. SOND → CINQ: Create a lead when a form is submitted
3. PAUSE → AEGIS: Deactivate account on offboarding
4. TEMPO → CINQ: Create an activity for a booked meeting
5. CINQ → VAULT: Reserve stock when a deal is won
6. VAULT → DIAL: Alert when stock is low (disabled by default)

**In SPARK, users can:**
- Toggle a template on/off
- Duplicate a template to customize it
- View the template in the canvas

**No separate toggles in CINQ/DIAL/VAULT.** Everything lives in SPARK.

**Technical Requirements:**
- Each template is a `spark.workflows` record with `is_system_template = true`.
- Toggling updates `workflows.status = 'active'|'inactive'`.
- Duplicating copies the workflow with `is_system_template = false`.

**Files to modify:**
- `apps/spark/src/routes/_auth.index.tsx` (template list UI)
- `apps/spark/src/routes/_auth.workflows.$id.tsx` (template view + duplicate)
- `crates/ataqu-api/src/handlers/spark.rs` (toggle + duplicate endpoints)

---

## 3. Stack Decommission Dashboard (`/audit`)

**The Problem:** The `ui-ux-master-doc.md` specifies `/audit` but it's not implemented in the frontend.

**What's Required:** A dashboard that shows:
- List of **competitor apps** (HubSpot, Slack, Zapier, Notion, etc.) with a status: "Not tracked", "Tracking", "Decommissioned".
- For each, a **savings calculation** based on the user's current plan (Starter/Pro/Suite) and the number of users.
- A **progress bar** showing how much of the stack is decommissioned.
- **Quick links** to competitor cancellation pages and export guides.

**Technical Requirements:**
- Use a new endpoint `GET /api/audit/status` that returns per-competitor status (derived from user activity and imported data).
- The savings calculation: For each competitor, estimate based on average pricing (HubSpot: $1200/mo for 5 users, Slack: $12.5/user, etc.) and multiply by the user's plan tier.
- Show a "Decommission" button that links to `ataqu.com/guides/cancel-{competitor}`.

**Files to modify:**
- Create `apps/audit` as a new SPA (or add it as a global route in the shell). For simplicity, add it as a new app `audit` under `apps/audit`.
- Routes: `/audit` only.

---

## 4. Onboardjs Micro‑Tours

**The Problem:** The `ui-ux-master-doc.md` defines micro‑tours for each app, but they're not integrated.

**What's Required:** Integrate `@reactour/tour` (or `onboardjs`) to show **3‑step tours** on the first visit to key views.

**Per‑App Tours:**

| App | Trigger | Steps |
|-----|---------|-------|
| CINQ | First visit `/deals` | 1. Highlight Kanban board. 2. Highlight drag‑and‑drop. 3. Highlight "Won" stage. |
| DIAL | First visit `/tickets` | 1. Highlight context sidebar. 2. Highlight reply box. |
| PIVOT | First visit `/db/:id` | 1. Highlight "New Row". 2. Highlight relational column. |
| SPARK | First visit `/workflows/new` | 1. Highlight triggers. 2. Highlight canvas. |
| VAULT | First visit `/products/:id` | 1. Highlight stock number. 2. Highlight "Adjust Stock". |
| PAUSE | First visit `/leave` | 1. Highlight "Request Leave". |
| VISTA | First visit `/dashboards/:id` | 1. Highlight KPI card. 2. Highlight SSE indicator. |

**Technical Requirements:**
- Use `useOnboardingStore` to store completed tours.
- Tour styling must match the glassmorphic design (`.ataqu-glass`).
- Tour should be skippable and not block UI.

**Files to modify:**
- Each app's `src/routes/_auth.tsx` to check tour status.
- `packages/ui/src/components/tour.tsx` (new).

---

## 5. Command Palette Actions

**The Problem:** The command palette (`⌘ K`) currently only has navigation links, not executable actions.

**What's Required:** Add **actions** that trigger specific functions:
- "Create new deal" → opens the deal creation modal.
- "Send message to #general" → navigates and focuses input.
- "Adjust stock for product X" → opens the stock adjustment modal.
- "Run workflow Y" → triggers execution.

**Technical Requirements:**
- Use `@tanstack/react-query` to fetch a list of recent items (e.g., recent deals, channels).
- Actions should be registered per app via a plugin system (e.g., each app exports a list of actions).
- The command palette should be `useHotkeys`‑aware.

**Files to modify:**
- `packages/ui/src/components/command-palette.tsx`
- Each app should export an action registry (e.g., `apps/cinq/src/actions.ts`).

---

## 6. Cross-App Integration Views

**The Problem:** Users don't see the effects of native integrations in other apps.

**What's Required:** Add **contextual indicators** in each app that show data from other apps.

**Examples:**
- In **CINQ deal detail**, show a badge: "Stock reserved in VAULT" with a link to the VAULT product page.
- In **DIAL channel**, show a badge: "Created from CINQ deal #42" with a link.
- In **VAULT product page**, show a list of active reservations from CINQ deals.

**Technical Requirements:**
- Use a new API endpoint `GET /api/cross-app/relations` to fetch cross‑app references.
- Display as a compact list or badge using `@ataqu/ui` components.

**Files to modify:**
- `apps/cinq/src/routes/_auth.deals.$id.tsx`
- `apps/dial/src/routes/_auth.channels.$id.tsx`
- `apps/vault/src/routes/_auth.products.$id.tsx`

---

## 7. Contextual Feedback (Toasts)

**The Problem:** Toasts are generic ("Saved") and don't reflect the context of the action.

**What's Required:** Make toasts **specific** to the action performed.

**Examples:**
- "Deal won. Stock reserved in VAULT." (instead of just "Saved")
- "Message sent. Notification delivered to #general."
- "Workflow triggered. DIAL channel created."

**Technical Requirements:**
- Extend the toast system to accept a `context` object.
- Use the backend response to populate additional information (e.g., the reserved stock quantity).
- Ensure toasts are non‑blocking and auto‑dismiss after 3 seconds.

**Files to modify:**
- `packages/ui/src/components/toast.tsx`
- All mutation handlers to include context.

---

## Implementation Priority

| Priority | Features | Estimated Effort |
|----------|----------|------------------|
| P0 | Actionable Empty States, Native Integration Toggles, Stack Decommission Dashboard | 3 days (1 agent) |
| P1 | Onboardjs Micro‑Tours, Command Palette Actions, Cross-App Views, Contextual Toasts | 5 days (2 agents) |

---

## Next Steps

1. **Create** a new frontend task for each feature (or a single task per priority).
2. **Assign** to agents with reference to this document.
3. **Test** each feature in isolation before merging.

---

This document should be saved as `docs/mmp-gap-spec.md` in your repository. It gives your frontend agents a clear, actionable list of what's missing to make the product marketable.
