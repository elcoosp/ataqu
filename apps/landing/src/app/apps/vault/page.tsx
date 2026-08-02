"use client";

import Link from "next/link";
import { WaitlistForm } from "@/components/waitlist-form";

export default function VaultPage() {
  return (
    <div className="container section-padding max-w-4xl mx-auto">
      <Link href="/" className="text-primary hover:underline text-sm inline-block mb-6">
        ← Back to home
      </Link>

      <h1 className="font-display text-4xl md:text-5xl font-bold">
        Cin7 is a siloed warehouse. VAULT connects inventory to your CRM.
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        
          VAULT is real‑time inventory management with atomic stock updates, native CRM integration,
          and no AI bloat. Stock reservations happen automatically when deals are won.
        
      </p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-6 rounded-lg border border-border bg-card/30">
          <h2 className="font-display text-xl font-bold text-primary">Features</h2>
          <ul className="mt-4 space-y-2 text-muted-foreground">
            <li>• Products & variants</li>
            <li>• Real‑time stock (atomic updates)</li>
            <li>• Stock movements & audit trail</li>
            <li>• Low stock alerts & notifications</li>
            <li>• Multi‑channel & multi‑warehouse</li>
            <li>• Native CINQ order reservation</li>
          </ul>
        </div>

        <div className="p-6 rounded-lg border border-border bg-card/30">
          <h2 className="font-display text-xl font-bold text-primary">Why replace Cin7?</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-display text-muted-foreground">Cin7</th>
                <th className="text-left py-2 font-display text-muted-foreground">VAULT</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground">$79–$349/mo</td>
                <td className="py-2 text-primary font-bold">$15/mo</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground">No native CRM integration</td>
                <td className="py-2 text-primary font-bold">Native CINQ deal reservation</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground">AI bloat with no value</td>
                <td className="py-2 text-primary font-bold">Focused, bloat‑free</td>
              </tr>
              <tr>
                <td className="py-2 text-muted-foreground">Support: 4.5/5 but expensive</td>
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
          
            When a CINQ deal is won, VAULT reserves stock atomically via outbox event.
            When stock hits zero, SPARK pauses the sales sequence. No middleware required.
          
        </p>
      </div>

      <div className="mt-12">
        <h2 className="font-display text-2xl font-bold text-center">
          Ready to escape Cin7?
        </h2>
        <p className="mt-2 text-center text-muted-foreground">
          Start with VAULT for $15/mo. No credit card required for the trial.
        </p>
        <div className="mt-6">
          <WaitlistForm />
        </div>
      </div>
    </div>
  );
}
