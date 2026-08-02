"use client";

import Image from "next/image";
import Link from "next/link";
import { Trans } from "@lingui/react/macro";
import { WaitlistForm } from "@/components/waitlist-form";

export default function PausePage() {
  return (
    <div className="container section-padding max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <Link href="/" className="text-primary hover:underline text-sm inline-block mb-6">
        <Trans>← Back to home</Trans>
      </Link>

      <div className="flex justify-center my-4">
        <Image
          src="/apps/pause.png"
          alt="pause"
          width={64}
          height={64}
          className="rounded-full border border-primary/20"
        />
      </div>
      <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold">
        <Trans>Personio is a compliance silo. PAUSE connects HR to operations.</Trans>
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        <Trans>PAUSE handles employee onboarding, leave requests, and approvals — natively connected to AEGIS and TEMPO. No payroll complexity. Just essential HR with native security.</Trans>
      </p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        <div className="p-6 rounded-lg border border-border bg-card/30 overflow-x-auto">
          <h2 className="font-display text-xl font-bold text-primary">
            <Trans>Features</Trans>
          </h2>
          <ul className="mt-4 space-y-2 text-muted-foreground">
            <li>• <Trans>Employee directory (searchable)</Trans></li>
            <li>• <Trans>Leave requests & approvals (3 clicks)</Trans></li>
            <li>• <Trans>Centralized documents (contracts, payslips)</Trans></li>
            <li>• <Trans>Onboarding workflows</Trans></li>
            <li>• <Trans>Native AEGIS deprovisioning</Trans></li>
            <li>• <Trans>TEMPO calendar integration</Trans></li>
          </ul>
        </div>

        <div className="p-6 rounded-lg border border-border bg-card/30 overflow-x-auto">
          <h2 className="font-display text-xl font-bold text-primary">
            <Trans>Why replace Personio?</Trans>
          </h2>
          <div className="overflow-x-auto"><table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-display text-muted-foreground">
                  <Trans>Personio</Trans>
                </th>
                <th className="text-left py-2 font-display text-muted-foreground">
                  <Trans>PAUSE</Trans>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground"><Trans>$15/user/mo</Trans></td>
                <td className="py-2 text-primary font-bold"><Trans>$15/mo (whole team)</Trans></td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground"><Trans>No native AEGIS integration</Trans></td>
                <td className="py-2 text-primary font-bold"><Trans>Auto‑deprovisioning via AEGIS</Trans></td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground"><Trans>Support degrades after signing</Trans></td>
                <td className="py-2 text-primary font-bold"><Trans>Human support, 24h SLA</Trans></td>
              </tr>
              <tr>
                <td className="py-2 text-muted-foreground"><Trans>Lock‑in: difficult to cancel</Trans></td>
                <td className="py-2 text-primary font-bold"><Trans>1‑click cancel & export</Trans></td>
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
          <Trans>When an employee is offboarded in PAUSE, AEGIS instantly revokes access to all apps. When leave is approved, TEMPO blocks the calendar automatically.</Trans>
        </p>
      </div>

      <div className="mt-12">
        <h2 className="font-display text-2xl font-bold text-center">
          <Trans>Ready to escape Personio?</Trans>
        </h2>
        <p className="mt-2 text-center text-muted-foreground">
          <Trans>Start with one app for $15/mo (or get all 10 for $79/mo). No credit card required for the trial.</Trans>
        </p>
        <div className="mt-6">
          <WaitlistForm />
        </div>
      </div>
    </div>
  );
}
