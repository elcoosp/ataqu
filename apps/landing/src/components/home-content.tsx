"use client";

import { useState } from "react";
import { Trans } from "@lingui/react/macro";
import { WaitlistForm } from "@/components/waitlist-form";
import { AppGrid } from "@/components/app-grid";
import { PricingComparison } from "@/components/pricing-comparison";
import { EscapeHatch } from "@/components/escape-hatch";
import { ArchitectureProof } from "@/components/architecture-proof";

export function HomeContent() {
  const [preselectedApps, setPreselectedApps] = useState<string[]>([]);

  const handleWedgeClick = (apps: string[]) => {
    setPreselectedApps(apps);
    document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main className="container section-padding space-y-20 md:space-y-28">
      {/* Hero */}
      <section className="text-center max-w-3xl mx-auto">
        <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight">
          <Trans>
            HubSpot coûte <span className="text-primary">1 200 $/mois</span>.
            Slack vous taxe par utilisateur.
          </Trans>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          <Trans>
            Ataqu remplace HubSpot, Slack et Notion par une seule plateforme native.
            Pas de lock‑in. Pas de per‑user fees. Commencez par le CRM (CINQ) ou par les docs (PIVOT).
          </Trans>
        </p>
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={() => handleWedgeClick(["cinq"])}
            className="inline-block rounded-md bg-primary px-8 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Trans>Démarrer avec CINQ (CRM)</Trans>
          </button>
          <button
            onClick={() => handleWedgeClick(["pivot"])}
            className="inline-block rounded-md border border-border bg-transparent px-8 py-3 font-medium text-foreground transition-colors hover:bg-card"
          >
            <Trans>Démarrer avec PIVOT (Docs)</Trans>
          </button>
        </div>
      </section>

      {/* The Math */}
      <section>
        <h2 className="font-display text-3xl md:text-4xl font-bold text-center">
          <Trans>Compare the cost of your fragmented SaaS stack</Trans>
        </h2>
        <p className="mt-4 text-center text-muted-foreground max-w-2xl mx-auto">
          <Trans>Start at $15/mo for one app, $39 for 5, or $79 for all 10. No per‑user fees, no lock‑in.</Trans>
        </p>
        <div className="mt-8">
          <PricingComparison />
        </div>
        <div className="text-center mt-6">
          <a href="/alternatives/hubspot" className="text-primary hover:underline text-sm">
            <Trans>See full comparison →</Trans>
          </a>
        </div>
      </section>

      {/* Apps Grid */}
      <section>
        <h2 className="font-display text-3xl md:text-4xl font-bold text-center">
          <Trans>10 apps. One suite. Natively integrated.</Trans>
        </h2>
        <p className="mt-4 text-center text-muted-foreground max-w-2xl mx-auto">
          <Trans>Replace your fragmented stack with a single, unified operating system.</Trans>
        </p>
        <div className="mt-8">
          <AppGrid />
        </div>
      </section>

      {/* Architecture Proof */}
      <section>
        <h2 className="font-display text-3xl md:text-4xl font-bold text-center">
          <Trans>Built in Rust. Powered by PostgreSQL. Engineered for performance.</Trans>
        </h2>
        <div className="mt-8">
          <ArchitectureProof />
        </div>
      </section>

      {/* Escape Hatch */}
      <section>
        <h2 className="font-display text-3xl md:text-4xl font-bold text-center">
          <Trans>Want to leave? One click. Your data belongs to you.</Trans>
        </h2>
        <p className="mt-4 text-center text-muted-foreground max-w-2xl mx-auto">
          <Trans>No 3‑year lock‑in. No retention specialists. Just 1 click.</Trans>
        </p>
        <div className="mt-8">
          <EscapeHatch />
        </div>
      </section>

      {/* Waitlist */}
      <section id="waitlist" className="max-w-2xl mx-auto">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-center">
          <Trans>Join the waitlist – from $15/mo (5 apps $39, 10 apps $79)</Trans>
        </h2>
        <p className="mt-4 text-center text-muted-foreground">
          <Trans>Be first to access the suite. No credit card required.</Trans>
        </p>
        <div className="mt-8">
          <WaitlistForm preselectedApps={preselectedApps} />
        </div>
      </section>
    </main>
  );
}
