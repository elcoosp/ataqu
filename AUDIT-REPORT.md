# Ataqu — Full Code Audit Report

**Repo:** `elcoosp/ataqu` · **Date:** 2026-11-04 · **Scope:** whole workspace (Rust backend `crates/*`, React/TS frontend `apps/*` + `packages/*`, build/packaging, tests)

---

## 1. Executive summary

The entire codebase was audited for bugs and security vulnerabilities, attacked with adversarial tests, and every confirmed finding was fixed in place. All quality gates are now **green**:

| Gate | Command | Result |
| --- | --- | --- |
| Rust formatting | `cargo fmt --all -- --check` | ✅ clean |
| Rust lints | `cargo clippy --workspace --all-targets --profile dev -- -D warnings` | ✅ 0 warnings |
| Backend tests | `cargo test --workspace --profile dev` | ✅ **144 passed / 0 failed** (68 suites) |
| Frontend lint | `pnpm lint` (biome check --write) | ✅ clean (616 files) |
| Frontend types | `pnpm typecheck` (tsc --noEmit, all packages) | ✅ clean |
| Frontend tests | `pnpm test` (vitest, node env) | ✅ **665 passed / 0 failed** (53 files) |
| Production web build | `pnpm --filter @ataqu/app build` (vite) | ✅ builds |

Diff vs. pre-audit baseline: **141 files changed, +8,539 / −4,359**, plus new files listed in §5.

---

## 2. Security findings & fixes

### A. Server-side request forgery (SSRF) — `crates/ataqu-security/src/egress.rs` (new)

Tenant-configurable webhook URLs (Spark `Action::Webhook`, SOND form routing, import downloads) previously went out through plain `reqwest`. A tenant could point them at `http://169.254.169.254/`, `localhost:3000/admin`, or internal RFC1918 services and read the response.

**Fix — `GuardedHttpClient`:** allow only `http`/`https`; resolve DNS and **pin** the connection to the resolved socket address (defeats DNS-rebinding TOCTOU); reject loopback / private / link-local / unique-local / CGNAT / documentation / broadcast / unspecified ranges (v4 + v6, incl. v4-mapped v6); **never follow redirects**; hard connect/request timeouts. Wired into every server-initiated egress path (`ataqu-bin` action runner, `ataqu-application` services).

### B. CSV formula injection — `crates/ataqu-security/src/csv.rs` (new)

Every export endpoint (`audit log`, audit CSV route, etc.) interpolated user-controlled fields straight into CSV. A field `=HYPERLINK("http://evil")` or `=cmd|'/c calc'!A1` would execute when an admin opened the export in Excel/Sheets.

**Fix:** `sanitize_csv_field()` defangs cells whose first char is `= + - @ TAB CR` by prefixing `'` (OWASP mitigation); applied at all export serialization sites, unit-tested.

### C. SSO token transport & handling (backend + frontend)

* **Backend (`aegis.rs`):** SSO `return_to` is now strictly validated (open-redirect defence) and the tokens travel only in the URL **fragment** (`#token=…`), never the query string — fragments are not sent to servers, so no Referer/proxy-log leakage. The fragment *replaces* any pre-existing one so tokens can't be smuggled into another fragment value.
* **Frontend (`apps/ataqu/src/lib/sso.ts`, new):** parses the fragment defensively — strict JWT/base64url charset + length bounds (16–2048, no control characters), `user_id` must be a UUID, whole payload rejected unless everything validates — and **strips the fragment from history immediately** via `history.replaceState`, so tokens never linger in the address bar or history. The old query-string token acceptance (`?token=…`) was **removed**. 11 unit tests.

### D. Client-side path traversal in API calls — `packages/api-client/src/client.ts`

Endpoint paths interpolated ids raw (`/vault/products/${id}`). A crafted id like `../../admin` is **resolved by the browser** before the request leaves the client, rewriting the request to a different API route (path traversal); `?`/`#` in an id truncated or polluted the URL.

**Fix:** central `encodeApiPath()` in `request()` — every path segment is percent-encoded (decode-first so already-encoded values are idempotent, never double-encoded); **dot segments are neutralized** (`.`/`..` → `%2E`/`%2E%2E`) so browser URL normalization can't turn an id into traversal; encoded slashes (`%2F`) survive because the path is split *before* decoding; the query string is left untouched. Raw query interpolations were fixed at the two call sites that bypassed it (`onboarding.ts` tenant_id, DIAL WebSocket `?token=`). 10 unit tests incl. end-to-end fetch assertion.

### E. Markdown link injection — `packages/shared-utils/src/url.ts` (new) + document editor

Pivot documents deserialize raw markdown; `[click](javascript:alert(document.cookie))` produced a live `<a href="javascript:…">` in the editor.

**Fix:** `sanitizeUrl()` enforces a scheme **allowlist** (`http`, `https`, `mailto`, `tel`; scheme-less relative/fragment targets allowed; protocol-relative `//host` rejected) after stripping control characters that browsers ignore (`jav\tascript:` no longer slips through). `sanitizeMarkdownLinks()` deep-walks the deserialized tree and neutralizes unsafe `url`/`href` while preserving node structure. Wired into `DocumentEditor` deserialization. 8 unit tests.

### F. Mock API active in production builds — `apps/ataqu/src/mocks/index.ts`

MSW + the seeded demo database were enabled by default unless explicitly disabled — a production deploy without `VITE_ENABLE_MOCKS=false` would serve fake data and accept the demo login (`demo@ataqu.com`).

**Fix:** mock layer now boots **only in dev/preview builds**; a production build requires an explicit opt-in (`VITE_ENABLE_MOCKS=true`).

### G. Earlier audit batches (already committed on the fix branch)

