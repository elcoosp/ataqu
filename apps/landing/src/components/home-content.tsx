"use client";

import { Trans } from "@lingui/react/macro";
import { motion } from "motion/react";
import { useState } from "react";
import { AppGrid } from "@/components/app-grid";
import { ArchitectureProof } from "@/components/architecture-proof";
import { EscapeHatch } from "@/components/escape-hatch";
import { PricingComparison } from "@/components/pricing-comparison";
import { WaitlistForm } from "@/components/waitlist-form";
import { fadeInUp, staggerContainer } from "@/lib/animations";

export function HomeContent() {
	const [preselectedApps, setPreselectedApps] = useState<string[]>([]);

	const handleWedgeClick = (apps: string[]) => {
		setPreselectedApps(apps);
		document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" });
	};

	return (
		<motion.main
			className="container section-padding space-y-20 md:space-y-28"
			initial="hidden"
			animate="visible"
			variants={staggerContainer}
		>
			{/* Hero */}
			<motion.section
				variants={fadeInUp}
				className="text-center max-w-3xl mx-auto"
			>
				<h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight">
					<Trans>
						HubSpot charges <span className="text-primary">$1,200/mo</span>.
						Slack taxes you per user.
					</Trans>
				</h1>
				<p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
					<Trans>
						Ataqu replaces HubSpot, Slack, and Notion with a single native
						platform. No lock‑in. No per‑user fees. Start with CRM (CINQ) or
						docs (PIVOT).
					</Trans>
				</p>
				<div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
					<motion.button
						whileTap={{ scale: 0.97 }}
						transition={{ duration: 0.1 }}
						onClick={() => handleWedgeClick(["cinq"])}
						className="inline-block rounded-md bg-primary px-8 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
					>
						<Trans>Start with CINQ (CRM)</Trans>
					</motion.button>
					<motion.button
						whileTap={{ scale: 0.97 }}
						transition={{ duration: 0.1 }}
						onClick={() => handleWedgeClick(["pivot"])}
						className="inline-block rounded-md border border-border bg-transparent px-8 py-3 font-medium text-foreground transition-colors hover:bg-card"
					>
						<Trans>Start with PIVOT (Docs)</Trans>
					</motion.button>
				</div>
			</motion.section>

			{/* The Math */}
			<motion.section variants={fadeInUp}>
				<h2 className="font-display text-3xl md:text-4xl font-bold text-center">
					<Trans>Compare the cost of your fragmented SaaS stack</Trans>
				</h2>
				<p className="mt-4 text-center text-muted-foreground max-w-2xl mx-auto">
					<Trans>
						Start at $15/mo for one app, $39 for 5, or $79 for all 10. No
						per‑user fees, no lock‑in.
					</Trans>
				</p>
				<div className="mt-8">
					<PricingComparison />
				</div>
				<div className="text-center mt-6">
					<a
						href="/alternatives/hubspot"
						className="text-primary hover:underline text-sm"
					>
						<Trans>See full comparison →</Trans>
					</a>
				</div>
			</motion.section>

			{/* Apps Grid */}
			<motion.section variants={fadeInUp}>
				<h2 className="font-display text-3xl md:text-4xl font-bold text-center">
					<Trans>10 apps. One suite. Natively integrated.</Trans>
				</h2>
				<p className="mt-4 text-center text-muted-foreground max-w-2xl mx-auto">
					<Trans>
						Replace your fragmented stack with a single, unified operating
						system.
					</Trans>
				</p>
				<div className="mt-8">
					<AppGrid />
				</div>
			</motion.section>

			{/* Architecture Proof */}
			<motion.section variants={fadeInUp}>
				<h2 className="font-display text-3xl md:text-4xl font-bold text-center">
					<Trans>
						Built in Rust. Powered by PostgreSQL. Engineered for performance.
					</Trans>
				</h2>
				<div className="mt-8">
					<ArchitectureProof />
				</div>
			</motion.section>

			{/* Escape Hatch */}
			<motion.section variants={fadeInUp}>
				<h2 className="font-display text-3xl md:text-4xl font-bold text-center">
					<Trans>Want to leave? One click. Your data belongs to you.</Trans>
				</h2>
				<p className="mt-4 text-center text-muted-foreground max-w-2xl mx-auto">
					<Trans>
						No 3‑year lock‑in. No retention specialists. Just 1 click.
					</Trans>
				</p>
				<div className="mt-8">
					<EscapeHatch />
				</div>
			</motion.section>

			{/* Waitlist */}
			<motion.section
				id="waitlist"
				variants={fadeInUp}
				className="max-w-2xl mx-auto"
			>
				<h2 className="font-display text-3xl md:text-4xl font-bold text-center">
					<Trans>
						Join the waitlist – from $15/mo (5 apps $39, 10 apps $79)
					</Trans>
				</h2>
				<p className="mt-4 text-center text-muted-foreground">
					<Trans>Be first to access the suite. No credit card required.</Trans>
				</p>
				<div className="mt-8">
					<WaitlistForm preselectedApps={preselectedApps} />
				</div>
			</motion.section>
		</motion.main>
	);
}
