# TASK-040: Frontend SPA — VISTA (Analytics)

## Objective
Implement VISTA: configurable dashboard with drag-and-drop widgets, real-time KPIs via SSE (revenue, pipeline, stock), charts (bar/line/pie), filters (date/team/product), export (PDF/CSV/PNG), custom SQL editor, command palette actions.

## Execution Boundaries
- `apps/vista/src/routes/_auth.index.tsx`
- `apps/vista/src/routes/_auth.dashboard.$id.tsx`
- `apps/vista/src/routes/_auth.explore.tsx`
- `apps/vista/src/api/`
- `apps/vista/src/components/`
- `apps/vista/src/hooks/`
- `apps/vista/src/actions.ts`

## Backend Context Mapping
*The dispatch script has injected `crates/ataqu-domain-vista`, `crates/ataqu-application/src/vista_service.rs`, and `crates/ataqu-api/src/handlers/vista.rs`. You MUST read these to derive:*
- **Entity Types**: Map `Dashboard`, `Widget`, `Kpi`, `Chart`, `Filter`, `SqlQuery` structs to TypeScript.
- **API Endpoints**: `GET /dashboards`, `POST /dashboards`, `GET /dashboards/:id`, `PATCH /dashboards/:id`, `GET /dashboards/:id/widgets`, `POST /dashboards/:id/widgets`, `GET /kpis/:id/stream` (SSE), `POST /explore` (custom SQL), `GET /dashboards/:id/export?format=pdf|csv|png`.
- **SSE**: Backend pushes cache invalidation events via Server-Sent Events. Frontend uses `EventSource` to listen. On event, patch TanStack Query cache.
- **Aggregation** (ADR-010): VISTA polls `core.outbox` for `vista_consumed_at IS NULL`. Uses `ON CONFLICT DO UPDATE` to prevent double-counting. Pre-aggregated daily totals.

## UI Contract

### Shell & Layout
- `<Shell activeApp="vista">`.

### Dashboard List (`index.tsx`)
- Grid of dashboard cards: name, description, last updated, widget count.
- "Create Dashboard" button.
- Empty state: `<EmptyState icon={BarChart3} title="No dashboards" description="Dashboards are empty because you haven't connected CINQ and VAULT yet. 1 click to connect." ctaLabel="Create Dashboard" />`.

### Dashboard View (`dashboard.$id.tsx`)
- **Configurable grid layout** using `react-grid-layout`. Drag widgets to rearrange. Resize widgets.
- **Widgets**: KPI card, bar chart, line chart, pie chart, table.
  - KPI card: large number, label, trend indicator (up/down arrow). `data-tour="kpi-card"` on first KPI. `data-tour="sse-indicator"` on the live indicator.
  - Charts: use `recharts`. Bar (revenue by month), Line (pipeline trend), Pie (deal stage distribution).
  - Table: paginated data grid.
- **Real-time KPIs**: SSE indicator (green dot + "Live"). `useSSE` hook connects to `GET /kpis/:id/stream`. On event, `queryClient.setQueryData` to update KPI instantly. Data fades in over 100ms.
- **Filters**: date range picker, team selector, product selector, region selector. Updating filters refetches all widgets.
- **Refresh**: "Refresh Dashboard" button. Forces refetch of all queries.
- **Export**: "Export PDF" button, "Export CSV" button, "Export PNG" button. Calls `GET /dashboards/:id/export?format=...`.
- **Add Widget**: "Add Widget" button opens widget picker modal: select type, select data source, configure.

### Custom SQL Editor (`explore.tsx`)
- Code editor (use `@uiw/react-textarea-code-editor` or simple `textarea` with `font-mono`).
- "Run Query" button: `POST /explore` with SQL string. Results displayed in table below.
- Query history sidebar: list of previous queries. Click to reload.
- Export results as CSV.
- Empty state: "Write a SQL query to explore your data. No ETL needed."

