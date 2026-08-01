# TASK-037: Frontend SPA: SOND (Forms)

## Execution Boundaries
 - `apps/sond/`

## Step-by-Step Implementation Details
 1. **Context Mapping**: Read injected backend files (`sond_service.rs`, `handlers/sond.rs`).\n2. **Routing**: TanStack Router for `/builder/:id` and `/submissions/:id`.\n3. **Form Builder**: Implement drag-and-drop interface (using `@dnd-kit/core`) to add question types (text, email, choice, date) to a canvas.\n4. **Conditional Logic**: UI to configure branching (e.g., 'If Question 1 == 'Yes', show Question 2').\n5. **Submissions Table**: TanStack Table to display submissions with a CSV export button.\n6. **Styling**: Tailwind 4 + shadcn/ui. Dark-mode native.\n7. **Idempotency**: Form publishing must include `Idempotency-Key`.

## Success Criteria & Verification
 - [ ] `pnpm build` succeeds with 0 TypeScript errors.\n- [ ] Bundle size is ≤ 500 KB gzipped.\n- [ ] Drag-and-drop builder works.\n- [ ] CSV export downloads a file.
