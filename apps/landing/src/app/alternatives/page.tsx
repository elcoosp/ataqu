import Link from "next/link";

const COMPETITORS = [
	{
		slug: "hubspot",
		label: "HubSpot",
		description: "CRM & sales hub — 3‑year lock‑in and hidden paywalls.",
	},
	{
		slug: "slack",
		label: "Slack",
		description: "Team chat — per‑user fees and 30% price hikes.",
	},
	{
		slug: "zapier",
		label: "Zapier",
		description: "Automation — brittle webhooks and task limits.",
	},
	{
		slug: "notion",
		label: "Notion",
		description: "Docs & databases — slow search and trapped data.",
	},
	{
		slug: "zoho-one",
		label: "Zoho One",
		description: "Suite — 45 apps, clunky UI, per‑user pricing.",
	},
	{
		slug: "calendly",
		label: "Calendly",
		description: "Scheduling — no CRM integration, delayed no‑show.",
	},
	{
		slug: "typeform",
		label: "Typeform",
		description: "Forms — response limits and paywalled features.",
	},
	{
		slug: "cin7",
		label: "Cin7",
		description: "Inventory — siloed warehouse, AI bloat.",
	},
	{
		slug: "personio",
		label: "Personio",
		description: "HR — manual deprovisioning, expensive.",
	},
	{
		slug: "okta",
		label: "Okta",
		description: "SSO — per‑user fees, no HR sync.",
	},
	{
		slug: "tableau",
		label: "Tableau",
		description: "Analytics — ETL nightmare, expensive per‑user.",
	},
];

export default function AlternativesPage() {
	return (
		<div className="container section-padding">
			<div className="max-w-5xl">
				<h1 className="display text-4xl leading-tight text-ink-strong md:text-5xl">
					Ataqu vs. the Fragmented Stack
				</h1>
				<p className="mt-4 max-w-[62ch] text-lg leading-relaxed text-ink-soft">
					See how Ataqu compares to each competitor. We expose the pricing
					flaws, lock‑in clauses, and architectural gaps – and show you a better
					way.
				</p>

				{/* Register of redlines */}
				<div className="plate mt-12">
					<div className="meta grid grid-cols-[3rem_1fr] gap-x-4 border-b border-hairline-strong px-4 py-2.5 text-ink-soft sm:grid-cols-[3rem_12rem_1fr_auto]">
						<span>NO.</span>
						<span>VENDOR</span>
						<span className="hidden sm:block">DEFECT SUMMARY</span>
						<span className="w-16 text-right">SHEET</span>
					</div>
					{COMPETITORS.map((c, i) => (
						<Link
							key={c.slug}
							href={`/alternatives/${c.slug}`}
							className="group grid grid-cols-[3rem_1fr] items-baseline gap-x-4 border-b border-hairline px-4 py-4 transition-colors last:border-b-0 hover:bg-paper-raised sm:grid-cols-[3rem_12rem_1fr_auto]"
						>
							<span className="tnum font-mono text-xs text-ink-soft">
								{String(i + 1).padStart(2, "0")}
							</span>
							<span className="display text-lg font-semibold tracking-tight text-ink-strong transition-colors group-hover:text-redline-ink">
								{c.label}
							</span>
							<span className="col-start-2 mt-1 text-sm text-ink-soft sm:col-start-3 sm:mt-0">
								{c.description}
							</span>
							<span className="meta col-start-2 mt-1 text-redline-ink sm:col-start-4 sm:mt-0 sm:text-right">
								REDLINE →
							</span>
						</Link>
					))}
				</div>
			</div>
		</div>
	);
}
