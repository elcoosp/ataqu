# TASK-018: Domain: VAULT Pure Logic

## Execution Boundaries
 - `crates/ataqu-domain-vault/src/*`

## Step-by-Step Implementation Details
 1. Implement pure functions for products, variants, stock movements, reservations.
2. Define `InventoryRepository` trait.
3. Implement overflow protection logic (CHECK stock_quantity >= 0, ADR-023).
4. NO I/O or async.

## Success Criteria & Verification
 - [ ] Functions compile.
- [ ] Stock validation prevents negative quantities.
