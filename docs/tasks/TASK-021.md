# TASK-021: Repo + Migration: AEGIS

## Execution Boundaries (STRICT)
 crates/ataqu-infra-migration/src/m_aegis.rs\n- crates/ataqu-infra-repositories/src/aegis_repo.rs

## Step-by-Step Implementation Details
 1. Create migration: `core.users` table (id, tenant_id, email, password_hash, mfa_secret) with RLS.\n2. Implement `AegisUserRepository` using SeaORM.\n3. Implement mappers: `Model -> domain::User` and `domain::User -> ActiveModel`.\n4. Implement `AuthRepository` trait for this repo.

## Success Criteria & Verification
 - [ ] Migration runs with RLS.\n- [ ] Repo implements domain trait.\n- [ ] Mappers compile.
