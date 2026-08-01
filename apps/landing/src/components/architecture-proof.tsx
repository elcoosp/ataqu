"use client";

import { Trans } from "@lingui/react/macro";
import { Cpu, Database, Zap, ArrowRight } from "lucide-react";

export function ArchitectureProof() {
  return (
    <div className="space-y-8">
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

      {/* Architecture diagram */}
      <div className="max-w-3xl mx-auto p-6 rounded-lg border border-border bg-card/20">
        <div className="flex flex-col items-center space-y-2">
          <div className="flex flex-wrap justify-center items-center gap-4 text-sm">
            <span className="px-3 py-1 rounded-full border border-border bg-card/30 font-mono text-xs">10 Apps</span>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <span className="px-3 py-1 rounded-full border border-border bg-card/30 font-mono text-xs">Rust API</span>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <span className="px-3 py-1 rounded-full border border-primary bg-primary/10 font-mono text-xs text-primary">Unified Outbox</span>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <span className="px-3 py-1 rounded-full border border-border bg-card/30 font-mono text-xs">PostgreSQL</span>
          </div>
          <div className="text-xs text-muted-foreground text-center mt-2">
            <Trans>Single database, unified outbox with LISTEN/NOTIFY – instant cross‑app events</Trans>
          </div>
        </div>
      </div>
    </div>
  );
}
