# TASK-032: Frontend SPA — CINQ (CRM)

## Objective

## API Client Usage
All API calls are provided by `@ataqu/api-client`. Use the generated hooks (`use*Query`, `use*Mutation`) and typed functions. Do not write custom fetch wrappers. The client is already configured with idempotency, auth, and error handling.

Implement CINQ: contacts list, deal Kanban pipeline with drag-and-drop, deal detail with activities, email tracking display, custom fields (JSONB), CSV import/export with column mapping, search (tsvector <50ms), tasks, native integration toggles (DIAL, SPARK), cross-app integration badges (VAULT stock), command palette actions, and micro-tour.

## Execution Boundaries
- `apps/cinq/src/routes/_auth.contacts.index.tsx`
- `apps/cinq/src/routes/_auth.contacts.$id.tsx`
- `apps/cinq/src/routes/_auth.deals.index.tsx`
- `apps/cinq/src/routes/_auth.deals.$id.tsx`
- `apps/cinq/src/routes/_auth.tasks.tsx`
- `apps/cinq/src/routes/_auth.import.tsx`
- `apps/cinq/src/api/`
- `apps/cinq/src/components/`
- `apps/cinq/src/hooks/`
- `apps/cinq/src/actions.ts`

## Backend Context Mapping
*The dispatch script has injected `crates/ataqu-domain-cinq`, `crates/ataqu-application/src/cinq_service.rs`, and `crates/ataqu-api/src/handlers/cinq.rs`. You MUST read these to derive:*
- **Entity Types**: Map `Contact`, `Deal`, `Activity`, `PipelineStage`, `Task`, `CustomField` structs to TypeScript interfaces.
- **API Endpoints**: `GET /contacts`, `POST /contacts`, `GET /contacts/:id`, `PATCH /contacts/:id`, `GET /deals`, `POST /deals`, `PATCH /deals/:id`, `PATCH /deals/:id/stage`, `GET /deals/:id/activities`, `POST /deals/:id/activities`, `GET /deals/:id/tasks`, `POST /deals/:id/tasks`, `GET /contacts/search?q=`, `GET /deals/search?q=`, `POST /contacts/csv/import`, `GET /contacts/export`, `GET /deals/export`, `GET /deals/:id/email-tracking`, `POST /integrations/toggle`.
- **Custom Fields**: Backend uses `JSONB` with three-tier query (ADR-030). Frontend `customFields` is `Record<string, string | number | boolean>`. Render dynamically in forms and table columns.
- **Email Tracking**: Backend isolates via bounded channel with atomic JSONL spill (ADR-031). Frontend displays `email_opened_at` and `email_clicked_at` timestamps on activities. No real-time WebSocket needed — just display the data.
- **PII**: `Contact.email` and `Contact.phone` are API-serialized strings on the frontend.
- **Integration Events**: Look for `CinqDealWonV1` event in the domain crate. This is what the DIAL and SPARK integration toggles enable.
- **Cross-App Relations**: `GET /api/v1/cross-app/relations?entityId=dealId` returns relations from VAULT (stock reservations).

## UI Contract

### Shell & Layout
- `<Shell activeApp="cinq">`.
- Contacts and Deals use `<DashboardLayout>` (high-density grid).

### Data Fetching
- Use `@tanstack/react-query` `useQuery` and `useMutation`.
- All query keys prefixed with `['cinq', ...]`.
- All mutations include `Idempotency-Key` header (use `useIdempotency()` from `@ataqu/shared-hooks`).

### Contacts List (`contacts.index.tsx`)
- `@ataqu/ui` `Table` component (which wraps TanStack Table + TanStack Virtual).
- Columns: Name, Email, Phone, Company, Last Activity, Custom Fields (first 2).
- Search bar at top: debounced 300ms, calls `GET /contacts/search?q=`.
- Virtualized with `@tanstack/react-virtual` for > 100 rows.
- "Create Contact" button opens modal.
- "Export CSV" button triggers `GET /contacts/export` and downloads blob.
- Empty state: `<EmptyState icon={Users} title="No contacts yet" description="Drop your HubSpot CSV here, or create your first contact." ctaLabel="Create Contact" />` with CSV dropzone.

