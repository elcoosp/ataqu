import { Trans } from "@lingui/react/macro";
import { WaitlistForm } from "@/components/waitlist-form";
import { AppGrid } from "@/components/app-grid";
import { PricingComparison } from "@/components/pricing-comparison";
import { EscapeHatch } from "@/components/escape-hatch";
import { ArchitectureProof } from "@/components/architecture-proof";

export default function Home() {
  return (
    <main className="container section-padding space-y-20 md:space-y-28">
      {/* Hero */}
      <section className="text-center max-w-3xl mx-auto">
        <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight">
          <Trans>
            The <span className="text-primary">Calm Predator</span> of Productivity
          </Trans>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          <Trans>
            10 essential apps, one unified price. No per‑user fees, no lock‑in.
            Join the waitlist and be first to access the suite.
          </Trans>
        </p>
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
          <a
            href="#waitlist"
            className="inline-block rounded-md bg-primary px-8 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Trans>Join the waitlist</Trans>
          </a>
          <a
            href="/alternatives/hubspot"
            className="inline-block rounded-md border border-border bg-transparent px-8 py-3 font-medium text-foreground transition-colors hover:bg-card"
          >
            <Trans>Compare pricing</Trans>
          </a>
        </div>
      </section>

      {/* The Math */}
      <section>
        <h2 className="font-display text-3xl md:text-4xl font-bold text-center">
          <Trans>HubSpot charges $1,200/mo. Ataqu charges $49.</Trans>
        </h2>
        <p className="mt-4 text-center text-muted-foreground max-w-2xl mx-auto">
          <Trans>Stop paying per user, per task, and per add‑on. Switch to a single, flat rate.</Trans>
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
          <Trans>Join the waitlist</Trans>
        </h2>
        <p className="mt-4 text-center text-muted-foreground">
          <Trans>Be first to access the suite. No credit card required.</Trans>
        </p>
        <div className="mt-8">
          <WaitlistForm />
        </div>
      </section>
    </main>
  );
}
