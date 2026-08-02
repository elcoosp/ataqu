"use client";

import { Trans } from "@lingui/react/macro";
import Link from "next/link";
import { WaitlistForm } from "@/components/waitlist-form";

export default function SparkPage() {
  return (
    <div className="container section-padding max-w-4xl mx-auto">
      <Link href="/" className="text-primary hover:underline text-sm inline-block mb-6">
        <Trans>← Back to home</Trans>
      </Link>

      <h1 className="font-display text-4xl md:text-5xl font-bold">
        <Trans>Zapier is a brittle bridge. SPARK is the foundation.</Trans>
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        <Trans>
          SPARK is native automation across your entire OS. No per‑task fees, no brittle webhooks, no 5‑minute polling.
          Triggers fire in &lt;1s via PostgreSQL LISTEN/NOTIFY.
        </Trans>
      </p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-6 rounded-lg border border-border bg-card/30">
          <h2 className="font-display text-xl font-bold text-primary"><Trans>Features</Trans></h2>
          <ul className="mt-4 space-y-2 text-muted-foreground">
            <li>• <Trans>Visual workflow builder (drag & drop)</Trans></li>
            <li>• <Trans>Triggers & actions from all 10 apps</Trans></li>
            <li>• <Trans>Conditions and branching</Trans></li>
            <li>• <Trans>Unlimited tasks — no metering</Trans></li>
            <li>• <Trans>Native event bus (LISTEN/NOTIFY)</Trans></li>
            <li>• <Trans>Exactly‑once delivery with DLQ</Trans></li>
          </ul>
        </div>

        <div className="p-6 rounded-lg border border-border bg-card/30">
          <h2 className="font-display text-xl font-bold text-primary"><Trans>Why replace Zapier?</Trans></h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-display text-muted-foreground"><Trans>Zapier</Trans></th>
                <th className="text-left py-2 font-display text-muted-foreground"><Trans>SPARK</Trans></th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground">$79/mo for 750 tasks</td>
                <td className="py-2 text-primary font-bold">$15/mo (unlimited)</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground"><Trans>5‑15 minute polling delays</Trans></td>
                <td className="py-2 text-primary font-bold"><Trans>&lt;1s execution</Trans></td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground"><Trans>Brittle webhooks</Trans></td>
                <td className="py-2 text-primary font-bold"><Trans>Native outbox with LISTEN/NOTIFY</Trans></td>
              </tr>
              <tr>
                <td className="py-2 text-muted-foreground"><Trans>Support: 1.3/5 on Trustpilot</Trans></td>
                <td className="py-2 text-primary font-bold"><Trans>Human support, 24h SLA</Trans></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-12 p-6 rounded-lg border border-primary/30 bg-card/50">
        <h2 className="font-display text-2xl font-bold text-primary">
          <Trans>Native integration across the OS</Trans>
        </h2>
        <p className="mt-2 text-muted-foreground">
          <Trans>
            SPARK workflows can trigger on any event from any app. When a CINQ deal is won, reserve VAULT stock.
            When a SOND form is submitted, create a CINQ lead. No Zapier required.
          </Trans>
        </p>
      </div>

      <div className="mt-12">
        <h2 className="font-display text-2xl font-bold text-center">
          <Trans>Ready to escape Zapier?</Trans>
        </h2>
        <p className="mt-2 text-center text-muted-foreground">
          <Trans>Start with SPARK for $15/mo. No credit card required for the trial.</Trans>
        </p>
        <div className="mt-6">
          <WaitlistForm />
        </div>
      </div>
    </div>
  );
}
