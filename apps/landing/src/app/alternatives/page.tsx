import Link from "next/link";

const COMPETITORS = [
  { slug: "hubspot", label: "HubSpot", description: "CRM & sales hub — 3‑year lock‑in and hidden paywalls." },
  { slug: "slack", label: "Slack", description: "Team chat — per‑user fees and 30% price hikes." },
  { slug: "zapier", label: "Zapier", description: "Automation — brittle webhooks and task limits." },
  { slug: "notion", label: "Notion", description: "Docs & databases — slow search and trapped data." },
  { slug: "zoho-one", label: "Zoho One", description: "Suite — 45 apps, clunky UI, per‑user pricing." },
  { slug: "calendly", label: "Calendly", description: "Scheduling — no CRM integration, delayed no‑show." },
  { slug: "typeform", label: "Typeform", description: "Forms — response limits and paywalled features." },
  { slug: "cin7", label: "Cin7", description: "Inventory — siloed warehouse, AI bloat." },
  { slug: "personio", label: "Personio", description: "HR — manual deprovisioning, expensive." },
  { slug: "okta", label: "Okta", description: "SSO — per‑user fees, no HR sync." },
  { slug: "tableau", label: "Tableau", description: "Analytics — ETL nightmare, expensive per‑user." },
];

export default function AlternativesPage() {
  return (
    <div className="container section-padding">
      <h1 className="font-display text-4xl md:text-5xl font-bold text-center">
        Ataqu vs. the Fragmented Stack
      </h1>
      <p className="mt-4 text-center text-muted-foreground max-w-2xl mx-auto">
        
          See how Ataqu compares to each competitor. We expose the pricing flaws,
          lock‑in clauses, and architectural gaps – and show you a better way.
        
      </p>
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {COMPETITORS.map((c) => (
          <Link
            key={c.slug}
            href={`/alternatives/${c.slug}`}
            className="group p-6 rounded-lg border border-border bg-card/30 hover:bg-card/60 transition-colors"
          >
            <h2 className="font-display text-xl font-bold group-hover:text-primary transition-colors">
              {c.label}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{c.description}</p>
            <span className="mt-4 inline-block text-sm text-primary group-hover:underline">
              Compare →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
