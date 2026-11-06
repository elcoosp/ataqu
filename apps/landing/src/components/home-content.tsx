"use client";

import { Accordion, CollapsibleBanner, Lightbox } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { useState } from "react";
import { BlueprintPlate } from "@/components/blueprint-plate";
import { CostScale } from "@/components/cost-scale";
import { HeroDrawing } from "@/components/hero-drawing";
import { PartsIndex } from "@/components/parts-index";
import { PricingComparison } from "@/components/pricing-comparison";
import { ReleaseClause } from "@/components/release-clause";
import { WaitlistForm } from "@/components/waitlist-form";

const REDLINES = [
	{ slug: "hubspot", label: "HubSpot" },
	{ slug: "slack", label: "Slack" },
	{ slug: "notion", label: "Notion" },
	{ slug: "zapier", label: "Zapier" },
	{ slug: "zoho-one", label: "Zoho One" },
	{ slug: "calendly", label: "Calendly" },
	{ slug: "personio", label: "Personio" },
	{ slug: "okta", label: "Okta" },
];

const TESTIMONIALS = [
	{
		quote:
			"We killed HubSpot, Slack, and Notion in one quarter. Ataqu does all three natively.",
		author: "OPS LEAD · 40-PERSON SAAS",
	},
	{
		quote:
			"$1,200/mo down to $39. Same output, zero per-seat taxes. The escape hatch sealed it.",
		author: "FOUNDER · DTC BRAND",
	},
	{
		quote:
			"Rust backend means dashboards that actually feel instant. Vista replaced our BI stack.",
		author: "CTO · FINTECH",
	},
];

const FAQ = [
	{
		id: "lockin",
		title: "Is there a lock-in?",
		content:
			"No 3-year contracts, no retention specialists. Export everything in one click — your data always belongs to you.",
	},
	{
		id: "pricing",
		title: "How does pricing work?",
		content:
			"Start at $15/mo for one app, $39 for 5, or $79 for all 10. No per-user fees, ever.",
	},
	{
		id: "migrate",
		title: "Can I migrate from HubSpot/Slack?",
		content:
			"Yes. PIVOT imports Notion docs, CINQ imports HubSpot pipelines, and DIAL unifies Slack + Intercom threads.",
	},
];

