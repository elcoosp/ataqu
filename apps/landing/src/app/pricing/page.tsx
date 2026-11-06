"use client";

import { Trans } from "@lingui/react/macro";
import Link from "next/link";
import { PricingComparison } from "@/components/pricing-comparison";

const TIERS = [
	{
		price: "$15",
		unit: "/MO",
		name: <Trans>One app</Trans>,
		note: <Trans>Start with the one you need. Full feature set.</Trans>,
	},
	{
		price: "$39",
		unit: "/MO",
		name: <Trans>Five apps</Trans>,
		note: <Trans>The working core of your operations.</Trans>,
	},
	{
		price: "$79",
		unit: "/MO",
		name: <Trans>All ten apps</Trans>,
		note: <Trans>The whole system, natively integrated.</Trans>,
	},
];

export default function PricingPage() {
	return (
		<div className="container section-padding">
			<div className="max-w-4xl">
				<Link
					href="/"
					className="meta text-ink-soft transition-colors hover:text-redline-ink"
				>
					← <Trans>Back to home</Trans>
				</Link>

				<h1 className="display mt-8 text-4xl leading-tight text-ink-strong md:text-5xl">
					<Trans>Simple, transparent pricing</Trans>
				</h1>
				<p className="mt-4 max-w-[60ch] text-lg leading-relaxed text-ink-soft">
					<Trans>
						Start at $15/mo for one app, $39/mo for 5 apps, or $79/mo for all
						10. No per‑user fees, no lock‑in.
					</Trans>
				</p>

				{/* Schedule of prices */}
				<div className="plate mt-12">
					<div className="meta grid grid-cols-[1fr_auto] gap-x-4 border-b border-hairline-strong px-5 py-2.5 text-ink-soft sm:grid-cols-[10rem_1fr_auto]">
						<span>TIER</span>
						<span className="hidden sm:block">
							<Trans>Scope</Trans>
						</span>
						<span>
							<Trans>Price</Trans>
						</span>
					</div>
					{TIERS.map((tier, i) => (
						<div
							key={i}
							className={`grid grid-cols-[1fr_auto] items-baseline gap-x-4 border-b border-hairline px-5 py-5 last:border-b-0 sm:grid-cols-[10rem_1fr_auto] ${
								i === 2 ? "bg-redline/5" : ""
							}`}
						>
							<span
								className={`display text-lg font-semibold tracking-tight ${i === 2 ? "text-redline-ink" : "text-ink-strong"}`}
							>
								{tier.name}
							</span>
							<span className="col-start-1 row-start-2 mt-1 max-w-[48ch] text-sm text-ink-soft sm:col-start-2 sm:row-start-1 sm:mt-0">
								{tier.note}
							</span>
							<span
								className={`tnum font-mono text-xl ${i === 2 ? "font-semibold text-redline-ink" : "text-ink"}`}
							>
								{tier.price}
								<span className="meta ml-1">{tier.unit}</span>
							</span>
						</div>
					))}
					<div className="meta bg-paper-sunken/60 px-5 py-3 text-ink-soft">
						MONTH‑TO‑MONTH · PER TEAM, NOT PER SEAT · 1‑CLICK CANCEL
					</div>
				</div>

				<div className="mt-16">
					<h2 className="display text-2xl text-ink-strong">
						<Trans>Compare your current stack</Trans>
					</h2>
					<div className="mt-6">
						<PricingComparison />
					</div>
					<div className="mt-10 border-t border-hairline-strong pt-8">
						<a href="/#waitlist" className="btn btn-primary">
							<Trans>Join the waitlist</Trans>
						</a>
					</div>
				</div>

				<div className="mt-14 border-t border-hairline pt-6 text-sm text-ink-soft">
					<Trans>Have questions?</Trans>{" "}
					<Link href="/faq" className="link-redline">
						<Trans>Visit our FAQ</Trans>
					</Link>
				</div>
			</div>
		</div>
	);
}
