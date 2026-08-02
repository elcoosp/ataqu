"use client";
import Image from "next/image";

import Link from "next/link";
import { WaitlistForm } from "@/components/waitlist-form";

export default function VistaPage() {
  return (
    <div className="container section-padding max-w-4xl mx-auto">
      <Link href="/" className="text-primary hover:underline text-sm inline-block mb-6">

        ← Back to home
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
      <h1 className="font-display text-4xl md:text-5xl font-bold">
        Tableau is an ETL nightmare. VISTA is real‑time analytics, natively connected.
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        
          VISTA provides real‑time dashboards, KPIs, and custom SQL — no ETL, no data engineering.
          Dashboards update via SSE and read directly from your production database.
        
      </p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-6 rounded-lg border border-border bg-card/30">
          <h2 className="font-display text-xl font-bold text-primary">Features</h2>
          <ul className="mt-4 space-y-2 text-muted-foreground">
            <li>• Real‑time dashboards (SSE)</li>
            <li>• KPIs & charts (bar, line, pie)</li>
            <li>• Drag‑and‑drop filters</li>
            <li>• Custom SQL for power users</li>
            <li>• Export to CSV, PDF, PNG</li>
            <li>• Native data from all 10 apps</li>
          </ul>
        </div>

        <div className="p-6 rounded-lg border border-border bg-card/30">
          <h2 className="font-display text-xl font-bold text-primary">Why replace Tableau?</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-display text-muted-foreground">Tableau</th>
                <th className="text-left py-2 font-display text-muted-foreground">VISTA</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground">$75/user/mo</td>
                <td className="py-2 text-primary font-bold">$15/mo (whole team)</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground">Requires ETL pipelines</td>
                <td className="py-2 text-primary font-bold">No ETL — native data</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground">Data engineering required</td>
                <td className="py-2 text-primary font-bold">Zero configuration</td>
              </tr>
              <tr>
                <td className="py-2 text-muted-foreground">Support: 1.9/5 on Trustpilot</td>
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
          
            VISTA reads directly from the same PostgreSQL database as your apps. When a deal is won in CINQ,
            the revenue dashboard updates via SSE in milliseconds. No ETL. No data pipelines.
          
        </p>
      </div>

      <div className="mt-12">
        <h2 className="font-display text-2xl font-bold text-center">
          Ready to escape Tableau?
        </h2>
        <p className="mt-2 text-center text-muted-foreground">
          Start with vista for $15/mo (or get all 10 for $79/mo). No credit card required for the trial.
        </p>
        <div className="mt-6">
          <WaitlistForm />
        </div>
      </div>
    </div>
  );
}
