"use client";

import Image from "next/image";
import Link from "next/link";
import { Trans } from "@lingui/react/macro";
import { WaitlistForm } from "@/components/waitlist-form";

export default function CinqPage() {
  return (
    <div className="container section-padding max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <Link href="/" className="text-primary hover:underline text-sm inline-block mb-6">
        <Trans>← Back to home</Trans>
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
      <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold">
        <Trans>HubSpot charges $1,200/mo. CINQ does the same for $15.</Trans>
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        <Trans>CINQ is a full CRM – contacts, deals, pipeline, activities, email tracking, and custom fields. And it's natively connected to DIAL (chat) and VISTA (analytics). No per‑user fees. No 3‑year lock‑in.</Trans>
      </p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        <div className="p-6 rounded-lg border border-border bg-card/30 overflow-x-auto">
          <h2 className="font-display text-xl font-bold text-primary">
            <Trans>Features</Trans>
          </h2>
          <ul className="mt-4 space-y-2 text-muted-foreground">
            <li>• <Trans>Contacts & Deals (visual pipeline)</Trans></li>
            <li>• <Trans>Activities (notes, calls, emails)</Trans></li>
            <li>• <Trans>CSV Import/Export (migrate from HubSpot)</Trans></li>
            <li>• <Trans>Custom fields (JSONB, fast filtering)</Trans></li>
            <li>• <Trans>Email tracking (opens, clicks)</Trans></li>
            <li>• <Trans>Native integration with DIAL, SPARK, VISTA</Trans></li>
          </ul>
        </div>

        <div className="p-6 rounded-lg border border-border bg-card/30 overflow-x-auto">
          <h2 className="font-display text-xl font-bold text-primary">
            <Trans>Why replace HubSpot?</Trans>
          </h2>
          <div className="overflow-x-auto"><table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-display text-muted-foreground">
                  <Trans>HubSpot</Trans>
                </th>
                <th className="text-left py-2 font-display text-muted-foreground">
                  <Trans>CINQ</Trans>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground"><Trans>$20–$800/mo</Trans></td>
                <td className="py-2 text-primary font-bold"><Trans>$15/mo</Trans></td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground"><Trans>3‑year contract</Trans></td>
                <td className="py-2 text-primary font-bold"><Trans>1‑click cancel</Trans></td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground"><Trans>Integrations via Zapier (extra cost)</Trans></td>
                <td className="py-2 text-primary font-bold"><Trans>Native integrations included</Trans></td>
              </tr>
              <tr>
                <td className="py-2 text-muted-foreground"><Trans>Support: 1.6/5 on Trustpilot</Trans></td>
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
          <Trans>When a deal is won in CINQ, it automatically triggers DIAL channels, PIVOT tasks, and VISTA dashboards. No Zapier. No webhooks. Just one unified outbox.</Trans>
        </p>
      </div>

      <div className="mt-12">
        <h2 className="font-display text-2xl font-bold text-center">
          <Trans>Ready to escape HubSpot?</Trans>
        </h2>
        <p className="mt-2 text-center text-muted-foreground">
          <Trans>Start with CINQ for $15/mo (or get all 10 for $79/mo). No credit card required for the trial.</Trans>
        </p>
        <div className="mt-6">
          <WaitlistForm />
        </div>
      </div>
    </div>
  );
}
