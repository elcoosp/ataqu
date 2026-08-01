"use client";

import { Trans } from "@lingui/react/macro";
import { XCircle, Download, MessageSquare } from "lucide-react";

export function EscapeHatch() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
      <div className="text-center p-6 rounded-lg border border-border bg-card/30">
        <div className="flex justify-center mb-2">
          <XCircle className="w-8 h-8 text-primary" strokeWidth={1.5} />
        </div>
        <h3 className="font-display text-lg font-semibold">
          <Trans>1‑click cancel</Trans>
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          <Trans>No retention specialist. No phone call. Just click.</Trans>
        </p>
      </div>
      <div className="text-center p-6 rounded-lg border border-border bg-card/30">
        <div className="flex justify-center mb-2">
          <Download className="w-8 h-8 text-primary" strokeWidth={1.5} />
        </div>
        <h3 className="font-display text-lg font-semibold">
          <Trans>Export your data</Trans>
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          <Trans>CSV, JSON – your data belongs to you.</Trans>
        </p>
      </div>
      <div className="text-center p-6 rounded-lg border border-border bg-card/30">
        <div className="flex justify-center mb-2">
          <MessageSquare className="w-8 h-8 text-primary" strokeWidth={1.5} />
        </div>
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
