"use client";
import Image from "next/image";

import Link from "next/link";
import { WaitlistForm } from "@/components/waitlist-form";

export default function TempoPage() {
  return (
    <div className="container section-padding max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <Link href="/" className="text-primary hover:underline text-sm inline-block mb-6">

        ← Back to home
      </Link>

      <div className="flex justify-center my-4">
        <Image
          src="/apps/tempo.png"
          alt="tempo"
          width={64}
          height={64}
          className="rounded-full border border-primary/20"
        />
      </div>
      <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold">
        Calendly is a scheduling island. TEMPO is built into your OS.
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        
          TEMPO handles booking links, calendar sync, and no‑show detection — natively connected to your CRM.
          No per‑user fees. No separate Zapier workflow. Just native scheduling.
        
      </p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        <div className="p-6 rounded-lg border border-border bg-card/30 overflow-x-auto">
          <h2 className="font-display text-xl font-bold text-primary">Features</h2>
          <ul className="mt-4 space-y-2 text-muted-foreground">
            <li>• Booking links & event types</li>
            <li>• Calendar sync (Google, Outlook)</li>
            <li>• No‑show detection within 15 minutes</li>
            <li>• Automatic reminders (email, SMS)</li>
            <li>• Custom branding & emails</li>
            <li>• Native CRM activity creation</li>
          </ul>
        </div>

        <div className="p-6 rounded-lg border border-border bg-card/30 overflow-x-auto">
          <h2 className="font-display text-xl font-bold text-primary">Why replace Calendly?</h2>
          <div className="overflow-x-auto"><table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-display text-muted-foreground">Calendly</th>
                <th className="text-left py-2 font-display text-muted-foreground">TEMPO</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground">$15/user/mo</td>
                <td className="py-2 text-primary font-bold">$15/mo (whole team)</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground">No‑show detection: 24 hours</td>
                <td className="py-2 text-primary font-bold">No‑show detection: 15 minutes</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground">No CRM integration (requires Zapier)</td>
                <td className="py-2 text-primary font-bold">Native CINQ activity creation</td>
              </tr>
              <tr>
                <td className="py-2 text-muted-foreground">Support: 3.6/5 on Trustpilot</td>
                <td className="py-2 text-primary font-bold">Human support, 24h SLA</td>
              </tr>
            </tbody>
          </table></div></div>

      <div className="mt-12 p-6 rounded-lg border border-primary/30 bg-card/50">
        <h2 className="font-display text-2xl font-bold text-primary">
          Native integration across the OS
        </h2>
        <p className="mt-2 text-muted-foreground">
          
            When a prospect books a meeting, TEMPO creates a CINQ activity, alerts the rep in DIAL,
            and pauses a SPARK outreach sequence. When a meeting is missed, the follow‑up is triggered within minutes.
          
        </p>
      </div>

      <div className="mt-12">
        <h2 className="font-display text-2xl font-bold text-center">
          Ready to escape Calendly?
        </h2>
        <p className="mt-2 text-center text-muted-foreground">
          Start with tempo for $15/mo (or get all 10 for $79/mo). No credit card required for the trial.
        </p>
        <div className="mt-6">
          <WaitlistForm />
        </div>
      </div>
    </div>
  );
}
