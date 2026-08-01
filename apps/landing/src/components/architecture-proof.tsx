"use client";

import { Trans } from "@lingui/react/macro";

export function ArchitectureProof() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
      <div className="p-6 rounded-lg border border-border bg-card/30">
        <div className="text-2xl mb-2">🦀</div>
        <h3 className="font-display text-lg font-semibold">
          <Trans>Built in Rust</Trans>
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          <Trans>Single binary, no bloat, compile‑time safety.</Trans>
        </p>
      </div>
      <div className="p-6 rounded-lg border border-border bg-card/30">
        <div className="text-2xl mb-2">🐘</div>
        <h3 className="font-display text-lg font-semibold">
          <Trans>PostgreSQL native</Trans>
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          <Trans>MVCC, JSONB, outbox with LISTEN/NOTIFY – true concurrency.</Trans>
        </p>
      </div>
      <div className="p-6 rounded-lg border border-border bg-card/30">
        <div className="text-2xl mb-2">⚡</div>
        <h3 className="font-display text-lg font-semibold">
          <Trans>Sub‑50ms search</Trans>
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          <Trans>PostgreSQL tsvector with GIN indexes, updated asynchronously.</Trans>
        </p>
      </div>
    </div>
  );
}
