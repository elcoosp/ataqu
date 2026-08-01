"use client";

import { Trans } from "@lingui/react/macro";
import {
  Cpu,
  Database,
  Zap,
  GitBranch,
  Shield,
  CheckCircle,
  ArrowRight,
  Layers,
  Server,
  Network,
  Lock,
  Users
} from "lucide-react";

export function ArchitectureProof() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Flow diagram - visual representation */}
      <div className="relative">
        {/* Top row: SPAs */}
        <div className="flex flex-wrap justify-center gap-1.5 mb-4">
          <span className="px-3 py-1 rounded-md bg-card/50 border border-border text-xs font-mono text-foreground">PIVOT</span>
          <span className="px-3 py-1 rounded-md bg-card/50 border border-border text-xs font-mono text-foreground">DIAL</span>
          <span className="px-3 py-1 rounded-md bg-card/50 border border-border text-xs font-mono text-foreground">SPARK</span>
          <span className="px-3 py-1 rounded-md bg-card/50 border border-border text-xs font-mono text-foreground">TEMPO</span>
          <span className="px-3 py-1 rounded-md bg-card/50 border border-border text-xs font-mono text-foreground">SOND</span>
          <span className="px-3 py-1 rounded-md bg-card/50 border border-border text-xs font-mono text-foreground">CINQ</span>
          <span className="px-3 py-1 rounded-md bg-card/50 border border-border text-xs font-mono text-foreground">VAULT</span>
          <span className="px-3 py-1 rounded-md bg-card/50 border border-border text-xs font-mono text-foreground">PAUSE</span>
          <span className="px-3 py-1 rounded-md bg-card/50 border border-border text-xs font-mono text-foreground">AEGIS</span>
          <span className="px-3 py-1 rounded-md bg-card/50 border border-border text-xs font-mono text-foreground">VISTA</span>
        </div>

        {/* Arrow down */}
        <div className="flex justify-center mb-2">
          <ArrowRight className="w-5 h-5 text-muted-foreground rotate-90" />
        </div>

        {/* Middle: Rust API + Application Layer */}
        <div className="flex flex-wrap justify-center gap-2 mb-2">
          <div className="px-4 py-1.5 rounded-md border border-border bg-card/30 text-xs font-mono text-foreground">Axum 0.8 (HTTP/WS)</div>
          <div className="px-4 py-1.5 rounded-md border border-border bg-card/30 text-xs font-mono text-foreground">Tokio 1.52</div>
          <div className="px-4 py-1.5 rounded-md border border-primary/30 bg-primary/10 text-xs font-mono text-primary">Idempotency Guard</div>
          <div className="px-4 py-1.5 rounded-md border border-border bg-card/30 text-xs font-mono text-foreground">Moka Cache</div>
        </div>

        {/* Arrow down */}
        <div className="flex justify-center mb-2">
          <ArrowRight className="w-5 h-5 text-muted-foreground rotate-90" />
        </div>

        {/* Bottom: PostgreSQL */}
        <div className="w-full max-w-2xl mx-auto p-4 rounded-lg border-2 border-primary/30 bg-card/40">
          <div className="flex flex-wrap justify-center gap-1.5 text-xs font-mono">
            <span className="px-2 py-0.5 rounded bg-background/50 border border-border">core</span>
            <span className="px-2 py-0.5 rounded bg-background/50 border border-border">collab_crm</span>
            <span className="px-2 py-0.5 rounded bg-background/50 border border-border">collab_ops</span>
            <span className="px-2 py-0.5 rounded bg-background/50 border border-border">vault</span>
            <span className="px-2 py-0.5 rounded bg-background/50 border border-border">dial</span>
            <span className="px-2 py-0.5 rounded bg-background/50 border border-border">vista</span>
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-2 text-xs">
            <span className="px-3 py-0.5 rounded-full bg-primary/10 border border-primary/30 text-primary font-mono">unified outbox</span>
            <span className="px-3 py-0.5 rounded-full bg-primary/10 border border-primary/30 text-primary font-mono">LISTEN/NOTIFY</span>
            <span className="px-3 py-0.5 rounded-full bg-primary/10 border border-primary/30 text-primary font-mono">RLS + ENUM</span>
            <span className="px-3 py-0.5 rounded-full bg-primary/10 border border-primary/30 text-primary font-mono">advisory locks</span>
          </div>
        </div>
      </div>

      {/* Technical details - clear bullets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="p-4 rounded-lg border border-border bg-card/20">
          <h4 className="font-display text-base font-semibold mb-2 flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            <Trans>Single PostgreSQL 18.4</Trans>
          </h4>
          <ul className="space-y-1 text-muted-foreground text-xs font-mono">
            <li>• 6 schemas · 35 connections max</li>
            <li>• MVCC · JSONB · RLS policies</li>
            <li>• 1 GB shared_buffers · 2 MB work_mem</li>
          </ul>
        </div>

        <div className="p-4 rounded-lg border border-border bg-card/20">
          <h4 className="font-display text-base font-semibold mb-2 flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-primary" />
            <Trans>Unified Outbox</Trans>
          </h4>
          <ul className="space-y-1 text-muted-foreground text-xs font-mono">
            <li>• Single core.outbox table with schema ENUM</li>
            <li>• LISTEN/NOTIFY for instant push</li>
            <li>• DLQ after 5 retries · 5s safety poll</li>
          </ul>
        </div>

        <div className="p-4 rounded-lg border border-border bg-card/20">
          <h4 className="font-display text-base font-semibold mb-2 flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" />
            <Trans>Idempotency</Trans>
          </h4>
          <ul className="space-y-1 text-muted-foreground text-xs font-mono">
            <li>• 2× int4 advisory locks (2⁻⁶⁴ collision)</li>
            <li>• 10s timeout → 503 + Retry-After</li>
            <li>• Moka cache · 10K entries · 20 MB peak</li>
          </ul>
        </div>

        <div className="p-4 rounded-lg border border-border bg-card/20">
          <h4 className="font-display text-base font-semibold mb-2 flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <Trans>PII Security</Trans>
          </h4>
          <ul className="space-y-1 text-muted-foreground text-xs font-mono">
            <li>• Compile-time newtypes (Email, Phone)</li>
            <li>• Debug/Display → [REDACTED]</li>
            <li>• API wrapper structs for serialization</li>
          </ul>
        </div>
      </div>

      {/* How it works - plain English */}
      <div className="p-4 rounded-lg border border-primary/20 bg-card/20">
        <h4 className="font-display text-base font-semibold mb-2">
          <Trans>How cross-app events work</Trans>
        </h4>
        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
          <li><Trans>App A persists data → inserts event into core.outbox</Trans></li>
          <li><Trans>App A issues pg_notify('outbox_event') on the same transaction</Trans></li>
          <li><Trans>Dispatcher wakes via LISTEN, polls pending events with FOR UPDATE SKIP LOCKED</Trans></li>
          <li><Trans>Dispatcher routes event to App B via outbox consumer</Trans></li>
          <li><Trans>App B processes event idempotently (advisory locks guarantee exactly-once)</Trans></li>
        </ol>
      </div>

      {/* Small print */}
      <div className="text-center text-xs text-muted-foreground font-mono">
        <Trans>Single binary · Single Tokio runtime · 8 GB VPS · 1 s RPO via wal-g</Trans>
      </div>
    </div>
  );
}
