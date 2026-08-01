# TASK-011: Domain: AEGIS Pure Logic

## Execution Boundaries (STRICT)
 crates/ataqu-domain-aegis/src/*

## Step-by-Step Implementation Details
 1. Implement pure functions: `create_user(cmd, id_gen, clock)`, `authenticate()`, `setup_mfa()`.\n2. Functions must take `&impl IdGenerator` and `&impl Clock` and return Events.\n3. Define `AuthRepository` trait (find_by_email, save_user).\n4. NO I/O, NO async, NO system time/RNG reads (ADR-017).

## Success Criteria & Verification
 - [ ] Functions compile and return correct Events.\n- [ ] Crate has zero dependencies on tokio, sea-orm, or sqlx.
