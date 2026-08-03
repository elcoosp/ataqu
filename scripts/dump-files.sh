#!/bin/bash
# Usage: ./dump-for-llm.sh [-i ignored_dir ...] <directory>
# Outputs path + content of every non-gitignored text file, suitable for LLM ingestion.

set -euo pipefail

# Arrays to hold ignored directories
ignore_dirs=()

# Parse options
while getopts "i:" opt; do
    case "$opt" in
        i) ignore_dirs+=("$OPTARG") ;;
        *) echo "Usage: $0 [-i ignored_dir ...] <directory>" >&2; exit 1 ;;
    esac
done
shift $((OPTIND-1))

# Check for directory argument
if [ $# -ne 1 ]; then
    echo "Usage: $0 [-i ignored_dir ...] <directory>" >&2
    exit 1
fi

target_dir="$1"

if [ ! -d "$target_dir" ]; then
    echo "Error: '$target_dir' is not a directory." >&2
    exit 1
fi

cd "$target_dir" || exit 1

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "Error: '$target_dir' is not inside a Git repository." >&2
    exit 1
fi

# Normalize ignored directories (remove trailing slash, if any)
for i in "${!ignore_dirs[@]}"; do
    ignore_dirs[i]="${ignore_dirs[i]%/}"
done

# Get list of all files (tracked + untracked) not ignored by .gitignore
git ls-files --cached --others --exclude-standard -z | while IFS= read -r -d '' file; do
    # Skip if it's not a regular file (e.g., symlinks, directories)
    [ -f "$file" ] || continue

    # Skip if file is inside any of the ignored directories
    skip=0
    for ignored in "${ignore_dirs[@]}"; do
        # Exact directory match or as prefix with slash
        if [[ "$file" == "$ignored" || "$file" == "$ignored/"* ]]; then
            skip=1
            break
        fi
    done
    [ "$skip" -eq 1 ] && continue

    # Skip binary files (check with `file` command)
    mime_type=$(file -b --mime-type "$file" 2>/dev/null || echo "")
    if [[ ! "$mime_type" =~ ^text/ ]] && [[ "$mime_type" != "application/json" ]] && [[ "$mime_type" != "application/xml" ]]; then
        continue
    fi

    # Print a clear delimiter with the file path
    echo "===== FILE: $file ====="
    cat "$file"
    # Add a newline after each file's content (in case the file lacks trailing newline)
    echo
done
