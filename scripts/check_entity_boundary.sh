#!/usr/bin/env bash
set -euo pipefail

# This script fails if `sea_orm::Model` or `sea_orm::ActiveModel` appears in domain crates.
echo "Running Entity Boundary Lint..."

DOMAIN_CRATES="crates/ataqu-domain-aegis crates/ataqu-domain-cinq crates/ataqu-domain-dial crates/ataqu-domain-pause crates/ataqu-domain-pivot crates/ataqu-domain-sond crates/ataqu-domain-spark crates/ataqu-domain-tempo crates/ataqu-domain-vault crates/ataqu-domain-vista"

for dir in $DOMAIN_CRATES; do
    if grep -rq "sea_orm::Model\|sea_orm::ActiveModel" "$dir"; then
        echo "ERROR: Found SeaORM Model/ActiveModel in domain crate: $dir"
        exit 1
    fi
done

echo "Entity Boundary Lint passed."
