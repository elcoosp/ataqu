# TASK-035: Frontend SPA: SPARK (Automation)

## Execution Boundaries
 - `apps/spark/`

## Step-by-Step Implementation Details
 1. **Context Mapping**: Read injected backend files (`spark_service.rs`, `handlers/spark.rs`).\n2. **Routing**: TanStack Router for `/workflows/:id`.\n3. **Workflow Builder**: Implement a visual canvas using React Flow. Nodes represent Triggers, Actions, and Conditions.\n4. **Node Configuration**: Side panel to configure selected nodes. Triggers: dropdown of available outbox events (e.g., 'CINQ Deal Won'). Actions: dropdown of available commands.\n5. **Save/Execute**: Save workflow via API mutation. Include a 'Test Run' button.\n6. **Styling**: Tailwind 4 + shadcn/ui. Dark-mode native.\n7. **Idempotency**: Save and Test Run must include `Idempotency-Key`.

## Success Criteria & Verification
 - [ ] `pnpm build` succeeds with 0 TypeScript errors.\n- [ ] Bundle size is ≤ 500 KB gzipped.\n- [ ] React Flow canvas allows adding and connecting nodes.\n- [ ] Workflow saves to backend without errors.
