import { Trans } from "@lingui/react";
import { WaitlistForm } from "@/components/waitlist-form";

export default function HomePage() {
  return (
    <main className="container py-12 md:py-20">
      <section className="text-center max-w-3xl mx-auto">
        <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight">
          <Trans
            id="home.heading"
            message="The <0>Calm Predator</0> of Productivity"
            components={{ 0: <span className="text-primary" /> }}
          />
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          <Trans
            id="home.subtitle"
            message="10 essential apps, one unified price. No per‑user fees, no lock‑in. Join the waitlist and be first to access the suite."
          />
        </p>
        <div className="mt-8">
          <WaitlistForm />
        </div>
      </section>
    </main>
  );
}
