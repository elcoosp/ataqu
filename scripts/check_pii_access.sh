#!/usr/bin/env bash
set -euo pipefail

# This script fails if `PiiAccessKey::new_for_test` is used outside of tests or the API serializers.
echo "Running PII Access Lint..."

# Find all .rs files except in tests or serializers.rs
FILES=$(find crates -name "*.rs" -not -path "*/tests/*" -not -path "*/serializers.rs")

for file in $FILES; do
    if grep -q "PiiAccessKey::new_for_test" "$file"; then
        echo "ERROR: Found 'PiiAccessKey::new_for_test' in non-test file: $file"
        exit 1
    fi
done

echo "PII Access Lint passed."
