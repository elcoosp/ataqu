"use client";

import { Trans } from "@lingui/react/macro";
import Link from "next/link";
import { PricingComparison } from "@/components/pricing-comparison";

export default function PricingPage() {
	return (
		<div className="container section-padding max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
			<Link
				href="/"
				className="text-primary hover:underline text-sm inline-block mb-6"
			>
				<Trans>← Back to home</Trans>
			</Link>

			<h1 className="font-display text-4xl md:text-5xl font-bold text-center">
				<Trans>Simple, transparent pricing</Trans>
			</h1>
			<p className="mt-4 text-center text-muted-foreground max-w-2xl mx-auto">
				<Trans>
					Start at $15/mo for one app, $39/mo for 5 apps, or $79/mo for all 10.
					No per‑user fees, no lock‑in.
				</Trans>
			</p>

			<div className="mt-12">
				<h2 className="font-display text-2xl font-bold text-center mb-6">
					<Trans>Compare your current stack</Trans>
				</h2>
				<PricingComparison />
				<div className="text-center mt-8">
					<a
						href="#waitlist"
						className="inline-block rounded-md bg-primary px-8 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
					>
						<Trans>Join the waitlist</Trans>
					</a>
				</div>
			</div>

			<div className="mt-16 text-center">
				<p className="text-muted-foreground">
					<Trans>Have questions?</Trans>{" "}
					<Link href="/faq" className="text-primary hover:underline">
						<Trans>Visit our FAQ</Trans>
					</Link>
				</p>
			</div>
		</div>
	);
}
