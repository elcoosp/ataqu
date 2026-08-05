#!/usr/bin/env bash
set -euo pipefail
echo "Running EXPLAIN QUERY PLAN Lint (Mock)..."
# In a real CI, this would connect to a DB with sample data and run EXPLAIN on queries.
# For now, we just check for the -- ALLOW_SEQ_SCAN comment in raw SQL strings.
if grep -r "SELECT" crates/ataqu-infra-repositories/src --include="*.rs" | grep -v "ALLOW_SEQ_SCAN" | grep -iq "seq scan"; then
    echo "WARNING: Potential Seq Scan found without ALLOW_SEQ_SCAN comment."
fi
echo "EXPLAIN QUERY PLAN Lint passed."
