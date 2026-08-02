"use client";

import Image from "next/image";
import Link from "next/link";
import { Trans } from "@lingui/react/macro";
import { WaitlistForm } from "@/components/waitlist-form";

export default function VistaPage() {
  return (
    <div className="container section-padding max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <Link href="/" className="text-primary hover:underline text-sm inline-block mb-6">
        <Trans>← Back to home</Trans>
      </Link>

      <div className="flex justify-center my-4">
        <Image
          src="/apps/vista.png"
          alt="vista"
          width={64}
          height={64}
          className="rounded-full border border-primary/20"
        />
      </div>
      <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold">
        <Trans>Tableau is an ETL nightmare. VISTA is real‑time analytics, natively connected.</Trans>
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        <Trans>VISTA provides real‑time dashboards, KPIs, and custom SQL — no ETL, no data engineering. Dashboards update via SSE and read directly from your production database.</Trans>
      </p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        <div className="p-6 rounded-lg border border-border bg-card/30 overflow-x-auto">
          <h2 className="font-display text-xl font-bold text-primary">
            <Trans>Features</Trans>
          </h2>
          <ul className="mt-4 space-y-2 text-muted-foreground">
            <li>• <Trans>Real‑time dashboards (SSE)</Trans></li>
            <li>• <Trans>KPIs & charts (bar, line, pie)</Trans></li>
            <li>• <Trans>Drag‑and‑drop filters</Trans></li>
            <li>• <Trans>Custom SQL for power users</Trans></li>
            <li>• <Trans>Export to CSV, PDF, PNG</Trans></li>
            <li>• <Trans>Native data from all 10 apps</Trans></li>
          </ul>
        </div>

        <div className="p-6 rounded-lg border border-border bg-card/30 overflow-x-auto">
          <h2 className="font-display text-xl font-bold text-primary">
            <Trans>Why replace Tableau?</Trans>
          </h2>
          <div className="overflow-x-auto"><table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-display text-muted-foreground">
                  <Trans>Tableau</Trans>
                </th>
                <th className="text-left py-2 font-display text-muted-foreground">
                  <Trans>VISTA</Trans>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground"><Trans>$75/user/mo</Trans></td>
                <td className="py-2 text-primary font-bold"><Trans>$15/mo (whole team)</Trans></td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground"><Trans>Requires ETL pipelines</Trans></td>
                <td className="py-2 text-primary font-bold"><Trans>No ETL — native data</Trans></td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground"><Trans>Data engineering required</Trans></td>
                <td className="py-2 text-primary font-bold"><Trans>Zero configuration</Trans></td>
              </tr>
              <tr>
                <td className="py-2 text-muted-foreground"><Trans>Support: 1.9/5 on Trustpilot</Trans></td>
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
          <Trans>VISTA reads directly from the same PostgreSQL database as your apps. When a deal is won in CINQ, the revenue dashboard updates via SSE in milliseconds. No ETL. No data pipelines.</Trans>
        </p>
      </div>

      <div className="mt-12">
        <h2 className="font-display text-2xl font-bold text-center">
          <Trans>Ready to escape Tableau?</Trans>
        </h2>
        <p className="mt-2 text-center text-muted-foreground">
          <Trans>Start with VISTA for $15/mo (or get all 10 for $79/mo). No credit card required for the trial.</Trans>
        </p>
        <div className="mt-6">
          <WaitlistForm />
        </div>
      </div>
    </div>
  );
}
