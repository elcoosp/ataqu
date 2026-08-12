#!/usr/bin/env bash
# dispatch.sh - Prepares the full agent prompt (protocol + tech-stack + project + context + task)
# Usage: ./scripts/dispatch.sh TASK-001

set -euo pipefail

# ---------- Find repository root using git ----------
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)")"
if [ ! -d "$REPO_ROOT/.git" ]; then
  echo "WARNING: Not inside a git repository. Using script location as root."
  REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fi

PROTOCOL_FILE="$REPO_ROOT/docs/agent-protocol.md"
TECH_STACK_FILE="$REPO_ROOT/docs/tech-stack.md"
PROJECT_MD_FILE="$REPO_ROOT/docs/project.md"
TASKS_DIR="$REPO_ROOT/docs/tasks"

if [ ! -f "$PROTOCOL_FILE" ]; then
  echo "ERROR: Protocol file not found at $PROTOCOL_FILE"
  exit 1
fi
if [ ! -f "$TECH_STACK_FILE" ]; then
  echo "ERROR: Tech-stack file not found at $TECH_STACK_FILE"
  exit 1
fi
if [ ! -f "$PROJECT_MD_FILE" ]; then
  echo "WARNING: project.md not found at $PROJECT_MD_FILE – continuing without it"
fi

TASK_ID="${1:-}"
if [ -z "$TASK_ID" ]; then
  echo "ERROR: Usage: ./scripts/dispatch.sh TASK-XXX"
  exit 1
fi

TASK_FILE="${TASKS_DIR}/${TASK_ID}.md"
if [ ! -f "$TASK_FILE" ]; then
  echo "ERROR: Task not found: $TASK_FILE"
  exit 1
fi

# ---------- Extract Execution Boundaries ----------
BOUNDARIES=$(awk '/^## Execution Boundaries/{f=1; next} /^## /{f=0} f' "$TASK_FILE" | grep -E '^[[:space:]]*[-*][[:space:]]+' | sed -E 's/^[[:space:]]*[-*][[:space:]]+//' | sed -E 's/^`//' | sed -E 's/`.*$//' | sed -E 's/[[:space:]]*$//' || true)

if [ -z "$BOUNDARIES" ]; then
  echo "ERROR: No 'Execution Boundaries' section found in task file."
  echo "Ensure the section exists and uses the format: - \`path/to/file\`"
  exit 1
fi

CRATES=$(echo "$BOUNDARIES" | grep '^crates/' | cut -d'/' -f2 | sort -u || true)
APPS=$(echo "$BOUNDARIES" | grep '^apps/' | cut -d'/' -f2 | sort -u || true)

# ---------- Build Codebase Context ----------
CONTEXT=""

# 1. Inject files from boundaries
for path in $BOUNDARIES; do
  if [[ "$path" == *" "* ]]; then
    continue
  fi

  full_path="$REPO_ROOT/$path"
  if [ -f "$full_path" ]; then
    LANG=$(echo "$path" | grep -q '\.rs$' && echo "rust" || echo "typescript")
    CONTEXT+="
