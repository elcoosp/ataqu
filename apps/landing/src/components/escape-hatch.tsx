"use client";

import { Trans } from "@lingui/react/macro";

export function EscapeHatch() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
      <div className="text-center p-6 rounded-lg border border-border bg-card/30">
        <div className="text-3xl mb-2">🔓</div>
        <h3 className="font-display text-lg font-semibold">
          <Trans>1‑click cancel</Trans>
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          <Trans>No retention specialist. No phone call. Just click.</Trans>
        </p>
      </div>
      <div className="text-center p-6 rounded-lg border border-border bg-card/30">
        <div className="text-3xl mb-2">📦</div>
        <h3 className="font-display text-lg font-semibold">
          <Trans>Export your data</Trans>
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          <Trans>CSV, JSON – your data belongs to you.</Trans>
        </p>
      </div>
      <div className="text-center p-6 rounded-lg border border-border bg-card/30">
        <div className="text-3xl mb-2">🧑‍💻</div>
        <h3 className="font-display text-lg font-semibold">
          <Trans>Human support</Trans>
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          <Trans>24h SLA. No bots. Real engineers.</Trans>
        </p>
      </div>
    </div>
  );
}
