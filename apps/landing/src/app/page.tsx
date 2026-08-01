import { Trans } from "@lingui/react/macro";
import { WaitlistForm } from "@/components/waitlist-form";

export default function HomePage() {
  return (
    <main className="container py-12 md:py-20">
      <section className="text-center max-w-3xl mx-auto">
        <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight">
          <Trans>The <span className="text-primary">Calm Predator</span> of Productivity</Trans>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          <Trans>
            10 essential apps, one unified price. No per‑user fees, no lock‑in.
            Join the waitlist and be first to access the suite.
          </Trans>
        </p>
        <div className="mt-8">
          <WaitlistForm />
        </div>
      </section>
    </main>
  );
}
