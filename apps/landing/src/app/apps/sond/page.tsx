"use client";

import { Trans } from "@lingui/react/macro";
import Link from "next/link";
import { WaitlistForm } from "@/components/waitlist-form";

export default function SondPage() {
  return (
    <div className="container section-padding max-w-4xl mx-auto">
      <Link href="/" className="text-primary hover:underline text-sm inline-block mb-6">
        <Trans>← Back to home</Trans>
      </Link>

      <h1 className="font-display text-4xl md:text-5xl font-bold">
        <Trans>Typeform taxes your success. SOND gives you unlimited responses.</Trans>
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        <Trans>
          SOND is a drag‑and‑drop form builder with unlimited responses, native CRM integration,
          and no per‑response fees. Conditional logic, email notifications, and custom branding included.
        </Trans>
      </p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-6 rounded-lg border border-border bg-card/30">
          <h2 className="font-display text-xl font-bold text-primary"><Trans>Features</Trans></h2>
          <ul className="mt-4 space-y-2 text-muted-foreground">
            <li>• <Trans>Visual drag‑and‑drop builder</Trans></li>
            <li>• <Trans>Unlimited responses — no per‑response fees</Trans></li>
            <li>• <Trans>Conditional logic & branching</Trans></li>
            <li>• <Trans>Email notifications included</Trans></li>
            <li>• <Trans>Custom branding (remove SOND logo)</Trans></li>
            <li>• <Trans>Native CINQ lead creation & SPARK triggers</Trans></li>
          </ul>
        </div>

        <div className="p-6 rounded-lg border border-border bg-card/30">
          <h2 className="font-display text-xl font-bold text-primary"><Trans>Why replace Typeform?</Trans></h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-display text-muted-foreground"><Trans>Typeform</Trans></th>
                <th className="text-left py-2 font-display text-muted-foreground"><Trans>SOND</Trans></th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground">$40/mo (10 free responses)</td>
                <td className="py-2 text-primary font-bold">$15/mo (unlimited)</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground"><Trans>Email notifications are paid add‑on</Trans></td>
                <td className="py-2 text-primary font-bold"><Trans>Notifications included</Trans></td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground"><Trans>No CRM integration (requires Zapier)</Trans></td>
                <td className="py-2 text-primary font-bold"><Trans>Native CINQ lead creation</Trans></td>
              </tr>
              <tr>
                <td className="py-2 text-muted-foreground"><Trans>Support: 2.4/5 on Trustpilot</Trans></td>
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
            When a form is submitted, SOND creates a CINQ lead, triggers a SPARK workflow,
            and notifies the team in DIAL. No Zapier. No webhooks.
          </Trans>
        </p>
      </div>

      <div className="mt-12">
        <h2 className="font-display text-2xl font-bold text-center">
          <Trans>Ready to escape Typeform?</Trans>
        </h2>
        <p className="mt-2 text-center text-muted-foreground">
          <Trans>Start with SOND for $15/mo. No credit card required for the trial.</Trans>
        </p>
        <div className="mt-6">
          <WaitlistForm />
        </div>
      </div>
    </div>
  );
}
