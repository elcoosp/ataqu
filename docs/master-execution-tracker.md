Here is the master tracking document. Save this as `docs/MASTER_TRACKER.md`. 

It is structured by Phases (which map to your 4 weeks). It tells you exactly when to spawn agents, when to merge their worktrees back to `main`, and what dependencies must be satisfied before moving to the next step.

```markdown
# 🏗️ ATAQU MLP - MASTER EXECUTION TRACKER

**Objective:** Ship a fully polished MLP in 4 weeks using 10 parallel AI agents.
**Rule of Thumb:** Never start a Phase until the previous Phase's `[MERGE TO MAIN]` step is complete. Agents must strictly only touch files listed in their `Execution Boundaries`.

---

## WEEK 1: Foundation & Domain Logic

### Phase 0: Workspace Skeleton (Sequential - 1 Agent)
- [ ] **TASK-001:** Monorepo Skeleton & Empty Modules
- [ ] **[MERGE TO MAIN]:** Merge Task 001. This establishes the empty `mod.rs` files to prevent future merge conflicts.

### Phase 1: Infrastructure (Parallel - 9 Agents)
- [ ] **START PARALLEL:** Dispatch Tasks 002 to 010 to 9 agents.
- [ ] **TASK-002:** ataqu-kernel (Core Types)
- [ ] **TASK-003:** ataqu-security (PII & Crypto)
- [ ] **TASK-004:** ataqu-contracts (AEGIS & CINQ Events)
- [ ] **TASK-005:** ataqu-contracts (DIAL & VAULT Events)
- [ ] **TASK-006:** ataqu-infra-migration (Core Schema & Outbox)
- [ ] **TASK-007:** ataqu-infra-pools (Connection Setup)
- [ ] **TASK-008:** ataqu-infra-idempotency (Guard & Moka)
- [ ] **TASK-009:** ataqu-infra-outbox (Dispatcher)
- [ ] **TASK-010:** ataqu-infra-repositories (Generic Batch Helper)
- [ ] **[MERGE TO MAIN]:** Merge all Phase 1 tasks. Resolve any minor `Cargo.toml` dependency conflicts.

### Phase 2: Domain Logic (Parallel - 10 Agents)
- [ ] **START PARALLEL:** Dispatch Tasks 011 to 020 to 10 agents.
- [ ] **TASK-011:** Domain: AEGIS Pure Logic
- [ ] **TASK-012:** Domain: CINQ Pure Logic
- [ ] **TASK-013:** Domain: DIAL Pure Logic
- [ ] **TASK-014:** Domain: PIVOT Pure Logic
- [ ] **TASK-015:** Domain: SPARK Pure Logic
- [ ] **TASK-016:** Domain: TEMPO Pure Logic
- [ ] **TASK-017:** Domain: SOND Pure Logic
- [ ] **TASK-018:** Domain: VAULT Pure Logic
- [ ] **TASK-019:** Domain: PAUSE Pure Logic
- [ ] **TASK-020:** Domain: VISTA Pure Logic
- [ ] **[MERGE TO MAIN]:** Merge all Phase 2 tasks. Verify `cargo check --workspace` passes.

---

## WEEK 2: Repositories & Services

### Phase 3: Migrations & Repositories (Parallel - 10 Agents)
*Prerequisite: Phase 2 domain traits must be merged to main.*
- [ ] **START PARALLEL:** Dispatch Tasks 021 to 030 to 10 agents.
- [ ] **TASK-021:** Repo + Migration: AEGIS
- [ ] **TASK-022:** Repo + Migration: CINQ
- [ ] **TASK-023:** Repo + Migration: DIAL
- [ ] **TASK-024:** Repo + Migration: PIVOT
- [ ] **TASK-025:** Repo + Migration: SPARK
- [ ] **TASK-026:** Repo + Migration: TEMPO
- [ ] **TASK-027:** Repo + Migration: SOND
- [ ] **TASK-028:** Repo + Migration: VAULT
- [ ] **TASK-029:** Repo + Migration: PAUSE
- [ ] **TASK-030:** Repo + Migration: VISTA
- [ ] **[MERGE TO MAIN]:** Merge all Phase 3 tasks. Run `cargo test -p ataqu-infra-migration` to verify DB schema.

### Phase 4: Application Services (Parallel - 10 Agents)
*Prerequisite: Phase 3 repository implementations must be merged to main.*
- [ ] **START PARALLEL:** Dispatch Tasks 041 to 050 to 10 agents.
- [ ] **TASK-041:** App Service: AEGIS
- [ ] **TASK-042:** App Service: CINQ
- [ ] **TASK-043:** App Service: DIAL
- [ ] **TASK-044:** App Service: PIVOT
- [ ] **TASK-045:** App Service: SPARK
- [ ] **TASK-046:** App Service: TEMPO
- [ ] **TASK-047:** App Service: SOND
- [ ] **TASK-048:** App Service: VAULT
- [ ] **TASK-049:** App Service: PAUSE
- [ ] **TASK-050:** App Service: VISTA
- [ ] **[MERGE TO MAIN]:** Merge all Phase 4 tasks. Verify `cargo check --workspace` passes.

---

## WEEK 3: API & Frontends

### Phase 5: API Handlers (Parallel - 10 Agents)
*Prerequisite: Phase 4 application services must be merged to main so `dispatch.sh` can inject them.*
- [ ] **START PARALLEL:** Dispatch Tasks 051 to 060 to 10 agents.
- [ ] **TASK-051:** API Handler: AEGIS
- [ ] **TASK-052:** API Handler: CINQ
- [ ] **TASK-053:** API Handler: DIAL
- [ ] **TASK-054:** API Handler: PIVOT
- [ ] **TASK-055:** API Handler: SPARK
- [ ] **TASK-056:** API Handler: TEMPO
- [ ] **TASK-057:** API Handler: SOND
- [ ] **TASK-058:** API Handler: VAULT
- [ ] **TASK-059:** API Handler: PAUSE
- [ ] **TASK-060:** API Handler: VISTA
- [ ] **[MERGE TO MAIN]:** Merge all Phase 5 tasks. The entire backend is now feature-complete.

### Phase 6: Frontend SPAs (Parallel - 10 Agents)
*Prerequisite: Phase 5 API handlers must be merged to main so `dispatch.sh` can inject them into frontend prompts.*
- [ ] **START PARALLEL:** Dispatch Tasks 031 to 040 to 10 agents.
- [ ] **TASK-031:** Frontend SPA: AEGIS
- [ ] **TASK-032:** Frontend SPA: CINQ
- [ ] **TASK-033:** Frontend SPA: DIAL
- [ ] **TASK-034:** Frontend SPA: PIVOT
- [ ] **TASK-035:** Frontend SPA: SPARK
- [ ] **TASK-036:** Frontend SPA: TEMPO
- [ ] **TASK-037:** Frontend SPA: SOND
- [ ] **TASK-038:** Frontend SPA: VAULT
- [ ] **TASK-039:** Frontend SPA: PAUSE
- [ ] **TASK-040:** Frontend SPA: VISTA
- [ ] **[MERGE TO MAIN]:** Merge all Phase 6 tasks. Run `pnpm build` to verify all apps compile.

---

## WEEK 4: Integration, Testing & Launch

### Phase 7: Binary & Admin (Parallel - 4 Agents)
*Prerequisite: All backend (Phases 1-5) merged.*
- [ ] **START PARALLEL:** Dispatch Tasks 061 to 064 to 4 agents.
- [ ] **TASK-061:** Binary: Tokio Runtime & Host Routing
- [ ] **TASK-062:** Binary: Background Tasks Wiring
- [ ] **TASK-063:** Domain: GDPR Saga & Registry
- [ ] **TASK-064:** Admin: UDS CLI
- [ ] **[MERGE TO MAIN]:** Merge all Phase 7 tasks. Verify `./target/release/ataqu-bin` boots successfully.

### Phase 8: Testing, Optimization & Docs (Parallel - 6 Agents)
*Prerequisite: Binary must boot and frontend must build.*
- [ ] **START PARALLEL:** Dispatch Tasks 065 to 070 to 6 agents.
- [ ] **TASK-065:** Tests: Backend Integration (Testcontainers)
- [ ] **TASK-066:** Tests: Frontend E2E (Playwright)
- [ ] **TASK-067:** Tests: k6 Load Testing
- [ ] **TASK-068:** CI: Pipeline & Lints (GitHub Actions)
- [ ] **TASK-069:** Optimization: Frontend Bundles (Vite manualChunks)
- [ ] **TASK-070:** Docs: Architecture & Runbooks
- [ ] **[MERGE TO MAIN]:** Merge all Phase 8 tasks.

### FINAL VERIFICATION (The Ship Gate)
- [ ] `cargo test --workspace` passes 100%.
- [ ] `pnpm test` passes 100%.
- [ ] All 10 frontend apps build ≤ 500KB gzipped.
- [ ] GitHub Actions CI pipeline is green on `main`.
- [ ] k6 load test p99 latency < 200ms.
- [ ] **🚀 SHIP IT!**
```

### How to use this:
1. Keep this file open in your editor.
2. When you dispatch a wave of tasks, check the `START PARALLEL` box.
3. As agents report back with "Task Complete", check their individual boxes.
4. Once all 10 boxes in a phase are checked, run your merge process, resolve any `Cargo.toml` conflicts, and check the `[MERGE TO MAIN]` box.
5. Proceed to the next Phase.
