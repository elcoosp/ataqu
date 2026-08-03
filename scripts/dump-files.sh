#!/bin/bash
# Usage: ./dump-for-llm.sh <directory>
# Outputs path + content of every non-gitignored text file, suitable for LLM ingestion.

set -euo pipefail

if [ $# -ne 1 ]; then
    echo "Usage: $0 <directory>" >&2
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

# Get list of all files (tracked + untracked) not ignored by .gitignore
git ls-files --cached --others --exclude-standard -z | while IFS= read -r -d '' file; do
    # Skip if it's not a regular file (e.g., symlinks, directories)
    [ -f "$file" ] || continue

    # Skip binary files (check with `file` command)
    mime_type=$(file -b --mime-type "$file" 2>/dev/null || echo "")
    if [[ ! "$mime_type" =~ ^text/ ]] && [[ "$mime_type" != "application/json" ]] && [[ "$mime_type" != "application/xml" ]]; then
        # Optionally skip other common text-ish types; adjust as needed
        # If you want to force-include, remove this block
        continue
    fi

    # Print a clear delimiter with the file path
    echo "===== FILE: $file ====="
    cat "$file"
    # Add a newline after each file's content (in case the file lacks trailing newline)
    echo
done