### File: $path
\`\`\`$LANG
// File: $path
 $(cat "$full_path")
\`\`\`
"
  elif [ -d "$full_path" ]; then
    file_list=$(find "$full_path" -type f \( -name '*.rs' -o -name '*.ts' -o -name '*.tsx' \) 2>/dev/null | sed "s|^$REPO_ROOT/||" | head -50 || true)
    if [ -n "$file_list" ]; then
      CONTEXT+="
### Directory: $path
Files found:
\`\`\`
 $file_list
\`\`\`
"
    fi
  fi
done

# 2. Inject dependencies (Cargo.toml) for affected crates
if [ -n "$CRATES" ]; then
  for crate in $CRATES; do
    cargo_file="$REPO_ROOT/crates/$crate/Cargo.toml"
    if [ -f "$cargo_file" ]; then
      CONTEXT+="
### Dependencies for crate: $crate
\`\`\`toml
# File: crates/$crate/Cargo.toml
 $(cat "$cargo_file")
\`\`\`
"
    fi
  done
fi

# 3. Inject package.json for frontend apps
if [ -n "$APPS" ]; then
  for app in $APPS; do
    pkg_file="$REPO_ROOT/apps/$app/package.json"
    if [ -f "$pkg_file" ]; then
      CONTEXT+="
### Dependencies for frontend app: $app
\`\`\`json
// File: apps/$app/package.json
 $(cat "$pkg_file")
\`\`\`
"
    fi
  done
fi

# 4. INJECT BACKEND CODE FOR FRONTEND TASKS (and for TASK-000 specifically)
# Determine if this is a frontend task (has APPS) or the foundation task TASK-000
if [ -n "$APPS" ] || [ "$TASK_ID" = "TASK-000" ]; then
  # Always include contracts for any frontend or foundation task
  CONTRACTS_CRATE="$REPO_ROOT/crates/ataqu-contracts"
  if [ -d "$CONTRACTS_CRATE" ]; then
    CONTEXT+="
### Backend contracts (ataqu-contracts) – all events and commands
\`\`\`
 $(find "$CONTRACTS_CRATE/src" -name '*.rs' -exec echo "// File: {}" \; -exec cat {} \; 2>/dev/null || true)
\`\`\`
"
  fi

  # Include kernel types (needed for API client generation)
  KERNEL_CRATE="$REPO_ROOT/crates/ataqu-kernel"
  if [ -d "$KERNEL_CRATE" ]; then
    CONTEXT+="
### Backend kernel (ataqu-kernel) – core types like TenantId
\`\`\`
 $(find "$KERNEL_CRATE/src" -name '*.rs' -exec echo "// File: {}" \; -exec cat {} \; 2>/dev/null || true)
\`\`\`
"
  fi

  # If TASK-000, include all API handlers and services (full backend API surface)
  if [ "$TASK_ID" = "TASK-000" ]; then
    # All API handlers (for API client generation)
    HANDLERS_DIR="$REPO_ROOT/crates/ataqu-api/src/handlers"
    if [ -d "$HANDLERS_DIR" ]; then
      CONTEXT+="
### All API handlers (ataqu-api/src/handlers) – for generating API client
\`\`\`
 $(find "$HANDLERS_DIR" -name '*.rs' -exec echo "// File: {}" \; -exec cat {} \; 2>/dev/null || true)
\`\`\`
"
    fi

    # All application services (for understanding orchestration)
    APP_SERVICES_DIR="$REPO_ROOT/crates/ataqu-application/src"
    if [ -d "$APP_SERVICES_DIR" ]; then
      CONTEXT+="
### All application services (ataqu-application/src) – orchestration logic
\`\`\`
 $(find "$APP_SERVICES_DIR" -name '*.rs' ! -name 'lib.rs' -exec echo "// File: {}" \; -exec cat {} \; 2>/dev/null || true)
\`\`\`
"
    fi

    # Also include the main API lib for router/state
    API_LIB="$REPO_ROOT/crates/ataqu-api/src/lib.rs"
    if [ -f "$API_LIB" ]; then
      CONTEXT+="
### API library (ataqu-api/src/lib.rs) – router and state
\`\`\`rust
// File: crates/ataqu-api/src/lib.rs
 $(cat "$API_LIB")
\`\`\`
"
    fi

    # Include any additional domain crates (to understand all events)
    DOMAIN_DIR="$REPO_ROOT/crates"
    for domain in $(find "$DOMAIN_DIR" -maxdepth 1 -type d -name 'ataqu-domain-*' | sed 's|.*/||' | sort); do
      if [ -d "$DOMAIN_DIR/$domain" ]; then
        CONTEXT+="
### Domain crate: $domain
\`\`\`
 $(find "$DOMAIN_DIR/$domain/src" -name '*.rs' -exec echo "// File: {}" \; -exec cat {} \; 2>/dev/null || true)
\`\`\`
"
      fi
    done
  else
    # For other frontend tasks, only inject the specific domain, service, handler for each app
    for app in $APPS; do
      domain_crate="ataqu-domain-$app"
      domain_path="$REPO_ROOT/crates/$domain_crate"
      if [ -d "$domain_path" ]; then
        CONTEXT+="
### Backend domain crate: $domain_crate
\`\`\`
 $(find "$domain_path/src" -name '*.rs' -exec echo "// File: {}" \; -exec cat {} \; 2>/dev/null || true)
\`\`\`
"
      fi

      service_file="$REPO_ROOT/crates/ataqu-application/src/${app}_service.rs"
      if [ -f "$service_file" ]; then
        CONTEXT+="
### Backend application service: ataqu-application/src/${app}_service.rs
\`\`\`rust
// File: crates/ataqu-application/src/${app}_service.rs
 $(cat "$service_file")
\`\`\`
"
      fi

      handler_file="$REPO_ROOT/crates/ataqu-api/src/handlers/${app}.rs"
      if [ -f "$handler_file" ]; then
        CONTEXT+="
### Backend API handler: ataqu-api/src/handlers/${app}.rs
\`\`\`rust
// File: crates/ataqu-api/src/handlers/${app}.rs
 $(cat "$handler_file")
\`\`\`
"
      fi
    done
  fi
fi

# 5. Inject design/docs for frontend foundation tasks (TASK-000)
if [ "$TASK_ID" = "TASK-000" ]; then
  DESIGN_DOCS=(
    "docs/ui-ux-master-doc.md"
    "docs/visual-identity-guidelines.md"
    "docs/brand-book.md"
    "docs/ux-writing-style-guide.md"
    "docs/feature-spec.md"
  )
  for doc in "${DESIGN_DOCS[@]}"; do
    if [ -f "$REPO_ROOT/$doc" ]; then
      CONTEXT+="
### Design document: $doc
\`\`\`markdown
$(cat "$REPO_ROOT/$doc")
\`\`\`
"
    fi
  done
fi

# 6. Inject frontend guide for any task touching frontend apps
if [ -n "$APPS" ]; then
  GUIDE_FILE="$REPO_ROOT/docs/frontend-guide.md"
  if [ -f "$GUIDE_FILE" ]; then
    CONTEXT+="
# ====================================================================
#                   FRONTEND DEVELOPMENT GUIDE
# ====================================================================
$(cat "$GUIDE_FILE")
"
  else
    echo "WARNING: frontend-guide.md not found at $GUIDE_FILE – skipping"
  fi
fi

# ---------- Inject Skills for tasks 021-030 (Repo & Migration) ----------
SKILLS_CONTEXT=""
if [[ "$TASK_ID" =~ ^TASK-0(2[1-9]|30)$ ]]; then
  SKILL_FILE="$REPO_ROOT/docs/skills/sea-orm.md"
  if [ -f "$SKILL_FILE" ]; then
    SKILLS_CONTEXT="
# ====================================================================
#                   SEAORM 2.0 SKILL (for Repository/Migration tasks)
# ====================================================================
$(cat "$SKILL_FILE")
"
  else
    echo "WARNING: SeaORM skill file not found at $SKILL_FILE – skipping injection"
  fi
fi

# ---------- Assemble the Final Prompt ----------
PROMPT="
# ====================================================================
#                   PERSONA INSTRUCTION
# ====================================================================
You are a 30-year senior software engineer with deep expertise in Rust and TypeScript.
You produce correct, idiomatic, maintainable, performant, and secure code.
You follow the existing patterns of the codebase and never introduce hacks.
You always include tests for new functionality and edge cases.

# ====================================================================
#                   TECH STACK (from docs/tech-stack.md)
# ====================================================================
 $(cat "$TECH_STACK_FILE")

# ====================================================================
#                   PROJECT ARCHITECTURE (from docs/project.md)
# ====================================================================
 $(cat "$PROJECT_MD_FILE" 2>/dev/null || echo "WARNING: project.md not found")

# ====================================================================
#                   AGENT PROTOCOL
# ====================================================================
 $(cat "$PROTOCOL_FILE")

# ====================================================================
#                   SKILLS CONTEXT
# ====================================================================
$SKILLS_CONTEXT

# ====================================================================
#                   CODEBASE CONTEXT
# ====================================================================
## Affected Crates: ${CRATES:-None}
## Affected Frontend Apps: ${APPS:-None}

 $CONTEXT

# ====================================================================
#                   TASK TO EXECUTE
# ====================================================================
 $(cat "$TASK_FILE")
"

# ---------- Copy to clipboard ----------
if command -v pbcopy &> /dev/null; then
  echo "$PROMPT" | pbcopy
  echo "✅ Copied to clipboard (macOS)"
elif command -v xclip &> /dev/null; then
  echo "$PROMPT" | xclip -selection clipboard
  echo "✅ Copied to clipboard (Linux/X11)"
elif command -v wl-copy &> /dev/null; then
  echo "$PROMPT" | wl-copy
  echo "✅ Copied to clipboard (Linux/Wayland)"
elif command -v clip.exe &> /dev/null; then
  echo "$PROMPT" | clip.exe
  echo "✅ Copied to clipboard (Windows/WSL)"
else
  echo "WARNING: No clipboard tool found. Printing prompt to stdout:"
  echo "$PROMPT"
fi

# ---------- Summary ----------
echo ""
echo "📋 Extracted Boundaries:"
echo "$BOUNDARIES" | sed 's/^/  - /'
echo ""
echo "📦 Detected Rust Crates: ${CRATES:-None}"
echo "📱 Detected Frontend Apps: ${APPS:-None}"
if [[ "$TASK_ID" =~ ^TASK-0(2[1-9]|30)$ ]] && [ -f "$REPO_ROOT/docs/skills/sea-orm.md" ]; then
  echo "🧠 Injected SeaORM 2.0 skill"
fi
if [ "$TASK_ID" = "TASK-000" ]; then
  echo "🎨 Injected design documents (UI/UX, brand, visual identity)"
  echo "🧩 Injected full backend API surface (all handlers, services, domains) for API client generation"
fi
if [ -n "$APPS" ] && [ -f "$REPO_ROOT/docs/frontend-guide.md" ]; then
  echo "📘 Injected frontend development guide"
fi
echo ""
echo "✅ Prompt ready. Paste it into your conversation with the agent."
