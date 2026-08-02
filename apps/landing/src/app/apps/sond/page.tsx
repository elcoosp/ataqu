"use client";
import Image from "next/image";

import Link from "next/link";
import { WaitlistForm } from "@/components/waitlist-form";

export default function SondPage() {
  return (
    <div className="container section-padding max-w-4xl mx-auto">
      <Link href="/" className="text-primary hover:underline text-sm inline-block mb-6">

        ← Back to home
      </Link>

      <div className="flex justify-center my-4">
        <Image
          src="/apps/sond.png"
          alt="sond"
          width={64}
          height={64}
          className="rounded-full border border-primary/20"
        />
      </div>
      <h1 className="font-display text-4xl md:text-5xl font-bold">
        Typeform taxes your success. SOND gives you unlimited responses.
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        
          SOND is a drag‑and‑drop form builder with unlimited responses, native CRM integration,
          and no per‑response fees. Conditional logic, email notifications, and custom branding included.
        
      </p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-6 rounded-lg border border-border bg-card/30">
          <h2 className="font-display text-xl font-bold text-primary">Features</h2>
          <ul className="mt-4 space-y-2 text-muted-foreground">
            <li>• Visual drag‑and‑drop builder</li>
            <li>• Unlimited responses — no per‑response fees</li>
            <li>• Conditional logic & branching</li>
            <li>• Email notifications included</li>
            <li>• Custom branding (remove SOND logo)</li>
            <li>• Native CINQ lead creation & SPARK triggers</li>
          </ul>
        </div>

        <div className="p-6 rounded-lg border border-border bg-card/30">
          <h2 className="font-display text-xl font-bold text-primary">Why replace Typeform?</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-display text-muted-foreground">Typeform</th>
                <th className="text-left py-2 font-display text-muted-foreground">SOND</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground">$40/mo (10 free responses)</td>
                <td className="py-2 text-primary font-bold">$15/mo (unlimited)</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground">Email notifications are paid add‑on</td>
                <td className="py-2 text-primary font-bold">Notifications included</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground">No CRM integration (requires Zapier)</td>
                <td className="py-2 text-primary font-bold">Native CINQ lead creation</td>
              </tr>
              <tr>
                <td className="py-2 text-muted-foreground">Support: 2.4/5 on Trustpilot</td>
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
          
            When a form is submitted, SOND creates a CINQ lead, triggers a SPARK workflow,
            and notifies the team in DIAL. No Zapier. No webhooks.
          
        </p>
      </div>

      <div className="mt-12">
        <h2 className="font-display text-2xl font-bold text-center">
          Ready to escape Typeform?
        </h2>
        <p className="mt-2 text-center text-muted-foreground">
          Start with sond for $15/mo (or get all 10 for $79/mo). No credit card required for the trial.
        </p>
        <div className="mt-6">
          <WaitlistForm />
        </div>
      </div>
    </div>
  );
}
