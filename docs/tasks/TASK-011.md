# TASK-011: Domain: AEGIS Pure Logic

## Execution Boundaries
 - `crates/ataqu-domain-aegis/src/*`

## Step-by-Step Implementation Details
 1. Implement pure functions: `create_user(cmd, id_gen, clock)`, `authenticate()`, `setup_mfa()`.
2. Functions must take `&impl IdGenerator` and `&impl Clock` and return Events.
3. Define `AuthRepository` trait (find_by_email, save_user).
4. NO I/O, NO async, NO system time/RNG reads (ADR-017).

## Success Criteria & Verification
 - [ ] Functions compile and return correct Events.
- [ ] Crate has zero dependencies on tokio, sea-orm, or sqlx.
