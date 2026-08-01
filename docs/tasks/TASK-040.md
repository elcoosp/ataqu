# TASK-040: Frontend SPA: VISTA (Analytics)

## Execution Boundaries
 - `apps/vista/`

## Step-by-Step Implementation Details
 1. **Context Mapping**: Read injected backend files (`vista_service.rs`, `handlers/vista.rs`). Note the SSE endpoint.\n2. **Routing**: TanStack Router for `/dashboard/:id`.\n3. **Dashboard Layout**: Configurable grid layout (using `react-grid-layout`).\n4. **Charts**: Implement bar, line, and pie charts using Recharts. Fetch initial data via TanStack Query.\n5. **Real-time KPIs**: Write a custom hook `useSSE` that connects to the backend EventSource. On receiving a message, patch the TanStack Query cache to update the KPI cards instantly.\n6. **Filters**: UI components (date picker, team selector) that update the query parameters and refetch data.\n7. **Export**: Buttons to trigger CSV/PDF export endpoints.\n8. **Styling**: Tailwind 4 + shadcn/ui. Dark-mode native.

## Success Criteria & Verification
 - [ ] `pnpm build` succeeds with 0 TypeScript errors.\n- [ ] Bundle size is ≤ 500 KB gzipped.\n- [ ] Charts render correctly with backend data.\n- [ ] SSE updates the UI without full page reloads.