### Contact Detail (`contacts.$id.tsx`)
- Header: Name, Company, Email, Phone.
- Tabs: Activities, Tasks, Custom Fields.
- Activities timeline (reverse chronological). "Add Activity" button opens modal (type: note/call/email, content textarea).
- Custom Fields tab: render dynamic form based on `customFields` schema. Inline-editable with optimistic UI.

### Deal Kanban (`deals.index.tsx`)
- Horizontal scroll columns for each `PipelineStage`.
- Cards are draggable using `@dnd-kit/core` and `@dnd-kit/sortable`.
- Card shows: Deal name, amount, contact name, probability.
- On drop to new stage: `PATCH /deals/:id/stage` with optimistic update (card moves instantly, reverts on error with toast).
- "Create Deal" button opens modal: name, amount, stage, contact, owner, probability.
- "Export CSV" button.
- Search bar: debounced, calls `GET /deals/search?q=`.
- `data-tour="kanban-board"` on the Kanban container. `data-tour="deal-card"` on first deal card.
- Empty state: `<EmptyState icon={TrendingUp} title="No deals in this pipeline" description="Create one to start tracking revenue." ctaLabel="Create Deal" />`.

### Deal Detail (`deals.$id.tsx`)
- Header: Deal name, amount, stage badge, probability, owner, contact link.
- **Integration Toggles** (from `mmp-gaps.md` P0):
  - `<Switch>` labeled "When this deal is won, create a DIAL channel." On toggle: `POST /integrations/toggle` with `{ sourceApp: "cinq", targetApp: "dial", entityId: deal.id, enabled }`. On success: `<Badge variant="success">Connected to DIAL</Badge>` + toast "CINQ connected to DIAL." Optimistic UI.
  - `<Switch>` labeled "When this deal is won, trigger SPARK workflow." Same pattern. Badge: "Connected to SPARK".
- **Cross-App Integration Badge** (from `mmp-gaps.md` P1):
  - Fetch `GET /api/v1/cross-app/relations?entityId=deal.id`. If VAULT reservation exists, show `<Badge variant="info">Stock reserved in VAULT</Badge>` with link to `inv.ataqu.com/products/:id`.
- Tabs: Activities, Tasks, Email Tracking.
- Activities timeline. "Add Activity" modal (type: note/call/email, content).
- Tasks tab: list of tasks with due dates, "Create Task" button.
- Email Tracking tab: list of emails sent with `email_opened_at` and `email_clicked_at` timestamps. Green dot if opened.

### Tasks Page (`tasks.tsx`)
- List of all tasks across deals. Columns: Task, Deal, Assignee, Due Date, Status.
- "Create Task" button. Inline checkbox to complete.
- Empty state: `<EmptyState icon={CheckSquare} title="No tasks" description="Create tasks to track follow-ups and to-dos." ctaLabel="Create Task" />`.

### CSV Import (`import.tsx`)
- Drag-and-drop zone using `react-dropzone`.
- Client-side CSV parsing with `PapaParse`.
- Show **column mapping preview** table: left column = CSV headers (dropdown to remap), right column = Ataqu field names.
- "Import" button: `POST /contacts/csv/import` with `Idempotency-Key` header and mapped columns as payload.
- Show progress bar (not spinner) during upload.
- On success: toast "CSV imported: N contacts." Navigate to contacts list.
- On partial failure: show DLQ entries in a table with error reasons.

### Command Palette Actions (`apps/cinq/src/actions.ts`)
Register ALL of these (from `cmd-k-research.md`):
- `Create Contact` → opens contact creation modal
- `Create Deal` → opens deal creation modal
- `Go to Contacts` → navigate to `/contacts`
- `Go to Deals` → navigate to `/deals`
- `Go to Tasks` → navigate to `/tasks`
- `Go to Import` → navigate to `/import`
- `Import CSV` → triggers file picker for CSV
- `Search Contacts` → focuses contacts search bar
- `Search Deals` → focuses deals search bar
- `Move Deal to [Stage]` → only when viewing a deal detail
- `Add Activity` → only when viewing a deal/contact
- `Connect to DIAL` → only when viewing a deal
- `Connect to SPARK` → only when viewing a deal
- `Export Contacts CSV` → triggers export
- `Export Deals CSV` → triggers export

