"use client";

import { Trans } from "@lingui/react/macro";
import { Cpu, Database, Zap } from "lucide-react";

export function ArchitectureProof() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
      <div className="p-6 rounded-lg border border-border bg-card/30">
        <div className="flex justify-center mb-2">
          <Cpu className="w-8 h-8 text-primary" strokeWidth={1.5} />
        </div>
        <h3 className="font-display text-lg font-semibold">
          <Trans>Built in Rust</Trans>
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          <Trans>Single binary, no bloat, compile‑time safety.</Trans>
        </p>
      </div>
      <div className="p-6 rounded-lg border border-border bg-card/30">
        <div className="flex justify-center mb-2">
          <Database className="w-8 h-8 text-primary" strokeWidth={1.5} />
        </div>
        <h3 className="font-display text-lg font-semibold">
          <Trans>PostgreSQL native</Trans>
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          <Trans>MVCC, JSONB, outbox with LISTEN/NOTIFY – true concurrency.</Trans>
        </p>
      </div>
      <div className="p-6 rounded-lg border border-border bg-card/30">
        <div className="flex justify-center mb-2">
          <Zap className="w-8 h-8 text-primary" strokeWidth={1.5} />
        </div>
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
