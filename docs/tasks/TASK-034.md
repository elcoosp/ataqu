# TASK-034: Frontend SPA: PIVOT (Docs & Databases)

## Execution Boundaries
 - `apps/pivot/`

## Step-by-Step Implementation Details
 1. **Context Mapping**: Read injected backend files (`pivot_service.rs`, `handlers/pivot.rs`).\n2. **Routing**: TanStack Router for `/doc/:id` and `/db/:id`.\n3. **Doc Editor**: Implement a Notion-like editor using `@blocknote/react`. Handle saving with debounce (500ms).\n4. **Database View**: Implement a table component with sorting and filtering. Support adding/deleting rows.\n5. **Relations**: Implement a combobox selector that searches CINQ deals to link a doc to a deal.\n6. **Search**: Implement a search bar that queries the backend tsvector endpoint. Display results in a dropdown with \<15ms debounce.\n7. **Styling**: Tailwind 4 + shadcn/ui. Dark-mode native.\n8. **Optimization**: Dynamically import BlockNote to keep initial bundle small.

## Success Criteria & Verification
 - [ ] `pnpm build` succeeds with 0 TypeScript errors.\n- [ ] Bundle size is ≤ 500 KB gzipped.\n- [ ] Doc editor saves content automatically.\n- [ ] Search debounces correctly and displays results.
