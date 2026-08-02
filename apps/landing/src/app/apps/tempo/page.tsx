"use client";

import Image from "next/image";
import Link from "next/link";
import { Trans } from "@lingui/react/macro";
import { WaitlistForm } from "@/components/waitlist-form";

export default function TempoPage() {
  return (
    <div className="container section-padding max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <Link href="/" className="text-primary hover:underline text-sm inline-block mb-6">
        <Trans>← Back to home</Trans>
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
        <Trans>Calendly is a scheduling island. TEMPO is built into your OS.</Trans>
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        <Trans>TEMPO handles booking links, calendar sync, and no‑show detection — natively connected to your CRM. No per‑user fees. No separate Zapier workflow. Just native scheduling.</Trans>
      </p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        <div className="p-6 rounded-lg border border-border bg-card/30 overflow-x-auto">
          <h2 className="font-display text-xl font-bold text-primary">
            <Trans>Features</Trans>
          </h2>
          <ul className="mt-4 space-y-2 text-muted-foreground">
            <li>• <Trans>Booking links & event types</Trans></li>
            <li>• <Trans>Calendar sync (Google, Outlook)</Trans></li>
            <li>• <Trans>No‑show detection within 15 minutes</Trans></li>
            <li>• <Trans>Automatic reminders (email, SMS)</Trans></li>
            <li>• <Trans>Custom branding & emails</Trans></li>
            <li>• <Trans>Native CRM activity creation</Trans></li>
          </ul>
        </div>

        <div className="p-6 rounded-lg border border-border bg-card/30 overflow-x-auto">
          <h2 className="font-display text-xl font-bold text-primary">
            <Trans>Why replace Calendly?</Trans>
          </h2>
          <div className="overflow-x-auto"><table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-display text-muted-foreground">
                  <Trans>Calendly</Trans>
                </th>
                <th className="text-left py-2 font-display text-muted-foreground">
                  <Trans>TEMPO</Trans>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground"><Trans>$15/user/mo</Trans></td>
                <td className="py-2 text-primary font-bold"><Trans>$15/mo (whole team)</Trans></td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground"><Trans>No‑show detection: 24 hours</Trans></td>
                <td className="py-2 text-primary font-bold"><Trans>No‑show detection: 15 minutes</Trans></td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground"><Trans>No CRM integration (requires Zapier)</Trans></td>
                <td className="py-2 text-primary font-bold"><Trans>Native CINQ activity creation</Trans></td>
              </tr>
              <tr>
                <td className="py-2 text-muted-foreground"><Trans>Support: 3.6/5 on Trustpilot</Trans></td>
                <td className="py-2 text-primary font-bold"><Trans>Human support, 24h SLA</Trans></td>
              </tr>
            </tbody>
          </table></div>
        </div>
      </div>

      <div className="mt-12 p-6 rounded-lg border border-primary/30 bg-card/50">
        <h2 className="font-display text-2xl font-bold text-primary">
          <Trans>Native integration across the OS</Trans>
        </h2>
        <p className="mt-2 text-muted-foreground">
          <Trans>When a prospect books a meeting, TEMPO creates a CINQ activity, alerts the rep in DIAL, and pauses a SPARK outreach sequence. When a meeting is missed, the follow‑up is triggered within minutes.</Trans>
        </p>
      </div>

      <div className="mt-12">
        <h2 className="font-display text-2xl font-bold text-center">
          <Trans>Ready to escape Calendly?</Trans>
        </h2>
        <p className="mt-2 text-center text-muted-foreground">
          <Trans>Start with TEMPO for $15/mo (or get all 10 for $79/mo). No credit card required for the trial.</Trans>
        </p>
        <div className="mt-6">
          <WaitlistForm />
        </div>
      </div>
    </div>
  );
}
