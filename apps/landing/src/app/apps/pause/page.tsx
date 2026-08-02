"use client";
import Image from "next/image";

import Link from "next/link";
import { WaitlistForm } from "@/components/waitlist-form";

export default function PausePage() {
  return (
    <div className="container section-padding max-w-4xl mx-auto">
      <Link href="/" className="text-primary hover:underline text-sm inline-block mb-6">
      <div className="flex justify-center my-4">
        <Image
          src="/apps/pause.png"
          alt="pause"
          width={80}
          height={80}
          className="rounded-full border border-primary/20"
        />
      </div>
      <div className="flex justify-center my-4">
        <Image
          src="/apps/pause.png"
          alt="pause"
          width={80}
          height={80}
          className="rounded-full border border-primary/20"
        />
      </div>
        ← Back to home
      </Link>

      <h1 className="font-display text-4xl md:text-5xl font-bold">
        Personio is a compliance silo. PAUSE connects HR to operations.
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        
          PAUSE handles employee onboarding, leave requests, and approvals — natively connected to AEGIS and TEMPO.
          No payroll complexity. Just essential HR with native security.
        
      </p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-6 rounded-lg border border-border bg-card/30">
          <h2 className="font-display text-xl font-bold text-primary">Features</h2>
          <ul className="mt-4 space-y-2 text-muted-foreground">
            <li>• Employee directory (searchable)</li>
            <li>• Leave requests & approvals (3 clicks)</li>
            <li>• Centralized documents (contracts, payslips)</li>
            <li>• Onboarding workflows</li>
            <li>• Native AEGIS deprovisioning</li>
            <li>• TEMPO calendar integration</li>
          </ul>
        </div>

        <div className="p-6 rounded-lg border border-border bg-card/30">
          <h2 className="font-display text-xl font-bold text-primary">Why replace Personio?</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-display text-muted-foreground">Personio</th>
                <th className="text-left py-2 font-display text-muted-foreground">PAUSE</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground">$15/user/mo</td>
                <td className="py-2 text-primary font-bold">$15/mo (whole team)</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground">No native AEGIS integration</td>
                <td className="py-2 text-primary font-bold">Auto‑deprovisioning via AEGIS</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground">Support degrades after signing</td>
                <td className="py-2 text-primary font-bold">Human support, 24h SLA</td>
              </tr>
              <tr>
                <td className="py-2 text-muted-foreground">Lock‑in: difficult to cancel</td>
                <td className="py-2 text-primary font-bold">1‑click cancel & export</td>
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
          
            When an employee is offboarded in PAUSE, AEGIS instantly revokes access to all apps.
            When leave is approved, TEMPO blocks the calendar automatically.
          
        </p>
      </div>

      <div className="mt-12">
        <h2 className="font-display text-2xl font-bold text-center">
          Ready to escape Personio?
        </h2>
        <p className="mt-2 text-center text-muted-foreground">
          Start with pause for $15/mo (or get all 10 for $79/mo). No credit card required for the trial.
        </p>
        <div className="mt-6">
          <WaitlistForm />
        </div>
      </div>
    </div>
  );
}
