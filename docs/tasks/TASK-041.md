# TASK-041: App Service: AEGIS (Auth Orchestration)

## Execution Boundaries
 - `crates/ataqu-application/src/aegis_service.rs`\n- `crates/ataqu-domain-aegis/src/*` (READ-ONLY)\n- `crates/ataqu-infra-repositories/src/aegis_repo.rs` (READ-ONLY)

## Step-by-Step Implementation Details
 1. Implement `AegisService::new` taking `Arc<Pools>` and `Arc<IdempotencyGuard>`.\n2. Implement `create_user(&self, cmd: CreateUserCommand)`.\n3. Orchestrate the exact idempotency flow (ADR-017): Acquire guard -> BEGIN txn -> Inject SystemIdGenerator/SystemClock -> Call domain pure function -> Persist via `AegisUserRepository` -> Append to `core.outbox` -> Update idempotency record -> COMMIT.\n4. Implement `authenticate` and `setup_mfa` following the same flow.\n5. Handle transient errors (return 503) vs validation errors (cache as 409 Conflict).

## Success Criteria & Verification
 - [ ] Service compiles and uses the injected pure domain functions.\n- [ ] Uses a single `sea_orm::DatabaseTransaction` for all DB operations.\n- [ ] Appends to `core.outbox` using `pg_notify`.
