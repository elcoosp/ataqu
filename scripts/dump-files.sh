#!/bin/bash
# Usage: ./dump-for-llm.sh <directory>
# Outputs path + content of every non‑gitignored text file under <directory>,
# suitable for LLM ingestion. Skips common lock files.
set -euo pipefail

if [ $# -ne 1 ]; then
    echo "Usage: $0 <directory>" >&2
    exit 1
fi

prefix="$1"
target_dir="$prefix"

if [ ! -d "$target_dir" ]; then
    echo "Error: '$target_dir' is not a directory." >&2
    exit 1
fi

if ! git -C "$target_dir" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "Error: '$target_dir' is not inside a Git repository." >&2
    exit 1
fi

repo_root=$(git -C "$target_dir" rev-parse --show-toplevel)

# Get the path from repo root to target_dir (with trailing slash if non‑empty)
target_rel=$(git -C "$target_dir" rev-parse --show-prefix)

# Remove trailing slash from the original prefix (if any)
prefix="${prefix%/}"

# List all files under target_dir (tracked + untracked, respecting .gitignore)
git -C "$target_dir" ls-files --cached --others --exclude-standard -z . |
while IFS= read -r -d '' file; do
    # file is relative to repo root
    abs_file="$repo_root/$file"

    # Skip if not a regular file
    [ -f "$abs_file" ] || continue

    # ----- SKIP LOCK FILES -----
    case "$file" in
        *Cargo.lock|*package-lock.json|*yarn.lock|*Gemfile.lock|*Pipfile.lock|*poetry.lock|*composer.lock|*go.sum|*pnpm-lock.yaml)
            continue
            ;;
    esac

    # Skip binary files (allow JSON/XML as text‑like)
    mime_type=$(file -b --mime-type "$abs_file" 2>/dev/null || echo "")
    if [[ ! "$mime_type" =~ ^text/ ]] && [[ "$mime_type" != "application/json" ]] && [[ "$mime_type" != "application/xml" ]]; then
        continue
    fi

    # Compute path relative to target_dir by stripping the repo‑relative prefix
    if [ -n "$target_rel" ]; then
        rel_path="${file#$target_rel}"   # remove "subdir/" prefix
    else
        rel_path="$file"                 # repo root -> file is already relative
    fi

    # Prepend the original argument to get the complete path
    prefixed_path="$prefix/$rel_path"
    # Clean up any double slashes (e.g., if prefix ended with '/')
    prefixed_path="${prefixed_path//\/\//\/}"

    echo "===== FILE: $prefixed_path ====="
    cat "$abs_file"
    echo
done
