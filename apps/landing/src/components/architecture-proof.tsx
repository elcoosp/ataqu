"use client";

import { Trans } from "@lingui/react/macro";
import { Cpu, Database, Zap, Layers, ArrowRight, Server, Network, Shield, Lock, GitBranch, CheckCircle } from "lucide-react";

export function ArchitectureProof() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top-level cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-lg border border-border bg-card/30">
          <div className="flex justify-center mb-2">
            <Cpu className="w-8 h-8 text-primary" strokeWidth={1.5} />
          </div>
          <h3 className="font-display text-lg font-semibold">
            <Trans>Single Rust Binary</Trans>
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            <Trans>One Tokio runtime, 10 apps, zero microservices. 35 DB connections max.</Trans>
          </p>
        </div>
        <div className="p-6 rounded-lg border border-border bg-card/30">
          <div className="flex justify-center mb-2">
            <Database className="w-8 h-8 text-primary" strokeWidth={1.5} />
          </div>
          <h3 className="font-display text-lg font-semibold">
            <Trans>PostgreSQL 18.4</Trans>
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            <Trans>MVCC, JSONB, RLS, schemas, and a unified outbox with LISTEN/NOTIFY.</Trans>
          </p>
        </div>
        <div className="p-6 rounded-lg border border-border bg-card/30">
          <div className="flex justify-center mb-2">
            <Shield className="w-8 h-8 text-primary" strokeWidth={1.5} />
          </div>
          <h3 className="font-display text-lg font-semibold">
            <Trans>Compile‑time Security</Trans>
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            <Trans>PII redaction via newtypes; JSON serialization isolated to API layer.</Trans>
          </p>
        </div>
      </div>

      {/* Architecture diagram */}
      <div className="p-6 rounded-lg border border-border bg-card/20">
        <h4 className="font-display text-md font-semibold mb-4 text-center">
          <Trans>How it works</Trans>
        </h4>
        <div className="flex flex-col items-center space-y-4">
          {/* Row 1: Frontend SPAs */}
          <div className="flex flex-wrap justify-center gap-2">
            <span className="px-3 py-1 rounded-full border border-border bg-card/40 text-xs font-mono">PIVOT</span>
            <span className="px-3 py-1 rounded-full border border-border bg-card/40 text-xs font-mono">DIAL</span>
            <span className="px-3 py-1 rounded-full border border-border bg-card/40 text-xs font-mono">SPARK</span>
            <span className="px-3 py-1 rounded-full border border-border bg-card/40 text-xs font-mono">TEMPO</span>
            <span className="px-3 py-1 rounded-full border border-border bg-card/40 text-xs font-mono">SOND</span>
            <span className="px-3 py-1 rounded-full border border-border bg-card/40 text-xs font-mono">CINQ</span>
            <span className="px-3 py-1 rounded-full border border-border bg-card/40 text-xs font-mono">VAULT</span>
            <span className="px-3 py-1 rounded-full border border-border bg-card/40 text-xs font-mono">PAUSE</span>
            <span className="px-3 py-1 rounded-full border border-border bg-card/40 text-xs font-mono">AEGIS</span>
            <span className="px-3 py-1 rounded-full border border-border bg-card/40 text-xs font-mono">VISTA</span>
          </div>
          <ArrowRight className="w-6 h-6 text-muted-foreground" />

          {/* Row 2: Rust API + Application Layer */}
          <div className="flex flex-wrap justify-center gap-4">
            <div className="px-4 py-2 rounded-lg border border-border bg-card/30 text-sm font-mono">Axum 0.8 (HTTP/WS)</div>
            <div className="px-4 py-2 rounded-lg border border-border bg-card/30 text-sm font-mono">Tokio 1.52</div>
            <div className="px-4 py-2 rounded-lg border border-primary/30 bg-primary/10 text-sm font-mono text-primary">Idempotency Guard</div>
          </div>
          <ArrowRight className="w-6 h-6 text-muted-foreground" />

          {/* Row 3: Domain + Infrastructure */}
          <div className="flex flex-wrap justify-center gap-3">
            <div className="px-4 py-2 rounded-lg border border-border bg-card/30 text-sm font-mono">Domain Logic</div>
            <div className="px-4 py-2 rounded-lg border border-border bg-card/30 text-sm font-mono">SeaORM 2.0</div>
            <div className="px-4 py-2 rounded-lg border border-border bg-card/30 text-sm font-mono">Raw SQL</div>
            <div className="px-4 py-2 rounded-lg border border-border bg-card/30 text-sm font-mono">Outbox</div>
          </div>
          <ArrowRight className="w-6 h-6 text-muted-foreground" />

          {/* Row 4: PostgreSQL with schemas + outbox */}
          <div className="w-full max-w-2xl p-4 rounded-lg border-2 border-primary/30 bg-card/40">
            <div className="flex flex-wrap justify-center gap-2 text-xs font-mono">
              <span className="px-2 py-1 rounded bg-background/50 border border-border">core</span>
              <span className="px-2 py-1 rounded bg-background/50 border border-border">collab_crm</span>
              <span className="px-2 py-1 rounded bg-background/50 border border-border">collab_ops</span>
              <span className="px-2 py-1 rounded bg-background/50 border border-border">vault</span>
              <span className="px-2 py-1 rounded bg-background/50 border border-border">dial</span>
              <span className="px-2 py-1 rounded bg-background/50 border border-border">vista</span>
            </div>
            <div className="mt-2 text-center text-xs text-primary font-mono">
              <span className="bg-primary/10 px-3 py-0.5 rounded-full">unified outbox (RLS + ENUM)</span>
              <span className="mx-2">·</span>
              <span className="bg-primary/10 px-3 py-0.5 rounded-full">LISTEN/NOTIFY</span>
              <span className="mx-2">·</span>
              <span className="bg-primary/10 px-3 py-0.5 rounded-full">advisory locks</span>
            </div>
          </div>
        </div>
        <div className="mt-4 text-center text-xs text-muted-foreground">
          <Trans>Single PostgreSQL instance · 35 connections · 8 GB VPS · sub‑50ms search</Trans>
        </div>
      </div>

      {/* Feature badges */}
      <div className="flex flex-wrap justify-center gap-2">
        <span className="px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-xs text-primary font-mono">✔️ SeaORM 2.0</span>
        <span className="px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-xs text-primary font-mono">✔️ RLS + ENUM</span>
        <span className="px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-xs text-primary font-mono">✔️ LISTEN/NOTIFY</span>
        <span className="px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-xs text-primary font-mono">✔️ Idempotency (2⁻⁶⁴)</span>
        <span className="px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-xs text-primary font-mono">✔️ PII newtypes</span>
        <span className="px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-xs text-primary font-mono">✔️ wal-g backup</span>
        <span className="px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-xs text-primary font-mono">✔️ 1 s RPO</span>
      </div>
    </div>
  );
}
