"use client";

import Link from "next/link";
import { WaitlistForm } from "@/components/waitlist-form";

export default function SparkPage() {
  return (
    <div className="container section-padding max-w-4xl mx-auto">
      <Link href="/" className="text-primary hover:underline text-sm inline-block mb-6">
        ← Back to home
      </Link>

      <h1 className="font-display text-4xl md:text-5xl font-bold">
        Zapier is a brittle bridge. SPARK is the foundation.
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        
          SPARK is native automation across your entire OS. No per‑task fees, no brittle webhooks, no 5‑minute polling.
          Triggers fire in &lt;1s via PostgreSQL LISTEN/NOTIFY.
        
      </p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-6 rounded-lg border border-border bg-card/30">
          <h2 className="font-display text-xl font-bold text-primary">Features</h2>
          <ul className="mt-4 space-y-2 text-muted-foreground">
            <li>• Visual workflow builder (drag & drop)</li>
            <li>• Triggers & actions from all 10 apps</li>
            <li>• Conditions and branching</li>
            <li>• Unlimited tasks — no metering</li>
            <li>• Native event bus (LISTEN/NOTIFY)</li>
            <li>• Exactly‑once delivery with DLQ</li>
          </ul>
        </div>

        <div className="p-6 rounded-lg border border-border bg-card/30">
          <h2 className="font-display text-xl font-bold text-primary">Why replace Zapier?</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-display text-muted-foreground">Zapier</th>
                <th className="text-left py-2 font-display text-muted-foreground">SPARK</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground">$79/mo for 750 tasks</td>
                <td className="py-2 text-primary font-bold">$15/mo (unlimited)</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground">5‑15 minute polling delays</td>
                <td className="py-2 text-primary font-bold">&lt;1s execution</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground">Brittle webhooks</td>
                <td className="py-2 text-primary font-bold">Native outbox with LISTEN/NOTIFY</td>
              </tr>
              <tr>
                <td className="py-2 text-muted-foreground">Support: 1.3/5 on Trustpilot</td>
                <td className="py-2 text-primary font-bold">Human support, 24h SLA</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-12 p-6 rounded-lg border border-primary/30 bg-card/50">
        <h2 className="font-display text-2xl font-bold text-primary">
          Native integration across the OS
        </h2>
        <p className="mt-2 text-muted-foreground">
          
            SPARK workflows can trigger on any event from any app. When a CINQ deal is won, reserve VAULT stock.
            When a SOND form is submitted, create a CINQ lead. No Zapier required.
          
        </p>
      </div>

      <div className="mt-12">
        <h2 className="font-display text-2xl font-bold text-center">
          Ready to escape Zapier?
        </h2>
        <p className="mt-2 text-center text-muted-foreground">
          Start with SPARK for $15/mo. No credit card required for the trial.
        </p>
        <div className="mt-6">
          <WaitlistForm />
        </div>
      </div>
    </div>
  );
}