export function HomeContent() {
	const [preselectedApps, setPreselectedApps] = useState<string[]>([]);
	const [lightboxOpen, setLightboxOpen] = useState(false);

	const handleWedgeClick = (apps: string[]) => {
		setPreselectedApps(apps);
		document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" });
	};

	return (
		<main>
			{/* Sheet 01 — hero */}
			<section className="container pb-16 pt-12 md:pb-24 md:pt-20">
				<div className="grid items-center gap-12 lg:grid-cols-[1.04fr_0.96fr] lg:gap-16">
					<div>
						<h1 className="display text-[clamp(2.375rem,5vw,4.125rem)] leading-[1.05] text-ink-strong">
							<Trans>
								HubSpot charges{" "}
								<span className="text-redline-ink">$1,200/mo</span>. Slack taxes
								you per user.
							</Trans>
						</h1>
						<p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-ink-soft">
							<Trans>
								Ataqu replaces HubSpot, Slack, and Notion with a single native
								platform. No lock‑in. No per‑user fees. Start with CRM (CINQ) or
								docs (PIVOT).
							</Trans>
						</p>
						<div className="mt-8 flex flex-col gap-3 sm:flex-row">
							<button
								type="button"
								className="btn btn-primary"
								onClick={() => handleWedgeClick(["cinq"])}
							>
								<Trans>Start with CINQ (CRM)</Trans>
							</button>
							<button
								type="button"
								className="btn btn-secondary"
								onClick={() => handleWedgeClick(["pivot"])}
							>
								<Trans>Start with PIVOT (Docs)</Trans>
							</button>
						</div>
						<dl className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-hairline pt-5">
							{[
								{ price: "$15", note: "1 app" },
								{ price: "$39", note: "5 apps" },
								{ price: "$79", note: "10 apps" },
							].map((tier) => (
								<div key={tier.note} className="flex items-baseline gap-2">
									<dt className="tnum font-mono text-xl text-ink-strong">
										{tier.price}
									</dt>
									<dd className="meta text-ink-soft">/MO · {tier.note}</dd>
								</div>
							))}
							<div className="meta ml-auto hidden text-ink-soft sm:block">
								FLAT · NO PER‑USER FEES
							</div>
						</dl>
					</div>
					<HeroDrawing />
				</div>
			</section>

			{/* Notice strip */}
			<section className="container pb-4">
				<CollapsibleBanner
					title={
						<Trans>New: Ataqu Pulse — realtime ops across every app</Trans>
					}
					description={
						<Trans>
							Live activity, presence, and streaming metrics are now in early
							access.
						</Trans>
					}
					defaultState="open"
					className="rounded-[2px]"
				/>
			</section>

			{/* Redlines issued against */}
			<section className="container pb-16 md:pb-20">
				<div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-hairline-strong py-4">
					<span className="meta text-ink-soft">
						<Trans>Redlines issued against</Trans>
					</span>
					<ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
						{REDLINES.map((c) => (
							<li key={c.slug}>
								<a
									href={`/alternatives/${c.slug}`}
									className="meta text-ink transition-colors hover:text-redline-ink"
								>
									{c.label}
								</a>
							</li>
						))}
					</ul>
				</div>
			</section>

			{/* The math — bill of materials */}
			<section className="border-t border-hairline-strong">
				<div className="container section-padding">
					<div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
						<div>
							<h2 className="display text-3xl leading-tight text-ink-strong md:text-4xl">
								<Trans>Compare the cost of your fragmented SaaS stack</Trans>
							</h2>
							<p className="mt-4 max-w-[52ch] leading-relaxed text-ink-soft">
								<Trans>
									Start at $15/mo for one app, $39 for 5, or $79 for all 10. No
									per‑user fees, no lock‑in.
								</Trans>
							</p>
							<div className="mt-8">
								<CostScale />
							</div>
						</div>
						<div>
							<PricingComparison />
							<div className="mt-6">
								<a
									href="/alternatives/hubspot"
									className="link-redline text-sm"
								>
									<Trans>See full comparison →</Trans>
								</a>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Parts index — the ten apps */}
			<section className="border-t border-hairline-strong bg-paper-sunken/50">
				<div className="container section-padding">
					<div className="grid gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-end">
						<h2 className="display text-3xl leading-tight text-ink-strong md:text-4xl">
							<Trans>10 apps. One suite. Natively integrated.</Trans>
						</h2>
						<p className="max-w-[52ch] leading-relaxed text-ink-soft md:justify-self-end">
							<Trans>
								Replace your fragmented stack with a single, unified operating
								system.
							</Trans>
						</p>
					</div>
					<PartsIndex />
				</div>
			</section>

			{/* The cyanotype plate — architecture proof */}
			<section className="bg-blueprint text-blueprint-line">
				<div className="container section-padding">
					<div className="max-w-3xl">
						<h2 className="display text-3xl leading-tight md:text-4xl">
							<Trans>
								Built in Rust. Powered by PostgreSQL. Engineered for
								performance.
							</Trans>
						</h2>
					</div>
					<div className="mt-12">
						<BlueprintPlate />
					</div>
					<div className="mt-10 border-t border-blueprint-soft/30 pt-6">
						<button
							type="button"
							onClick={() => setLightboxOpen(true)}
							className="meta rounded-[2px] border border-blueprint-soft/60 px-4 py-2.5 text-blueprint-line transition-colors hover:border-blueprint-line hover:bg-white/5"
						>
							<Trans>View full architecture diagram</Trans>
						</button>
						<Lightbox
							open={lightboxOpen}
							onClose={() => setLightboxOpen(false)}
							src="/architecture.svg"
							alt="Ataqu architecture diagram"
						/>
					</div>
				</div>
			</section>

			{/* Release clause — escape hatch */}
			<section className="border-t border-hairline-strong">
				<div className="container section-padding">
					<div className="max-w-3xl">
						<h2 className="display text-3xl leading-tight text-ink-strong md:text-4xl">
							<Trans>Want to leave? One click. Your data belongs to you.</Trans>
						</h2>
						<p className="mt-4 max-w-[52ch] leading-relaxed text-ink-soft">
							<Trans>
								No 3‑year lock‑in. No retention specialists. Just 1 click.
							</Trans>
						</p>
					</div>
					<ReleaseClause />
				</div>
			</section>

			{/* Reference jobs — testimonials */}
			<section className="border-t border-hairline-strong bg-paper-sunken/50">
				<div className="container section-padding">
					<h2 className="display text-3xl leading-tight text-ink-strong md:text-4xl">
						<Trans>Teams that escaped the stack</Trans>
					</h2>
					<div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-12">
						{TESTIMONIALS.map((t) => (
							<figure
								key={t.author}
								className="border-t-2 border-ink-strong pt-6"
							>
								<blockquote className="text-lg leading-relaxed text-ink">
									“{t.quote}”
								</blockquote>
								<figcaption className="meta mt-4 text-ink-soft">
									{t.author}
								</figcaption>
							</figure>
						))}
					</div>
				</div>
			</section>

			{/* Specification — FAQ */}
			<section className="border-t border-hairline-strong">
				<div className="container section-padding">
					<div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
						<h2 className="display text-3xl leading-tight text-ink-strong md:text-4xl">
							<Trans>Frequently asked questions</Trans>
						</h2>
						<div className="max-w-2xl">
							<Accordion
								items={FAQ.map((f) => ({
									id: f.id,
									title: f.title,
									content: f.content,
								}))}
							/>
						</div>
					</div>
				</div>
			</section>

			{/* The form — waitlist */}
			<section
				id="waitlist"
				className="scroll-mt-20 border-t border-hairline-strong bg-paper-sunken/50"
			>
				<div className="container section-padding">
					<div className="grid items-start gap-10 lg:grid-cols-[1fr_1fr] lg:gap-20">
						<div>
							<h2 className="display text-3xl leading-tight text-ink-strong md:text-4xl">
								<Trans>
									Join the waitlist — from $15/mo. 5 apps $39, 10 apps $79.
								</Trans>
							</h2>
							<p className="mt-4 max-w-[48ch] leading-relaxed text-ink-soft">
								<Trans>
									Be first to access the suite. No credit card required.
								</Trans>
							</p>
							<div className="meta mt-8 border-t border-hairline-strong pt-4 text-ink-soft">
								MONTH‑TO‑MONTH · 1‑CLICK CANCEL · HUMAN SUPPORT
							</div>
						</div>
						<div className="plate p-6 sm:p-8">
							<WaitlistForm preselectedApps={preselectedApps} />
						</div>
					</div>
				</div>
			</section>

			{/* Close */}
			<section className="border-t border-hairline-strong">
				<div className="container flex flex-col items-center gap-3 py-14 text-center">
					<p className="display text-xl font-semibold tracking-tight text-ink-strong">
						<Trans>Built natively. Owned by you.</Trans>
					</p>
					<p className="meta text-ink-soft">
						10 APPS · ONE BINARY · ONE DATABASE
					</p>
				</div>
			</section>
		</main>
	);
}
