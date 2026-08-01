#!/usr/bin/env bash
set -euo pipefail

# Usage: ./concat-files.sh [directory] [--ignore pattern]
# If no directory given, uses current directory.
# Options: --ignore <pattern> (e.g., --ignore "*.log") to exclude files.

target_dir="${1:-.}"
shift 2>/dev/null || true

ignore_pattern=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --ignore)
      ignore_pattern="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Normalize directory path
target_dir="$(realpath "$target_dir")"

# Find all files (excluding directories) recursively
# Sort them for deterministic output
find "$target_dir" -type f -print0 | sort -z | while IFS= read -r -d '' file; do
  # Skip if matches ignore pattern (simple glob)
  if [[ -n "$ignore_pattern" && "$file" == $ignore_pattern ]]; then
    continue
  fi

  # Get relative path from target directory
  rel_path="${file#$target_dir/}"
  # If file is directly the target_dir (unlikely), use basename
  if [[ "$rel_path" == "$file" ]]; then
    rel_path="$(basename "$file")"
  fi

  # Print header
  echo "===== FILE: $rel_path ====="
  # Print file content
  cat "$file"
  # Add newline after each file (in case file lacks trailing newline)
  echo
done
