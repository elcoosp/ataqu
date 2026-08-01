# TASK-032: Frontend SPA: CINQ (CRM)

## Execution Boundaries
 - `apps/cinq/`

## Step-by-Step Implementation Details
 1. **Context Mapping**: Read the injected backend files (`cinq_service.rs`, `handlers/cinq.rs`, `contracts/cinq.rs`) to determine API endpoints.\n2. **Routing**: Use TanStack Router. Create routes for `/contacts`, `/deals`, `/activities`.\n3. **Contacts View**: Implement a high-density data grid (TanStack Table + TanStack Virtual) with search and pagination.\n4. **Deal Pipeline**: Implement a Kanban board using React Flow. Implement drag-and-drop to update deal stages. Use TanStack Query `useMutation` with optimistic updates (150ms rule) to update the stage.\n5. **Activities**: Implement an activity timeline component.\n6. **CSV Import/Export**: Add file upload component for CSV import and a download button for CSV export.\n7. **Custom Fields**: Render dynamic form fields based on the JSONB custom fields schema.\n8. **Styling**: Tailwind 4 + shadcn/ui. Dark-mode native.\n9. **Idempotency**: All mutations must include `Idempotency-Key` header.

## Success Criteria & Verification
 - [ ] `pnpm build` succeeds with 0 TypeScript errors.\n- [ ] Bundle size is ≤ 500 KB gzipped.\n- [ ] Drag-and-drop Kanban updates optimistically.\n- [ ] Virtualized table renders 1000+ rows smoothly.