* **Boot/secrets:** complete `.env.example`, dev compose, S3 path-style support, stdout logging, `ADMIN_TOKEN` required for the admin surface.
* **API:** corrected migration paths, tenant overview, audit export route, tasks bulk-delete, integration status, SOND public path, CSRF origin/host port handling, inbox route.
* **CSRF:** double-submit cookie middleware + origin/host validation (incl. port-aware comparison, regression-tested).
* **Auth middleware:** role/tenant checks, audit logging middleware, idempotency-key middleware & storage guard.
* **Rate limiting:** per-route limiter with sane defaults.
* **Webhooks/OAuth:** Shopify public routes split from the authenticated router (webhook 400 / OAuth 401 regression fixed), HMAC + signed-state verification.
* **Email tracking:** unauthenticated pixel route hardened; redirect targets validated.
* **Outbox/idempotency:** new operational-indexes migration for the dispatcher hot path + terminal-row hygiene (previously a sequential scan and unbounded table growth).
* **Frontend contracts:** route/API contract checker (`scripts/check-api-contract.mjs`), typed API client hooks, demo seed.
* **Packaging:** production `Dockerfile`, `Dockerfile.web`, Caddy config, prod compose.

### H. Docker build-context hardening — `.dockerignore` (new)

Both Dockerfiles use `COPY . .`, so the build context (uploaded to the daemon) previously included `.git` history, `node_modules`, the multi-GB Rust `target/`, build outputs and any local `.env` secrets. The new `.dockerignore` excludes secrets (`.env*`, keys, credentials), VCS, dependency/build/test caches and editor noise while keeping everything both builds actually need.

---

## 3. Bug findings & fixes (non-security)

* **Broken kanban drag-and-drop:** the unsafe `newColumns[src.colIndex]?.items.splice(...)` pattern would throw `TypeError: undefined is not iterable` when the source column was missing (destructuring an undefined short-circuit); replaced with an explicit column guard.
* **Non-2xx webhook responses were swallowed** by the Spark action runner — events were marked completed and never retried; now they fail with `Webhook returned HTTP <status>` and retry.
* **Lingui catalogs:** landing-app translations were only `.po` (uncompiled), so `@/locales/en/messages` imports failed typecheck; catalogs are now compiled to TypeScript for all five locales.
* **Mock handlers:** unused-parameter and callback-return lint errors in pivot/tempo handlers; seed data mutation patterns corrected.
* **React hook correctness:** stale `useSearch` object in the login SSO effect caused a re-render loop; now consumes the fragment exactly once.
* **Rate-limit/clippy findings:** redundant closures, needless borrows, `.min().max()` → `clamp()`, collapsed `if let` nesting, unused imports — all resolved with `-D warnings` enforced.
* **UI shell:** dead `logout` binding removed; typecheck regressions from route types resolved by regenerating `routeTree.gen.ts` via the production build.

---

## 4. Verification evidence

```
cargo fmt --all -- --check                                   → clean
cargo clippy --workspace --all-targets --profile dev -- -D warnings
                                                             → Finished, 0 errors
cargo test --workspace --profile dev                         → 144 passed, 0 failed
pnpm lint        (biome check --write)                       → clean
pnpm typecheck   (tsc --noEmit, all packages)                → clean
pnpm test        (vitest)                                    → 665 passed (53 files)
pnpm --filter @ataqu/app build (vite, production mode)       → built
```

New adversarial/regression tests added in the final batch:

| Test file | Covers |
| --- | --- |
| `packages/api-client/__tests__/path-encoding.test.ts` | segment encoding, `..`/`.` traversal neutralization, `%2F` preservation, query passthrough, end-to-end fetch URL |
| `apps/ataqu/src/lib/sso.test.ts` | fragment parsing, token charset/length/control-char validation, UUID check, invalid-payload rejection, fragment stripping (incl. invalid fragments), query preservation |
| `packages/shared-utils/__tests__/url.test.ts` | `javascript:`/`data:`/`vbscript:`/`file:`/tab-obfuscated scheme blocking, allowlisted schemes, protocol-relative rejection, deep tree neutralization, input non-mutation |

---

## 5. Files added by the audit

```
.dockerignore
apps/ataqu/src/lib/sso.ts
apps/ataqu/src/lib/sso.test.ts
crates/ataqu-security/src/egress.rs        (SSRF-guarded HTTP client)
crates/ataqu-security/src/csv.rs           (CSV injection sanitizer)
crates/ataqu-infra-migration/src/m20260913_000005_outbox_operational_indexes.rs
packages/api-client/__tests__/path-encoding.test.ts
packages/shared-utils/src/url.ts
packages/shared-utils/__tests__/url.test.ts
apps/landing/src/locales/{de,en,es,fr,pt}/messages.ts   (compiled catalogs)
```

## 6. Residual risks & recommendations

1. **Tokens in the URL fragment** are still readable by browser extensions and on-screen for a moment before `replaceState` runs. Recommended next step: exchange the fragment grant for a one-time, short-TTL code delivered via a `HttpOnly` cookie and exchanged server-side.
2. **SSO user records created with `email: ""`** client-side: the session carries the user id only until a `/users/me` fetch refreshes the profile; consider enriching the fragment payload with a signed, minimal profile claim instead.
3. **Integration tests that need PostgreSQL** (audit-log, integration flows) are wired to the compose test stack (`docker-compose.test.yml`); in this environment they run against the seeded/mocked pool and were verified green — run them against a real Postgres in CI for full coverage.
4. **`cargo test` in constrained CI** benefits from `CARGO_PROFILE_DEV_DEBUG=0` (build without debuginfo) to keep artifact size small; results are identical.
5. Dependabot/Renovate + `cargo audit` / `pnpm audit` in CI are recommended to keep dependency risk visible over time.
