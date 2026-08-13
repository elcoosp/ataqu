"use client";

import { Trans } from "@lingui/react/macro";
import Image from "next/image";
import Link from "next/link";
import { WaitlistForm } from "@/components/waitlist-form";

export default function PivotPage() {
	return (
		<div className="container section-padding max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
			<Link
				href="/"
				className="text-primary hover:underline text-sm inline-block mb-6"
			>
				<Trans>← Back to home</Trans>
			</Link>

			<div className="flex justify-center my-4">
				<Image
					src="/apps/pivot.png"
					alt="pivot"
					width={64}
					height={64}
					className="rounded-full border border-primary/20"
				/>
			</div>
			<h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold">
				<Trans>
					Notion is a blank canvas graveyard. PIVOT is an operational database.
				</Trans>
			</h1>
			<p className="mt-4 text-lg text-muted-foreground">
				<Trans>
					PIVOT combines docs, relational databases, and instant search. Your
					project data lives natively alongside your CRM and inventory. No
					per‑user fees. No trapped data.
				</Trans>
			</p>

			<div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
				<div className="p-6 rounded-lg border border-border bg-card/30 overflow-x-auto">
					<h2 className="font-display text-xl font-bold text-primary">
						<Trans>Features</Trans>
					</h2>
					<ul className="mt-4 space-y-2 text-muted-foreground">
						<li>
							• <Trans>Markdown docs (like Notion)</Trans>
						</li>
						<li>
							• <Trans>Relational databases (like Airtable)</Trans>
						</li>
						<li>
							• <Trans>Sub‑15ms search (PostgreSQL tsvector)</Trans>
						</li>
						<li>
							• <Trans>Native links to CINQ deals and VAULT products</Trans>
						</li>
						<li>
							• <Trans>Templates and version history</Trans>
						</li>
						<li>
							• <Trans>1‑click export to CSV, JSON, Markdown</Trans>
						</li>
					</ul>
				</div>

				<div className="p-6 rounded-lg border border-border bg-card/30 overflow-x-auto">
					<h2 className="font-display text-xl font-bold text-primary">
						<Trans>Why replace Notion?</Trans>
					</h2>
					<div className="overflow-x-auto">
						<table className="w-full text-sm border-collapse">
							<thead>
								<tr className="border-b border-border">
									<th className="text-left py-2 font-display text-muted-foreground">
										<Trans>Notion</Trans>
									</th>
									<th className="text-left py-2 font-display text-muted-foreground">
										<Trans>PIVOT</Trans>
									</th>
								</tr>
							</thead>
							<tbody>
								<tr className="border-b border-border/50">
									<td className="py-2 text-muted-foreground">
										<Trans>$18/user/mo</Trans>
									</td>
									<td className="py-2 text-primary font-bold">
										<Trans>$15/mo (whole team)</Trans>
									</td>
								</tr>
								<tr className="border-b border-border/50">
									<td className="py-2 text-muted-foreground">
										<Trans>Search: 2‑5 seconds</Trans>
									</td>
									<td className="py-2 text-primary font-bold">
										<Trans>Search: &lt;15ms</Trans>
									</td>
								</tr>
								<tr className="border-b border-border/50">
									<td className="py-2 text-muted-foreground">
										<Trans>No native CRM link</Trans>
									</td>
									<td className="py-2 text-primary font-bold">
										<Trans>Native relations to CINQ</Trans>
									</td>
								</tr>
								<tr>
									<td className="py-2 text-muted-foreground">
										<Trans>Data export is difficult</Trans>
									</td>
									<td className="py-2 text-primary font-bold">
										<Trans>1‑click export</Trans>
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</div>

			<div className="mt-12 p-6 rounded-lg border border-primary/30 bg-card/50">
				<h2 className="font-display text-2xl font-bold text-primary">
					<Trans>Native integration across the OS</Trans>
				</h2>
				<p className="mt-2 text-muted-foreground">
					<Trans>
						PIVOT tasks can be application‑level linked to CINQ deals and VAULT
						products. When a deal closes, the associated PIVOT task
						auto‑updates. No Zapier required.
					</Trans>
				</p>
			</div>

			<div className="mt-12">
				<h2 className="font-display text-2xl font-bold text-center">
					<Trans>Ready to escape Notion?</Trans>
				</h2>
				<p className="mt-2 text-center text-muted-foreground">
					<Trans>
						Start with one app for $15/mo (or get all 10 for $79/mo). No credit
						card required for the trial.
					</Trans>
				</p>
				<div className="mt-6">
					<WaitlistForm />
				</div>
			</div>
		</div>
	);
}
