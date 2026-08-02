"use client";

import Image from "next/image";
import Link from "next/link";
import { Trans } from "@lingui/react/macro";
import { WaitlistForm } from "@/components/waitlist-form";

export default function DialPage() {
  return (
    <div className="container section-padding max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <Link href="/" className="text-primary hover:underline text-sm inline-block mb-6">
        <Trans>← Back to home</Trans>
      </Link>

      <div className="flex justify-center my-4">
        <Image
          src="/apps/dial.png"
          alt="dial"
          width={64}
          height={64}
          className="rounded-full border border-primary/20"
        />
      </div>
      <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold">
        <Trans>Slack taxes your team. Intercom taxes your customers. DIAL unites both.</Trans>
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        <Trans>DIAL combines internal team chat and external customer support in one natively secure workspace. No per‑user fees. No separate Intercom license. And it's natively connected to CINQ.</Trans>
      </p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        <div className="p-6 rounded-lg border border-border bg-card/30 overflow-x-auto">
          <h2 className="font-display text-xl font-bold text-primary">
            <Trans>Features</Trans>
          </h2>
          <ul className="mt-4 space-y-2 text-muted-foreground">
            <li>• <Trans>Channels (public & private)</Trans></li>
            <li>• <Trans>Threads, mentions, reactions</Trans></li>
            <li>• <Trans>Unified support ticket inbox</Trans></li>
            <li>• <Trans>File sharing & search (PostgreSQL tsvector)</Trans></li>
            <li>• <Trans>Native CRM integration (CINQ deals in the sidebar)</Trans></li>
            <li>• <Trans>Real‑time presence & notifications</Trans></li>
          </ul>
        </div>

        <div className="p-6 rounded-lg border border-border bg-card/30 overflow-x-auto">
          <h2 className="font-display text-xl font-bold text-primary">
            <Trans>Why replace Slack + Intercom?</Trans>
          </h2>
          <div className="overflow-x-auto"><table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-display text-muted-foreground">
                  <Trans>Slack + Intercom</Trans>
                </th>
                <th className="text-left py-2 font-display text-muted-foreground">
                  <Trans>DIAL</Trans>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground"><Trans>$15/user/mo + $100+/mo</Trans></td>
                <td className="py-2 text-primary font-bold"><Trans>$15/mo (whole team)</Trans></td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground"><Trans>30% price hike in 2025</Trans></td>
                <td className="py-2 text-primary font-bold"><Trans>Fixed price, no surprises</Trans></td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground"><Trans>No CRM integration (requires Zapier)</Trans></td>
                <td className="py-2 text-primary font-bold"><Trans>Native CINQ integration</Trans></td>
              </tr>
              <tr>
                <td className="py-2 text-muted-foreground"><Trans>Support: 1.4/5 on Trustpilot</Trans></td>
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
          <Trans>When a CINQ deal is won, DIAL automatically creates an onboarding channel. When a support ticket is escalated, the agent sees the full deal history in the sidebar.</Trans>
        </p>
      </div>

      <div className="mt-12">
        <h2 className="font-display text-2xl font-bold text-center">
          <Trans>Ready to escape Slack + Intercom?</Trans>
        </h2>
        <p className="mt-2 text-center text-muted-foreground">
          <Trans>Start with DIAL for $15/mo (or get all 10 for $79/mo). No credit card required for the trial.</Trans>
        </p>
        <div className="mt-6">
          <WaitlistForm />
        </div>
      </div>
    </div>
  );
}
