# 🧪 ATAQU TESTING STRATEGY — QA Philosophy & Pyramid

**Version:** 1.0
**Date:** 2026-08-08
**Target:** Developers and AI agents

> This document defines the testing philosophy, the test pyramid, and the specific coverage requirements for the Ataqu codebase. It ensures that every layer—from pure domain logic to end‑to‑end user flows—is rigorously verified.

---

## 1. Testing Philosophy

- **Fail Fast:** Tests must run quickly (under 5 minutes for the full suite) and provide immediate feedback.
- **Deterministic:** Tests must be repeatable and not rely on external state (use Testcontainers for DB, mocks for externals).
- **Coverage as a Guide:** Aim for 80%+ overall coverage, but focus on critical paths (domain logic, outbox, idempotency, RLS).
- **CI Gating:** All tests must pass before merging to `main`.

---

## 2. The Test Pyramid

| Level | Scope | Tools | Run Frequency | Target Coverage |
|-------|-------|-------|---------------|-----------------|
| **Unit Tests** | Pure domain logic (no I/O) | `cargo test` (Rust) / `vitest` (TS) | On every commit | 100% of domain logic |
| **Integration Tests** | Repository implementations, SeaORM, outbox, RLS | `cargo test` with Testcontainers | On every PR | All critical DB operations |
| **E2E Tests** | User journeys across 10 apps | Playwright | On PR to `main` | Critical paths (login, CRUD, integrations) |
| **Load Tests** | Performance under 200 concurrent users | k6 | Weekly (or before release) | p99 < 200ms, no OOM |

---

## 3. Unit Tests (Domain Crates)

**Goal:** Verify pure functions with injected `IdGenerator` and `Clock` without any I/O.

**Rules:**
- Every domain crate (`ataqu-domain-*`) must have unit tests for all public functions.
- Use `MockIdGenerator` and `MockClock` for deterministic IDs and timestamps.
- Test validation logic, error handling, and edge cases (e.g., negative stock, invalid email).

**Example (Rust):**
```rust
#[cfg(test)]
mod tests {
    use super::*;
    use ataqu_kernel::MockIdGenerator;

    #[test]
    fn create_contact_returns_event() {
        let id_gen = MockIdGenerator::new();
        let clock = MockClock::new();
        let cmd = CreateContactCommand { name: "Alice".into(), email: "alice@example.com".into() };
        let event = create_contact(cmd, &id_gen, &clock);
        assert_eq!(event.name, "Alice");
    }
}
```

**Run:** `cargo test -p ataqu-domain-cinq`

---

## 4. Integration Tests (Infrastructure & Repositories)

**Goal:** Verify that repositories correctly interact with PostgreSQL, enforce RLS, and handle transactions.

**Tools:** `testcontainers` to spin up a PostgreSQL 18.4 container, SeaORM for queries.

**Rules:**
- Each repository should have an integration test for its main methods (CRUD, batch insert, outbox dispatch).
- Test RLS policies by attempting cross‑tenant inserts and expecting `permission denied`.
- Test idempotency by sending the same command twice and verifying identical responses.

**Example:**
```rust
#[tokio::test]
async fn test_cinq_repository_rls() {
    let _container = run_postgres_container().await;
    let repo = CinqRepository::new(pool);
    // Attempt insert with wrong tenant_id
    let result = repo.create_contact(/* ... */).await;
    assert!(result.is_err());
}
```

**Run:** `cargo test --workspace -- --ignored integration` (or include them by default if DB is available).

---

## 5. End‑to‑End Tests (Playwright)

**Goal:** Validate complete user journeys across the 10 SPAs.

**Scenarios:**
1. **Login & Onboarding:** SSO via Google/Microsoft, first entity creation.
2. **CINQ Pipeline:** Create a deal, drag it to "Won", verify DIAL channel created.
3. **SOND Form:** Create a form, submit it, verify CINQ lead created.
4. **VAULT Stock:** Adjust stock, verify atomic update.
5. **SPARK Workflow:** Build a workflow, run it, verify DLQ on failure.
6. **VISTA Dashboard:** Add a widget, drill‑down into a chart.

**Run:** `pnpm test:e2e`

**CI Integration:** E2E tests run on every PR to `main`. They require a running backend and a seeded database.

---

## 6. Load Tests (k6)

**Goal:** Ensure the system can handle 200 concurrent users with p99 latency < 200ms.

**Scenarios:**
- **Authentication:** 200 users logging in simultaneously.
- **CRM Operations:** 100 concurrent deal updates.
- **Chat:** 50 concurrent WebSocket connections with message sends.
- **Outbox:** 1000 events dispatched per second.

**Run:** `k6 run scripts/k6/loadtest.js`

**Thresholds:** p99 < 200ms, error rate < 0.1%, no OOM, connection pool < 35.

---

## 7. CI Gating (GitHub Actions)

The CI pipeline (`ci.yml`) runs:

| Step | Command | Trigger |
|------|---------|---------|
| Lint & Format | `cargo fmt --check`, `cargo clippy -- -D warnings` | PR |
| Rust Unit Tests | `cargo test --workspace --lib` | PR |
| Rust Integration Tests | `cargo test --workspace --test integration` | PR (if DB container available) |
| Frontend Type Check | `pnpm tsc --noEmit` | PR |
| Frontend Tests | `pnpm test` | PR |
| E2E Tests | `pnpm test:e2e` | PR to `main` |
| Build | `cargo build --release`, `pnpm build` | PR |
| Load Tests (optional) | `k6 run` | Manual / Weekly |

**If any step fails, the PR is blocked.**

---

## 8. Coverage Reporting

We use `cargo tarpaulin` for Rust coverage and `vitest --coverage` for frontend.

- **Rust:** `cargo tarpaulin --workspace --out Html`
- **Frontend:** `pnpm test --coverage`

**Targets:**
- Domain crates: > 95%
- Application crates: > 80%
- API handlers: > 70%
- Frontend components: > 80%

---

## 9. Manual Testing Checklist (Before Release)

Before cutting a release, run these manual smoke tests:
- [ ] SSO login works for Google and Microsoft.
- [ ] Export all data as CSV/JSON.
- [ ] Cancel subscription (refund + data export).
- [ ] Create a CINQ deal and see it in VISTA.
- [ ] Create a SOND form and submit it.
- [ ] Enable Shopify sync and see products imported.
- [ ] Drill‑down on a VISTA chart.

---

**Document maintained by the Architecture Team. Update when adding new features.**
