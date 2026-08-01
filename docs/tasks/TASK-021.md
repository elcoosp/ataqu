# TASK-021: Repo + Migration: AEGIS

## Execution Boundaries
 - `crates/ataqu-infra-migration/src/m_aegis.rs`
- `crates/ataqu-infra-repositories/src/aegis_repo.rs`

## Step-by-Step Implementation Details
 1. Create migration: `core.users` table (id, tenant_id, email, password_hash, mfa_secret) with RLS.
2. Implement `AegisUserRepository` using SeaORM.
3. Implement mappers: `Model -> domain::User` and `domain::User -> ActiveModel`.
4. Implement `AuthRepository` trait for this repo.

## Success Criteria & Verification
 - [ ] Migration runs with RLS.
- [ ] Repo implements domain trait.
- [ ] Mappers compile.
