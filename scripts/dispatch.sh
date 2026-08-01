#!/usr/bin/env bash
# dispatch.sh - Prepares the full agent prompt (protocol + context + task)
# Usage: ./scripts/dispatch.sh TASK-001

set -euo pipefail

# ---------- Find repository root ----------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

PROTOCOL_FILE="$REPO_ROOT/docs/protocol/agent-protocol.md"
if [ ! -f "$PROTOCOL_FILE" ]; then
  echo "ERROR: Protocol file not found at $PROTOCOL_FILE"
  echo "Make sure the script is placed in ./scripts/ inside the repo root."
  exit 1
fi

TASKS_DIR="$REPO_ROOT/docs/tasks"

# ---------- Argument parsing ----------
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
echo "📖 Parsing boundaries from $TASK_FILE"
BOUNDARIES=$(grep -A20 "^## Execution Boundaries" "$TASK_FILE" | grep -E "^\s*[-*]\s+\`" | sed 's/^[-*]\s*`//' | sed 's/`.*$//' || true)

if [ -z "$BOUNDARIES" ]; then
  echo "ERROR: No 'Execution Boundaries' section found in task file."
  echo "Please define boundaries with bullet points like:"
  echo "  - \`crates/ataqu-domain-dial/src/pagination.rs\`"
  exit 1
fi

# Extract unique crates and apps
CRATES=$(echo "$BOUNDARIES" | grep 'crates/' | sed 's|/.*||' | sort -u)
APPS=$(echo "$BOUNDARIES" | grep 'apps/' | sed 's|apps/||' | sed 's|/.*||' | sort -u)

echo "📦 Detected crates: $CRATES"
echo "📱 Detected apps: $APPS"

# ---------- Build Codebase Context ----------
CONTEXT=""

# 1. Inject existing files from boundaries
for path in $BOUNDARIES; do
  full_path="$REPO_ROOT/$path"
  if [ -f "$full_path" ]; then
    # Determine language for syntax highlighting
    if echo "$path" | grep -q '\.rs$'; then
      LANG="rust"
      COMMENT="//"
    else
      LANG="typescript"
      COMMENT="//"
    fi
    CONTEXT+="
### File: $path
\`\`\`$LANG
$COMMENT File: $path
$(cat "$full_path")
\`\`\`
"
  elif [ -d "$full_path" ]; then
    # List files in the directory (non-recursive)
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

# 2. Inject Cargo.toml dependencies
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
  # List existing test files
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

# 3. Inject frontend package.json
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
PROMPT="$(cat "$PROTOCOL_FILE")"
PROMPT+=$'\n\n'
PROMPT+="# ============================================ #"
PROMPT+=$'\n'
PROMPT+="#               CODEBASE CONTEXT               #"
PROMPT+=$'\n'
PROMPT+="# ============================================ #"
PROMPT+=$'\n\n'
PROMPT+="## Affected Crates: $CRATES"
PROMPT+=$'\n'
PROMPT+="## Affected Frontend Apps: $APPS"
PROMPT+=$'\n\n'
PROMPT+="$CONTEXT"
PROMPT+=$'\n\n'
PROMPT+="# ============================================ #"
PROMPT+=$'\n'
PROMPT+="#               TASK TO EXECUTE                #"
PROMPT+=$'\n'
PROMPT+="# ============================================ #"
PROMPT+=$'\n\n'
PROMPT+="$(cat "$TASK_FILE")"

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