### Micro-Tour (from `micro-tours.md`)
- Tour ID: `cinq-kanban-tour`
- Trigger: First visit to `/deals` (check `useOnboardingStore().isCompleted('cinq-kanban-tour')`).
- Steps:
  1. Target `[data-tour="kanban-board"]` — Content: "This is your revenue engine. No 3-year lock-in, just deals." Action: view.
  2. Target `[data-tour="deal-card"]` — Content: "Drag this to 'Won' to trigger native automations across the OS." Action: drag.
- Uses `<OnboardTour>` from `@ataqu/ui` with glassmorphic styling.
- Skip button always visible.

### Toasts (from `mmp-gaps.md`)
Contextual messages:
- "Deal moved to Won." (not "Saved")
- "Deal moved to Negotiation."
- "Contact created."
- "Activity added."
- "CSV imported: 42 contacts."
- "CINQ connected to DIAL."
- "CINQ connected to SPARK."
- "Stock reserved in VAULT." (when cross-app badge appears)
- "Export ready."

### Optimistic UI (150ms rule)
- Kanban drag: card moves instantly, reverts on error.
- Contact create: appears in list instantly.
- Activity add: appears in timeline instantly.
- Task complete: checkbox toggles instantly.
- Integration toggle: switch flips instantly, badge appears instantly.

### Styling
- Dark-mode native. Tailwind tokens.
- Amber (`bg-primary`) only for "Won" stage badge, primary CTA buttons, and active states.
- `font-mono` for deal amounts.
- Skeleton loaders. NO spinners.

## Implementation Plan (Development Script)
1. Create `apps/cinq/src/api/types.ts` with `Contact`, `Deal`, `Activity`, `PipelineStage`, `Task`, `CustomField`, `EmailTrackingEvent`, `CrossAppRelation` interfaces.
2. Create `apps/cinq/src/api/cinq-api.ts` with typed fetch functions. All mutations accept `idempotencyKey`.
3. Create `apps/cinq/src/hooks/use-contacts.ts` and `use-deals.ts` (TanStack Query hooks).
4. Create `apps/cinq/src/components/contact-table.tsx` (virtualized, searchable).
5. Create `apps/cinq/src/components/deal-kanban.tsx` with `@dnd-kit` drag-and-drop.
6. Create `apps/cinq/src/components/deal-card.tsx` with `data-tour="deal-card"`.
7. Create `apps/cinq/src/components/integration-toggle.tsx` (DIAL + SPARK toggles).
8. Create `apps/cinq/src/components/cross-app-badge.tsx` (VAULT stock reservation badge).
9. Create `apps/cinq/src/components/csv-import.tsx` with dropzone, PapaParse, column mapping.
10. Create `apps/cinq/src/components/activity-timeline.tsx`.
11. Create `apps/cinq/src/components/email-tracking-tab.tsx`.
12. Create `apps/cinq/src/components/custom-fields-tab.tsx` (dynamic JSONB fields).
13. Create `apps/cinq/src/components/task-list.tsx`.
14. Create `apps/cinq/src/actions.ts` exporting command palette actions.
15. Implement routes: contacts index, contact detail, deals index (Kanban), deal detail, tasks, import.
16. Add `data-tour` attributes to Kanban board and deal cards.
17. Wrap `/deals` route with `<OnboardTour tourId="cinq-kanban-tour" steps={cinqKanbanTourSteps}>`.
18. Run scoped frontend gates for `cinq`.
19. Commit with `feat(cinq): implement CRM, Kanban, CSV import, integrations, command palette, tour (baseline)`.

## Definition of Done (DoD)
- [ ] Kanban drag-and-drop uses optimistic UI (card moves instantly, reverts on error).
- [ ] CSV import shows column mapping preview before submission.
- [ ] Integration toggle calls correct endpoint, shows badge, uses optimistic UI.
- [ ] Cross-app badge shows VAULT stock reservation with link.
- [ ] Email tracking tab displays opened/clicked timestamps.
- [ ] Custom fields render dynamically from JSONB and are inline-editable.
- [ ] Contacts list supports search with 300ms debounce.
- [ ] All 15 command palette actions registered and functional.
- [ ] Micro-tour triggers on first visit to `/deals` with 2 steps.
- [ ] All empty states use `<EmptyState>` with specific copy.
- [ ] All toasts are contextual (not generic "Saved").
- [ ] All mutations include `Idempotency-Key` header.
- [ ] No `any` types. All API responses typed.
- [ ] No loading spinners. Skeleton loaders only.
- [ ] `pnpm tsc --noEmit` and `pnpm biome check` pass.
