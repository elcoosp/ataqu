# TASK-038: Frontend SPA: VAULT (Inventory)

## Execution Boundaries
 - `apps/vault/`

## Step-by-Step Implementation Details
 1. **Context Mapping**: Read injected backend files (`vault_service.rs`, `handlers/vault.rs`).\n2. **Routing**: TanStack Router for `/products`, `/movements`.\n3. **Product Catalog**: Grid/List view of products with variants. Display current stock quantity.\n4. **Stock Adjustment**: Modal or inline form to adjust stock (add/remove). Use optimistic UI to update the quantity instantly before the server responds.\n5. **Movement History**: TanStack Table showing the audit trail of stock movements.\n6. **Alerts**: UI badge or toast notification if a product hits the low-stock threshold (fetched via query).\n7. **Styling**: Tailwind 4 + shadcn/ui. Dark-mode native.\n8. **Idempotency**: Stock adjustments must include `Idempotency-Key`.

## Success Criteria & Verification
 - [ ] `pnpm build` succeeds with 0 TypeScript errors.\n- [ ] Bundle size is ≤ 500 KB gzipped.\n- [ ] Stock updates render optimistically.\n- [ ] Movement history is paginated.
