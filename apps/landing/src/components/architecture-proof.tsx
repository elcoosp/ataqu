"use client";

import { Cpu, Database, Zap, Shield, CheckCircle, ArrowRight, Layers, Server, Network } from "lucide-react";

export function ArchitectureProof() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Top row: core principles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-lg border border-border bg-card/30">
          <div className="flex justify-center mb-2">
            <Cpu className="w-8 h-8 text-primary" strokeWidth={1.5} />
          </div>
          <h3 className="font-display text-lg font-semibold">
            Single Rust Binary
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Monolithic, modular, and compiled to native code. No microservices, no overhead.
          </p>
        </div>
        <div className="p-6 rounded-lg border border-border bg-card/30">
          <div className="flex justify-center mb-2">
            <Database className="w-8 h-8 text-primary" strokeWidth={1.5} />
          </div>
          <h3 className="font-display text-lg font-semibold">
            PostgreSQL Native
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            MVCC, JSONB, schemas, and a unified outbox with LISTEN/NOTIFY for instant events.
          </p>
        </div>
        <div className="p-6 rounded-lg border border-border bg-card/30">
          <div className="flex justify-center mb-2">
            <Shield className="w-8 h-8 text-primary" strokeWidth={1.5} />
          </div>
          <h3 className="font-display text-lg font-semibold">
            Compile‑time Security
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            PII redacted at compile time; JSON serialization isolated to the API layer.
          </p>
        </div>
      </div>

      {/* Simplified flow diagram */}
      <div className="p-6 rounded-lg border border-border bg-card/20">
        <h4 className="font-display text-md font-semibold mb-4 text-center">
          How cross-app events work
        </h4>
        <div className="flex flex-col items-center space-y-4">
          <div className="flex flex-wrap justify-center gap-2">
            <span className="px-3 py-1 rounded-full border border-border bg-card/40 text-xs font-mono">10 SPAs</span>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <span className="px-3 py-1 rounded-full border border-border bg-card/40 text-xs font-mono">Rust API</span>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <span className="px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-xs font-mono text-primary">Unified Outbox</span>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <span className="px-3 py-1 rounded-full border border-border bg-card/40 text-xs font-mono">PostgreSQL</span>
          </div>
          <div className="text-xs text-muted-foreground text-center">
            Single database, unified outbox with LISTEN/NOTIFY – instant cross‑app events
          </div>
        </div>
      </div>

      {/* Key architectural pillars – no specific numbers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="p-4 rounded-lg border border-border bg-card/20">
          <h4 className="font-display text-base font-semibold mb-2 flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            Bounded Contexts
          </h4>
          <ul className="space-y-1 text-muted-foreground text-xs font-mono">
            <li>• Schemas and PostgreSQL Roles enforce hard isolation</li>
            <li>• Row Level Security prevents cross-domain spoofing</li>
            <li>• Type‑safe ENUM for domain boundaries</li>
          </ul>
        </div>

        <div className="p-4 rounded-lg border border-border bg-card/20">
          <h4 className="font-display text-base font-semibold mb-2 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-primary" />
            Exactly‑once Delivery
          </h4>
          <ul className="space-y-1 text-muted-foreground text-xs font-mono">
            <li>• Advisory locks with negligible collision risk</li>
            <li>• Durable response storage in PostgreSQL</li>
            <li>• 503 + Retry‑After on conflict</li>
          </ul>
        </div>

        <div className="p-4 rounded-lg border border-border bg-card/20">
          <h4 className="font-display text-base font-semibold mb-2 flex items-center gap-2">
            <Network className="w-4 h-4 text-primary" />
            Real‑time Outbox
          </h4>
          <ul className="space-y-1 text-muted-foreground text-xs font-mono">
            <li>• LISTEN/NOTIFY for instant push</li>
            <li>• Safety‑net polling for missed notifications</li>
            <li>• Dead Letter Queue after 5 retries</li>
          </ul>
        </div>

        <div className="p-4 rounded-lg border border-border bg-card/20">
          <h4 className="font-display text-base font-semibold mb-2 flex items-center gap-2">
            <Server className="w-4 h-4 text-primary" />
            Resource Efficiency
          </h4>
          <ul className="space-y-1 text-muted-foreground text-xs font-mono">
            <li>• Bounded caches, connection pools, and channels</li>
            <li>• Memory budget calculated and verified</li>
            <li>• Designed to run on minimal infrastructure</li>
          </ul>
        </div>
      </div>

      {/* Small print – no VPS details */}
      <div className="text-center text-xs text-muted-foreground font-mono">
        Single binary · Single Tokio runtime · 1s RPO via wal‑g
      </div>
    </div>
  );
}
