"use client";

import {
	Accordion,
	CollapsibleBanner,
	IconMorph,
	Lightbox,
	LikeBurst,
	LogoMarquee,
	NewItemsPill,
	PressDepth,
	Ripple,
	SnapCarousel,
	TextReveal,
} from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { motion } from "motion/react";
import { useState } from "react";
import { AppGrid } from "@/components/app-grid";
import { ArchitectureProof } from "@/components/architecture-proof";
import { EscapeHatch } from "@/components/escape-hatch";
import { InteractiveDemo } from "@/components/interactive-demo";
import { PricingComparison } from "@/components/pricing-comparison";
import { WaitlistForm } from "@/components/waitlist-form";
import { fadeInUp, staggerContainer } from "@/lib/animations";

const TESTIMONIALS = [
	{
		quote:
			"We killed HubSpot, Slack, and Notion in one quarter. Ataqu does all three natively.",
		author: "Ops Lead, 40-person SaaS",
	},
	{
		quote:
			"$1,200/mo down to $39. Same output, zero per-seat taxes. The escape hatch sealed it.",
		author: "Founder, DTC brand",
	},
	{
		quote:
			"Rust backend means dashboards that actually feel instant. Vista replaced our BI stack.",
		author: "CTO, Fintech",
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
	const [newCount, setNewCount] = useState(3);

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
			<CollapsibleBanner
				title={<Trans>New: Ataqu Pulse — realtime ops across every app</Trans>}
				description={
					<Trans>
						Live activity, presence, and streaming metrics are now in early
						access.
					</Trans>
				}
				defaultState="open"
				className="rounded-lg"
			/>

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
				<TextReveal
					text="Ataqu replaces HubSpot, Slack, and Notion with a single native platform. No lock‑in. No per‑user fees. Start with CRM (CINQ) or docs (PIVOT)."
					className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto"
				/>
				<div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
					<Ripple
						onPress={() => handleWedgeClick(["cinq"])}
						className="inline-block rounded-md bg-primary px-8 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
					>
						<Trans>Start with CINQ (CRM)</Trans>
					</Ripple>
					<PressDepth
						onClick={() => handleWedgeClick(["pivot"])}
						className="inline-block rounded-md border border-border bg-transparent px-8 py-3 font-medium text-foreground transition-colors hover:bg-card"
					>
						<Trans>Start with PIVOT (Docs)</Trans>
					</PressDepth>
				</div>
			</motion.section>

			{/* Trusted by / alternatives marquee */}
			<motion.section variants={fadeInUp}>
				<LogoMarquee
					label="Trusted alternative to"
					items={[
						{ id: "hubspot", label: "HubSpot" },
						{ id: "slack", label: "Slack" },
						{ id: "notion", label: "Notion" },
						{ id: "zapier", label: "Zapier" },
						{ id: "zoho", label: "Zoho One" },
						{ id: "calendly", label: "Calendly" },
						{ id: "personio", label: "Personio" },
						{ id: "okta", label: "Okta" },
					]}
				/>
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
				<div className="mt-8 flex flex-col items-center gap-4">
					<ArchitectureProof />
					<button
						type="button"
						onClick={() => setLightboxOpen(true)}
						className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
					>
						<Trans>View architecture diagram</Trans>
					</button>
					<Lightbox
						open={lightboxOpen}
						onClose={() => setLightboxOpen(false)}
						src="/architecture.svg"
						alt="Ataqu architecture diagram"
					/>
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

			{/* Testimonials carousel */}
			<motion.section variants={fadeInUp}>
				<h2 className="font-display text-3xl md:text-4xl font-bold text-center">
					<Trans>Teams that escaped the stack</Trans>
				</h2>
				<div className="mt-8">
					<SnapCarousel label="Customer testimonials">
						{TESTIMONIALS.map((t, i) => (
							<div
								key={i}
								className="rounded-lg border border-border bg-card p-6 text-left"
							>
								<p className="text-foreground">“{t.quote}”</p>
								<p className="mt-3 text-sm text-muted-foreground">{t.author}</p>
								<div className="mt-4">
									<LikeBurst
										initialCount={12 + i * 7}
										label="Found this useful"
									/>
								</div>
							</div>
						))}
					</SnapCarousel>
				</div>
			</motion.section>

			{/* FAQ */}
			<motion.section variants={fadeInUp}>
				<h2 className="font-display text-3xl md:text-4xl font-bold text-center">
					<Trans>Frequently asked questions</Trans>
				</h2>
				<div className="mt-8 max-w-2xl mx-auto">
					<Accordion
						items={FAQ.map((f) => ({
							id: f.id,
							title: f.title,
							content: f.content,
						}))}
					/>
				</div>
			</motion.section>

			{/* Waitlist */}
			<motion.section
				id="waitlist"
				variants={fadeInUp}
				className="max-w-2xl mx-auto"
			>
				<div className="flex items-center justify-center gap-3 mb-4">
					<h2 className="font-display text-3xl md:text-4xl font-bold text-center">
						<Trans>
							Join the waitlist – from $15/mo (5 apps $39, 10 apps $79)
						</Trans>
					</h2>
					<NewItemsPill
						count={newCount}
						onJump={() => setNewCount(0)}
						label={(c) => `${c} new spots`}
					/>
				</div>
				<p className="mt-4 text-center text-muted-foreground">
					<Trans>Be first to access the suite. No credit card required.</Trans>
				</p>
				<div className="mt-8">
					<WaitlistForm preselectedApps={preselectedApps} />
				</div>
			</motion.section>

			{/* Interactive component showcase */}
			<motion.section variants={fadeInUp} className="mt-8">
				<InteractiveDemo />
			</motion.section>

			{/* Footer micro-interaction */}
			<motion.section variants={fadeInUp} className="text-center">
				<div className="inline-flex items-center gap-2 text-muted-foreground">
					<IconMorph size={18} />
					<Trans>Built natively. Owned by you.</Trans>
				</div>
			</motion.section>
		</motion.main>
	);
}
