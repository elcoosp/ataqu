#!/usr/bin/env bash
# dispatch.sh - Prepares the full agent prompt (protocol + tech-stack + context + task)
# Usage: ./scripts/dispatch.sh TASK-001

set -euo pipefail

# ---------- Find repository root ----------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

PROTOCOL_FILE="$REPO_ROOT/docs/protocol/agent-protocol.md"
TECH_STACK_FILE="$REPO_ROOT/docs/tech-stack.md"
TASKS_DIR="$REPO_ROOT/docs/tasks"

if [ ! -f "$PROTOCOL_FILE" ]; then
  echo "ERROR: Protocol file not found at $PROTOCOL_FILE"
  exit 1
fi
if [ ! -f "$TECH_STACK_FILE" ]; then
  echo "ERROR: Tech-stack file not found at $TECH_STACK_FILE"
  exit 1
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
BOUNDARIES=$(grep -A20 "^## Execution Boundaries" "$TASK_FILE" | grep -E "^\s*[-*]\s+\`" | sed 's/^[-*]\s*`//' | sed 's/`.*$//' || true)

if [ -z "$BOUNDARIES" ]; then
  echo "ERROR: No 'Execution Boundaries' section found in task file."
  exit 1
fi

CRATES=$(echo "$BOUNDARIES" | grep 'crates/' | sed 's|/.*||' | sort -u)
APPS=$(echo "$BOUNDARIES" | grep 'apps/' | sed 's|apps/||' | sed 's|/.*||' | sort -u)

# ---------- Build Codebase Context ----------
CONTEXT=""

for path in $BOUNDARIES; do
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
    file_list=$(find "$full_path" -maxdepth 1 -type f \( -name '*.rs' -o -name '*.ts' -o -name '*.tsx' \) 2>/dev/null | sed "s|^$REPO_ROOT/||" | head -20)
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

for crate in $CRATES; do
  cargo_file="$REPO_ROOT/$crate/Cargo.toml"
  if [ -f "$cargo_file" ]; then
    CONTEXT+="
### Dependencies for crate: $crate
\`\`\`toml
# File: $crate/Cargo.toml
$(cat "$cargo_file")
\`\`\`
"
  fi
  test_dir="$REPO_ROOT/$crate/tests"
  if [ -d "$test_dir" ]; then
    tests=$(find "$test_dir" -name '*.rs' -exec basename {} \; 2>/dev/null | head -10)
    if [ -n "$tests" ]; then
      CONTEXT+="
### Existing tests in $crate/tests/
\`\`\`
$tests
\`\`\`
"
    fi
  fi
done

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
#                   AGENT PROTOCOL
# ====================================================================
$(cat "$PROTOCOL_FILE")

# ====================================================================
#                   CODEBASE CONTEXT
# ====================================================================
## Affected Crates: $CRATES
## Affected Frontend Apps: $APPS

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
echo "📦 Detected Rust Crates: $CRATES"
echo "📱 Detected Frontend Apps: $APPS"
echo ""
echo "✅ Prompt ready. Paste it into your conversation with the agent."
