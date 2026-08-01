# TASK-018: Domain: VAULT Pure Logic

## Execution Boundaries (STRICT)
 crates/ataqu-domain-vault/src/*

## Step-by-Step Implementation Details
 1. Implement pure functions for products, variants, stock movements, reservations.\n2. Define `InventoryRepository` trait.\n3. Implement overflow protection logic (CHECK stock_quantity >= 0, ADR-023).\n4. NO I/O or async.

## Success Criteria & Verification
 - [ ] Functions compile.\n- [ ] Stock validation prevents negative quantities.
