# TASK-039: Frontend SPA: PAUSE (HR)

## Execution Boundaries
 - `apps/pause/`

## Step-by-Step Implementation Details
 1. **Context Mapping**: Read injected backend files (`pause_service.rs`, `handlers/pause.rs`).\n2. **Routing**: TanStack Router for `/directory`, `/leave`.\n3. **Employee Directory**: Searchable list/grid of employees. Implement tsvector search via backend API.\n4. **Leave Requests**: Form to submit a leave request (React Hook Form + Zod validation).\n5. **Approval Dashboard**: View for managers to see pending requests and Approve/Reject them. Use optimistic UI for the button click.\n6. **Styling**: Tailwind 4 + shadcn/ui. Dark-mode native.\n7. **Idempotency**: Approvals and requests must include `Idempotency-Key`.

## Success Criteria & Verification
 - [ ] `pnpm build` succeeds with 0 TypeScript errors.\n- [ ] Bundle size is ≤ 500 KB gzipped.\n- [ ] Directory search works.\n- [ ] Zod validation prevents invalid date ranges.
