#!/usr/bin/env bash
# commit-each-file.sh
# Bash 3.2 compatible. One conventional commit per changed file.
# Usage:
#   DRY_RUN=1 ./commit-each-file.sh   # preview
#   ./commit-each-file.sh             # commit each file
#
# Optional exact overrides:
#   create commit-messages.tsv with:  <path><TAB><full conventional message>
#   Example:
#   crates/ataqu-security/src/egress.rs	fix(security): add SSRF-guarded HTTP egress client

set -eu

cd "$(git rev-parse --show-toplevel)"
DRY_RUN="${DRY_RUN:-0}"

mapped_message() {
  path="$1"
  [ -f commit-messages.tsv ] || return 1
  awk -F '\t' -v p="$path" '
    $1 == p { print $2; found = 1; exit }
    END { exit found ? 0 : 1 }
  ' commit-messages.tsv
}

scope_for() {
  case "$1" in
    .dockerignore|Dockerfile*|docker-compose*.yml) echo docker ;;
    AUDIT-REPORT.md|*.md) echo docs ;;
    Cargo.toml|Cargo.lock) echo deps ;;
    apps/ataqu/*) echo app ;;
    apps/landing/*) echo landing ;;
    crates/ataqu-api/*) echo api ;;
    crates/ataqu-application/*) echo application ;;
    crates/ataqu-security/*) echo security ;;
    crates/ataqu-bin/*) echo bin ;;
    crates/ataqu-domain-*) echo domain ;;
    crates/ataqu-infra-*) echo infra ;;
    packages/api-client/*) echo api-client ;;
    packages/shared-utils/*) echo shared-utils ;;
    packages/shared-i18n/*) echo i18n ;;
    packages/shared-hooks/*) echo shared-hooks ;;
    packages/shared-stores/*) echo shared-stores ;;
    packages/ui/*) echo ui ;;
    scripts/*) echo scripts ;;
    *) echo repo ;;
  esac
}

type_for() {
  path="$1"
  status="$2"

  case "$path" in
    *__tests__*|*.test.ts|*.test.tsx|*/tests/*) echo test; return ;;
    *.md) echo docs; return ;;
    .github/*|scripts/*) echo ci; return ;;
    Cargo.toml|Cargo.lock|package.json|pnpm-lock.yaml|biome.json|*.config.ts|vite.config.ts|Dockerfile*|.dockerignore|docker-compose*.yml) echo build; return ;;
  esac

  case "$status" in
    A|"??") echo feat ;;
    D*) echo chore ;;
    *) echo fix ;;
  esac
}

verb_for() {
  status="$1"
  case "$status" in
    A|"??") echo add ;;
    D*) echo remove ;;
    *) echo update ;;
  esac
}

special_message() {
  path="$1"
  case "$path" in
    .dockerignore)
      echo "build(docker): add Docker build-context ignore rules" ;;
    AUDIT-REPORT.md)
      echo "docs(audit): add full code audit report" ;;
    Cargo.lock)
      echo "build(deps): refresh Rust lockfile" ;;
    apps/ataqu/index.html)
      echo "fix(app): harden pre-paint theme bootstrap" ;;
    apps/ataqu/package.json)
      echo "chore(app): normalize package manifest formatting" ;;
    apps/ataqu/src/lib/sso.ts)
      echo "fix(auth): parse and strip SSO fragment tokens defensively" ;;
    apps/ataqu/src/lib/sso.test.ts)
      echo "test(auth): cover SSO fragment parsing and stripping" ;;
    apps/ataqu/src/mocks/index.ts)
      echo "fix(mocks): require explicit opt-in in production builds" ;;
    packages/api-client/src/client.ts)
      echo "fix(api-client): encode API path segments and neutralize traversal" ;;
    packages/api-client/__tests__/path-encoding.test.ts)
      echo "test(api-client): cover path encoding and traversal defenses" ;;
    packages/shared-utils/src/url.ts)
      echo "fix(shared-utils): sanitize markdown link URLs" ;;
    packages/shared-utils/__tests__/url.test.ts)
      echo "test(shared-utils): cover URL sanitization" ;;
    crates/ataqu-security/src/egress.rs)
      echo "fix(security): add SSRF-guarded HTTP egress client" ;;
    crates/ataqu-security/src/csv.rs)
      echo "fix(security): add CSV formula injection sanitizer" ;;
    crates/ataqu-api/src/handlers/aegis.rs)
      echo "fix(auth): harden login, SSO redirects, reset and tenant settings" ;;
    crates/ataqu-api/src/handlers/spark.rs)
      echo "fix(spark): scope DLQ access and enforce approval roles" ;;
    crates/ataqu-api/src/handlers/vault.rs)
      echo "fix(vault): validate Shopify OAuth state/webhooks and cap pagination" ;;
    crates/ataqu-api/src/handlers/email_tracking.rs)
      echo "fix(email): require signed tracking pixels and remove contact oracle" ;;
    crates/ataqu-api/src/handlers/pause.rs)
      echo "fix(pause): tenant-scope idempotency keys and validate document uploads" ;;
    crates/ataqu-api/src/handlers/sond.rs)
      echo "fix(sond): use trusted client IP and sanitize CSV exports" ;;
    crates/ataqu-api/src/handlers/onboarding.rs)
      echo "fix(onboarding): derive tenant from auth context, not query string" ;;
    crates/ataqu-api/src/handlers/tempo.rs)
      echo "fix(tempo): rate-limit public bookings" ;;
    crates/ataqu-api/src/middleware/audit.rs)
      echo "fix(audit): redact secrets and preserve oversized request bodies" ;;
    crates/ataqu-api/src/middleware/csrf.rs|crates/ataqu-api/src/middleware/csrf_double_submit.rs)
      echo "fix(csrf): tighten origin checks and exact webhook exemptions" ;;
    crates/ataqu-api/src/middleware/idempotency.rs)
      echo "fix(idempotency): tenant/user/route-scope the idempotency cache" ;;
    crates/ataqu-api/src/middleware/rate_limit.rs)
      echo "fix(rate-limit): add endpoint-specific strict budgets" ;;
    crates/ataqu-api/src/serializers/mod.rs)
      echo "fix(api): re-export CSV sanitizer for export endpoints" ;;
    crates/ataqu-application/src/spark_service.rs)
      echo "fix(spark): require webhook secrets and enforce approval roles" ;;
    crates/ataqu-application/src/cinq_service.rs)
      echo "fix(cinq): revalidate tenant references and emit DealWon once" ;;
    crates/ataqu-application/src/dial_service.rs)
      echo "fix(dial): verify DM recipients and thread participation" ;;
    crates/ataqu-application/src/sond_service.rs)
      echo "fix(sond): preserve question ids and include webhook routing fields" ;;
    crates/ataqu-application/src/tempo_service.rs)
      echo "fix(tempo): validate booking duration, future start and reschedule overlaps" ;;
    crates/ataqu-application/src/vault_service.rs)
      echo "fix(vault): reject non-positive reservations and prevent overflow" ;;
    crates/ataqu-application/src/gdpr/saga_runner.rs)
      echo "fix(gdpr): lock saga rows, mark terminal failures and avoid constant anonymized emails" ;;
    crates/ataqu-infra-outbox/src/dispatcher.rs)
      echo "fix(outbox): isolate handler panics and propagate failures for retry/DLQ" ;;
    crates/ataqu-bin/src/event_registry.rs)
      echo "fix(outbox): propagate handler errors and dead-letter unhandled events" ;;
    crates/ataqu-bin/src/main.rs)
      echo "fix(bin): harden JWT secret length and route webhook egress through SSRF guard" ;;
    crates/ataqu-infra-migration/src/m20260913_000005_outbox_operational_indexes.rs)
      echo "fix(outbox): add operational indexes for dispatcher and pruning" ;;
    packages/ui/src/components/kanban-board.tsx)
      echo "fix(ui): guard missing source column in kanban drag-and-drop" ;;
    apps/ataqu/src/apps/pivot/components/document-editor.tsx)
      echo "fix(pivot): sanitize deserialized markdown links" ;;
    apps/ataqu/src/routes/login.tsx)
      echo "fix(auth): consume SSO fragment once and strip it from history" ;;
    apps/ataqu/src/apps/dial/hooks/use-dial-websocket.ts)
      echo "fix(dial): percent-encode WebSocket token query parameter" ;;
    *)
      return 1 ;;
  esac
}

message_for() {
  path="$1"
  status="$2"

  if mapped_message "$path"; then
    return 0
  fi

  case "$status" in
    D*) ;; # do not use "add/fix" special messages for deletions
    *) special_message "$path" && return 0 ;;
  esac

  scope="$(scope_for "$path")"
  type="$(type_for "$path" "$status")"
  verb="$(verb_for "$status")"
  base="${path##*/}"

  case "$type" in
    test)  echo "test($scope): $verb tests for $base" ;;
    docs)  echo "docs($scope): $verb $base" ;;
    build) echo "build($scope): $verb $base" ;;
    ci)    echo "ci($scope): $verb $base" ;;
    feat)  echo "feat($scope): $verb $base" ;;
    chore) echo "chore($scope): $verb $base" ;;
    *)     echo "fix($scope): $verb $base" ;;
  esac
}

# Disable rename detection so a rename becomes one delete + one add
# (still one commit per path, and simpler in Bash 3.2).
while IFS= read -r -d '' entry; do
  status="${entry:0:2}"
  path="${entry:3}"

  [ -n "$path" ] || continue

  msg="$(message_for "$path" "$status")"

  if [ "$DRY_RUN" = "1" ]; then
    printf '%s\t%s\n' "$path" "$msg"
    continue
  fi

  git add -A -- "$path"

  # Skip if this path has no staged change.
  if git diff --cached --quiet -- "$path"; then
    continue
  fi

  git commit -m "$msg" -- "$path"
done < <(git -c status.renames=false status --porcelain=v1 -z --untracked-files=all)

echo "Done."
