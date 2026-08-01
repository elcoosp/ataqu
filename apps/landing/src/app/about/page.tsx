"use client";

import { Trans } from "@lingui/react/macro";

export default function AboutPage() {
  return (
    <div className="container section-padding max-w-3xl mx-auto">
      <h1 className="font-display text-4xl md:text-5xl font-bold text-center">
        <Trans>About Ataqu</Trans>
      </h1>
      <div className="mt-8 space-y-8">
        <section>
          <h2 className="font-display text-2xl font-bold text-primary">
            <Trans>The Consumer Manifesto</Trans>
          </h2>
          <div className="mt-4 space-y-3 text-muted-foreground leading-relaxed">
            <p><Trans>The SaaS market is broken.</Trans></p>
            <p><Trans>Prices that climb without warning. Contracts that trap you. Support that ignores you. Tools that don't talk to each other.</Trans></p>
            <p><Trans>Companies pay a fortune. They're prisoners. They suffer.</Trans></p>
            <p><Trans>We looked at that. We said: "We can do better."</Trans></p>
            <p><Trans>We built Ataqu.</Trans></p>
            <p><Trans>10 business apps, natively integrated. In Rust with PostgreSQL. Fixed price.</Trans></p>
            <p><Trans>$49/month. Everything included.</Trans></p>
            <p><Trans>No lock‑in. Cancel in 1 click.</Trans></p>
            <p><Trans>No bot support. Humans who respond in 24h.</Trans></p>
            <p><Trans>No surprises. No bullshit.</Trans></p>
            <p className="font-display text-lg text-primary"><Trans>Ataqu attacks the market so you don't have to suffer.</Trans></p>
            <p className="font-display text-sm"><Trans>Ataqu. 10 apps, one price, zero lock‑in.</Trans></p>
          </div>
        </section>

        <section>
          <h2 className="font-display text-2xl font-bold text-primary">
            <Trans>The Engineering Manifesto</Trans>
          </h2>
          <div className="mt-4 space-y-3 text-muted-foreground leading-relaxed">
            <p><Trans>We didn't just wrap APIs in a new UI. We eradicated the bloat.</Trans></p>
            <p><Trans>We built a monolithic backend in Rust with PostgreSQL and SeaORM 2.0. We use schemas, PostgreSQL Roles, RLS, Column-Level Privileges, and a type‑safe <code>schema</code> ENUM for hard bounded context isolation. Our unified outbox is driven by <code>LISTEN/NOTIFY</code> for instant event delivery. We use <code>JSONB</code> with graceful degradation for custom field filtering. We enforce strict tenant isolation via private <code>TenantId</code> newtype, database-level roles, RLS, and Column-Level Privileges. PII is redacted at compile time via redacting newtypes with zero runtime overhead; JSON serialization is strictly restricted to the API layer via wrapper structs.</Trans></p>
            <p><Trans>We didn't do this to win architecture awards. We did it because "cheap" shouldn't mean "fragile."</Trans></p>
            <p><Trans>Other SaaS tools break under their own weight. Ataqu is built to last. It is mathematically sound, deterministically fault‑tolerant, and ruthlessly fast.</Trans></p>
            <p className="font-display text-sm"><Trans>Ataqu. Engineered for scale. Priced for everyone.</Trans></p>
          </div>
        </section>
      </div>
    </div>
  );
}
