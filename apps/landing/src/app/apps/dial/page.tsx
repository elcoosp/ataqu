"use client";

import Link from "next/link";
import { WaitlistForm } from "@/components/waitlist-form";

export default function DialPage() {
  return (
    <div className="container section-padding max-w-4xl mx-auto">
      <Link href="/" className="text-primary hover:underline text-sm inline-block mb-6">
        ← Back to home
      </Link>

      <h1 className="font-display text-4xl md:text-5xl font-bold">
        Slack taxes your team. Intercom taxes your customers. DIAL unites both.
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        
          DIAL combines internal team chat and external customer support in one natively secure workspace.
          No per‑user fees. No separate Intercom license. And it's natively connected to CINQ.
        
      </p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-6 rounded-lg border border-border bg-card/30">
          <h2 className="font-display text-xl font-bold text-primary">Features</h2>
          <ul className="mt-4 space-y-2 text-muted-foreground">
            <li>• Channels (public & private)</li>
            <li>• Threads, mentions, reactions</li>
            <li>• Unified support ticket inbox</li>
            <li>• File sharing & search (PostgreSQL tsvector)</li>
            <li>• Native CRM integration (CINQ deals in the sidebar)</li>
            <li>• Real‑time presence & notifications</li>
          </ul>
        </div>

        <div className="p-6 rounded-lg border border-border bg-card/30">
          <h2 className="font-display text-xl font-bold text-primary">Why replace Slack & Intercom?</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-display text-muted-foreground">Slack + Intercom</th>
                <th className="text-left py-2 font-display text-muted-foreground">DIAL</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground">$15/user/mo + $100+/mo</td>
                <td className="py-2 text-primary font-bold">$15/mo (whole team)</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground">30% price hike in 2025</td>
                <td className="py-2 text-primary font-bold">Fixed price, no surprises</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground">No CRM integration (requires Zapier)</td>
                <td className="py-2 text-primary font-bold">Native CINQ integration</td>
              </tr>
              <tr>
                <td className="py-2 text-muted-foreground">Support: 1.4/5 on Trustpilot</td>
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
          
            When a CINQ deal is won, DIAL automatically creates an onboarding channel.
            When a support ticket is escalated, the agent sees the full deal history in the sidebar.
          
        </p>
      </div>

      <div className="mt-12">
        <h2 className="font-display text-2xl font-bold text-center">
          Ready to escape Slack & Intercom?
        </h2>
        <p className="mt-2 text-center text-muted-foreground">
          Start with DIAL for $15/mo. No credit card required for the trial.
        </p>
        <div className="mt-6">
          <WaitlistForm />
        </div>
      </div>
    </div>
  );
}
