"use client";
import Image from "next/image";

import Link from "next/link";
import { WaitlistForm } from "@/components/waitlist-form";

export default function CinqPage() {
  return (
    <div className="container section-padding max-w-4xl mx-auto">
      <Link href="/" className="text-primary hover:underline text-sm inline-block mb-6">

        ← Back to home
      </Link>

      <div className="flex justify-center my-4">
        <Image
          src="/apps/cinq.png"
          alt="cinq"
          width={64}
          height={64}
          className="rounded-full border border-primary/20"
        />
      </div>
      <h1 className="font-display text-4xl md:text-5xl font-bold">
        HubSpot charges $1,200/mo. CINQ does the same for $15.
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        
          CINQ is a full CRM – contacts, deals, pipeline, activities, email tracking, and custom fields.
          And it's natively connected to DIAL (chat) and VISTA (analytics). No per‑user fees. No 3‑year lock‑in.
        
      </p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-6 rounded-lg border border-border bg-card/30">
          <h2 className="font-display text-xl font-bold text-primary">Features</h2>
          <ul className="mt-4 space-y-2 text-muted-foreground">
            <li>• Contacts & Deals (visual pipeline)</li>
            <li>• Activities (notes, calls, emails)</li>
            <li>• CSV Import/Export (migrate from HubSpot)</li>
            <li>• Custom fields (JSONB, fast filtering)</li>
            <li>• Email tracking (opens, clicks)</li>
            <li>• Native integration with DIAL, SPARK, VISTA</li>
          </ul>
        </div>

        <div className="p-6 rounded-lg border border-border bg-card/30">
          <h2 className="font-display text-xl font-bold text-primary">Why replace HubSpot?</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-display text-muted-foreground">HubSpot</th>
                <th className="text-left py-2 font-display text-muted-foreground">CINQ</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground">$20–$800/mo</td>
                <td className="py-2 text-primary font-bold">$15/mo</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground">3‑year contract</td>
                <td className="py-2 text-primary font-bold">1‑click cancel</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground">Integrations via Zapier (extra cost)</td>
                <td className="py-2 text-primary font-bold">Native integrations included</td>
              </tr>
              <tr>
                <td className="py-2 text-muted-foreground">Support: 1.6/5 on Trustpilot</td>
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
          
            When a deal is won in CINQ, it automatically triggers DIAL channels, PIVOT tasks, and VISTA dashboards.
            No Zapier. No webhooks. Just one unified outbox.
          
        </p>
      </div>

      <div className="mt-12">
        <h2 className="font-display text-2xl font-bold text-center">
          Ready to escape HubSpot?
        </h2>
        <p className="mt-2 text-center text-muted-foreground">
          Start with cinq for $15/mo (or get all 10 for $79/mo). No credit card required for the trial.
        </p>
        <div className="mt-6">
          <WaitlistForm />
        </div>
      </div>
    </div>
  );
}
