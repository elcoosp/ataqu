# TASK-040: Frontend SPA — VISTA (Analytics)

## Objective

## API Client Usage
All API calls are provided by `@ataqu/api-client`. Use the generated hooks (`use*Query`, `use*Mutation`) and typed functions. Do not write custom fetch wrappers. The client is already configured with idempotency, auth, and error handling.

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


### 🆕 Chart Drill-Down (P0)

**Objective:** Add interactivity to all chart widgets (Bar, Line, Pie, Area). Click on any chart element → opens a side panel (sheet/drawer) showing the raw data behind that element.

**Backend Context Mapping:**
- **Endpoint:** `POST /api/v1/vista/drill-down`
- **Payload:** `{ dashboardId, widgetId, dimension, value, filters, limit: 1000 }`
- **Response:** `{ data: Record<string, any>[], total: number, hasMore: boolean }`
- **Security:** Tenant isolation via `TenantId`. Filters validated against widget data source.

**UI Contract:**

**Interaction:**
- Hover: subtle highlight (amber border, 2px).
- Click: side panel slides in from right.

**Side Panel (350px width, .ataqu-glass):**
- Title: `"Deals in August 2026"` (dynamic based on dimension + value).
- Data Table: TanStack Table with all relevant columns.
  - Virtualized if > 100 rows.
  - Sortable columns.
- Export: "Export CSV" button.
- Close: "X" button or click outside to close.

**Supported Charts:**
- **Bar Chart:** Click on a bar → shows items in that category.
- **Line Chart:** Click on a data point → shows items at that timestamp.
- **Pie Chart:** Click on a segment → shows items in that segment.
- **Area Chart:** Click on a data point → same as line chart.

**Implementation Steps:**
1. Add `POST /api/v1/vista/drill-down` to `apps/vista/src/api/vista-api.ts`.
2. Create `apps/vista/src/components/dashboard/chart-interaction.tsx` (onClick handler for Recharts).
3. Create `apps/vista/src/components/dashboard/drill-down-panel.tsx` (side panel).
4. Create `apps/vista/src/components/dashboard/drill-down-table.tsx` (TanStack Table).
5. Zustand store: `useDrillDownStore` (isOpen, data, loading, widgetId, dimension, value).
6. Modify each chart widget to accept `onDataPointClick` prop.
7. Styling: `.ataqu-glass`, `shadow-lg`, smooth slide-in 200ms (translateX).
8. Loading state: skeleton loader in side panel.

**Definition of Done:**
- [ ] Click on bar chart → side panel opens with data for that bar.
- [ ] Click on line chart → side panel opens with data for that point.
- [ ] Click on pie chart → side panel opens with data for that segment.
- [ ] Side panel closes on "X" click or click outside.
- [ ] Data table is virtualized for > 100 rows.
- [ ] Export CSV downloads the data.
- [ ] Loading state shows skeleton loader.
- [ ] Empty state: "No data found for this selection."


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

### System Health Dashboard (`/health`)
- Shows outbox lag, pending events, last dispatch timestamp.
- Workflow status: list of all SPARK workflows with last run, success/failure, DLQ depth.
- Integration status: CINQ→DIAL, SOND→CINQ, VAULT→CINQ with green/yellow/red indicators.
- Connection pool usage.
- DLQ Viewer: expandable list of failed events with payload, error reason, replay/delete buttons.
- Auto‑refresh every 10 seconds (SSE).

### Cross‑App "Combine Data" Flow
- Button in any VISTA dashboard: "Combine Data".
- Modal to select primary data source (e.g., CINQ Deals) and secondary source (e.g., VAULT Stock).
- Chart updates instantly with both datasets overlaid.
- Export combined view as CSV/PNG.

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
