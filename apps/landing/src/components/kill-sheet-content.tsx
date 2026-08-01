"use client";

import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { WaitlistForm } from "@/components/waitlist-form";
import { PricingComparison } from "@/components/pricing-comparison";

type CompetitorData = {
  name: string;
  tagline: string;
  painPoints: string[];
  ataquAdvantage: string[];
  migrationSteps: string[];
  price: string;
  contract: string;
};

interface Props {
  data: CompetitorData;
  slug: string;
}

export function KillSheetContent({ data, slug }: Props) {
  const { i18n } = useLingui();
  const name = i18n._(data.name);
  const tagline = i18n._(data.tagline);
  const painPoints = data.painPoints.map((p) => i18n._(p));
  const ataquAdvantage = data.ataquAdvantage.map((a) => i18n._(a));
  const migrationSteps = data.migrationSteps.map((s) => i18n._(s));
  const contract = i18n._(data.contract);

  return (
    <main className="container section-padding space-y-12 md:space-y-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
          {name} vs Ataqu: The $49/mo Alternative to {name} Lock‑in
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">{tagline}</p>

        {/* 3‑Year TCO Table */}
        <div className="mt-8">
          <h2 className="font-display text-2xl font-bold">
            <Trans>3‑year Total Cost of Ownership</Trans>
          </h2>
          <div className="mt-4">
            <PricingComparison />
          </div>
        </div>

        {/* Why [Competitor] Fails */}
        <section className="mt-12">
          <h2 className="font-display text-2xl font-bold">
            <Trans>Why {name} Fails</Trans>
          </h2>
          <ul className="mt-4 space-y-3 list-disc list-inside text-muted-foreground">
            {painPoints.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </section>

        {/* How Ataqu Solves It */}
        <section className="mt-12">
          <h2 className="font-display text-2xl font-bold">
            <Trans>How Ataqu Solves It</Trans>
          </h2>
          <ul className="mt-4 space-y-3 list-disc list-inside text-muted-foreground">
            {ataquAdvantage.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </section>

        {/* Migration Path */}
        <section className="mt-12 p-6 rounded-lg border border-primary/30 bg-card/50">
          <h2 className="font-display text-2xl font-bold text-primary">
            <Trans>Your Escape Hatch</Trans>
          </h2>
          <p className="mt-2 text-muted-foreground">
            <Trans>Migrating from {name} is 1 click away.</Trans>
          </p>
          <ol className="mt-4 space-y-2 list-decimal list-inside text-muted-foreground">
            {migrationSteps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
          <div className="mt-6">
            <a
              href="#waitlist"
              className="inline-block rounded-md bg-primary px-8 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Trans>Join the waitlist</Trans>
            </a>
          </div>
        </section>

        {/* Waitlist Form */}
        <section id="waitlist" className="mt-12">
          <h2 className="font-display text-2xl font-bold text-center">
            <Trans>Join the waitlist</Trans>
          </h2>
          <p className="mt-2 text-center text-muted-foreground">
            <Trans>Be first to access the suite. No credit card required.</Trans>
          </p>
          <div className="mt-6">
            <WaitlistForm />
          </div>
        </section>
      </div>
    </main>
  );
}