### SSE Hook (`hooks/use-sse.ts`)
- Connect to `GET /kpis/:id/stream` using `EventSource`.
- On message: parse JSON, `queryClient.setQueryData(['vista', 'kpi', id], newData)`.
- Auto-reconnect on disconnect.
- Connection state in Zustand: `connected`, `disconnected`.
- On reconnect: refetch all dashboard queries.

### Command Palette Actions (`apps/vista/src/actions.ts`)
- `Go to Dashboard [Name]` → fuzzy search dashboards
- `Create Dashboard` → opens new dashboard modal
- `Go to Explore` → navigate to `/explore`
- `Refresh Dashboard` → force-refresh current dashboard
- `Add Widget` → opens widget picker (only when viewing a dashboard)
- `Export PDF` → only when viewing a dashboard
- `Export CSV` → only when viewing a dashboard
- `Set Date Range` → opens date range picker
- `Filter by [Team/Product/Region]` → opens filter selector

### Micro-Tour (from `micro-tours.md`)
- Tour ID: `vista-dashboard-tour`
- Trigger: First visit to `/dashboards/:id`.
- Steps:
  1. Target `[data-tour="kpi-card"]` — Content: "No ETL pipelines. This data is live from CINQ, right now." Action: view.
  2. Target `[data-tour="sse-indicator"]` — Content: "When a deal closes, this updates in milliseconds. No refresh button needed." Action: view.

### Toasts
- "Dashboard created." / "Widget added." / "Dashboard refreshed."
- "Export ready." / "Query executed." / "Live data connected."
- "SSE disconnected. Retrying..." / "SSE reconnected."

### Optimistic UI
- Widget add: appears in grid instantly.
- Widget move/resize: layout updates instantly. Save on debounce.
- Filter change: show skeleton loaders while refetching.

### Styling
- Dark-mode native.
- Charts use amber (`#F59E0B`) for primary metrics. Success green for positive trends. Destructive red for negative.
- KPI cards: `bg-card`, large `font-mono` numbers.
- SSE indicator: green dot with subtle pulse animation.
- `data-tour` attributes on KPI card and SSE indicator.

## Implementation Plan (Development Script)
1. Create types, API client.
2. Create `dashboard-grid.tsx` (react-grid-layout, drag/resize).
3. Create `kpi-card.tsx` (large number, trend, `data-tour="kpi-card"`).
4. Create `chart-widget.tsx` (Recharts wrapper: bar/line/pie).
5. Create `filter-bar.tsx` (date range, team, product, region).
6. Create `widget-picker.tsx` (modal: type, data source, config).
7. Create `export-buttons.tsx` (PDF/CSV/PNG).
8. Create `sql-editor.tsx` (code editor + results table + history).
9. Create `hooks/use-sse.ts` (EventSource + TanStack Query cache patch).
10. Create `sse-indicator.tsx` (green dot, `data-tour="sse-indicator"`).
11. Create `apps/vista/src/actions.ts`.
12. Implement routes: index, dashboard detail, explore.
13. Add `data-tour` attributes.
14. Wrap `/dashboards/:id` with `<OnboardTour>`.
15. Run gates, commit.

## Definition of Done (DoD)
- [ ] Charts render correctly with backend data using Recharts.
- [ ] SSE updates the UI without full page reloads (KPI numbers fade in).
- [ ] SSE auto-reconnects on disconnect.
- [ ] Dashboard grid supports drag-and-drop and resize.
- [ ] Filters update all widgets on change.
- [ ] Export buttons trigger correct endpoints (PDF/CSV/PNG).
- [ ] Custom SQL editor executes queries and displays results.
- [ ] All 9 command palette actions registered.
- [ ] Micro-tour triggers on first visit to `/dashboards/:id`.
- [ ] All empty states use `<EmptyState>`.
- [ ] All toasts contextual.
- [ ] No `any` types. Gates pass.
