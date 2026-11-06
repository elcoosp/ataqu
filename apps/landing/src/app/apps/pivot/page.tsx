"use client";

import { Trans } from "@lingui/react/macro";
import Image from "next/image";
import Link from "next/link";
import { WaitlistForm } from "@/components/waitlist-form";

export default function PivotPage() {
	return (
		<div className="container section-padding">
			<Link
				href="/"
				className="meta text-ink-soft transition-colors hover:text-redline-ink"
			>
				<Trans>← Back to home</Trans>
			</Link>

			<div className="flex justify-center my-6">
				<Image
					src="/apps/pivot.png"
					alt="pivot"
					width={64}
					height={64}
					className="rounded-[2px] border border-hairline-strong"
				/>
			</div>
			<h1 className="display text-3xl leading-tight text-ink-strong md:text-5xl">
				<Trans>
					Notion is a blank canvas graveyard. PIVOT is an operational database.
				</Trans>
			</h1>
			<p className="mt-5 max-w-[62ch] text-lg leading-relaxed text-ink-soft">
				<Trans>
					PIVOT combines docs, relational databases, and instant search. Your
					project data lives natively alongside your CRM and inventory. No
					per‑user fees. No trapped data.
				</Trans>
			</p>

			<div className="mt-12 grid grid-cols-1 gap-px border border-hairline-strong bg-hairline-strong md:grid-cols-2">
				<div className="bg-paper-raised p-6 sm:p-8">
					<h2 className="display text-xl text-ink-strong">
						<Trans>Features</Trans>
					</h2>
					<ul className="mt-4 space-y-2 text-ink-soft">
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

				<div className="bg-paper-raised p-6 sm:p-8">
					<h2 className="display text-xl text-ink-strong">
						<Trans>Why replace Notion?</Trans>
					</h2>
					<div className="overflow-x-auto">
						<table className="tnum w-full text-sm border-collapse">
							<thead>
								<tr className="border-b border-hairline-strong">
									<th className="meta px-3 py-2.5 text-left text-ink-soft">
										<Trans>Notion</Trans>
									</th>
									<th className="meta px-3 py-2.5 text-left text-ink-soft">
										<Trans>PIVOT</Trans>
									</th>
								</tr>
							</thead>
							<tbody>
								<tr className="border-b border-hairline">
									<td className="px-3 py-2.5 text-ink-soft">
										<Trans>$18/user/mo</Trans>
									</td>
									<td className="px-3 py-2.5 font-semibold text-redline-ink">
										<Trans>$15/mo (whole team)</Trans>
									</td>
								</tr>
								<tr className="border-b border-hairline">
									<td className="px-3 py-2.5 text-ink-soft">
										<Trans>Search: 2‑5 seconds</Trans>
									</td>
									<td className="px-3 py-2.5 font-semibold text-redline-ink">
										<Trans>Search: &lt;15ms</Trans>
									</td>
								</tr>
								<tr className="border-b border-hairline">
									<td className="px-3 py-2.5 text-ink-soft">
										<Trans>No native CRM link</Trans>
									</td>
									<td className="px-3 py-2.5 font-semibold text-redline-ink">
										<Trans>Native relations to CINQ</Trans>
									</td>
								</tr>
								<tr>
									<td className="px-3 py-2.5 text-ink-soft">
										<Trans>Data export is difficult</Trans>
									</td>
									<td className="px-3 py-2.5 font-semibold text-redline-ink">
										<Trans>1‑click export</Trans>
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</div>

			<div className="mt-12 border-l-2 border-redline bg-paper-raised p-6 sm:p-8">
				<h2 className="display text-2xl text-ink-strong">
					<Trans>Native integration across the OS</Trans>
				</h2>
				<p className="mt-3 text-ink-soft">
					<Trans>
						PIVOT tasks can be application‑level linked to CINQ deals and VAULT
						products. When a deal closes, the associated PIVOT task
						auto‑updates. No Zapier required.
					</Trans>
				</p>
			</div>

			<div className="mt-14">
				<h2 className="display text-2xl text-center text-ink-strong">
					<Trans>Ready to escape Notion?</Trans>
				</h2>
				<p className="mt-3 text-center text-ink-soft">
					<Trans>
						Start with one app for $15/mo (or get all 10 for $79/mo). No credit
						card required for the trial.
					</Trans>
				</p>
				<div className="mt-8">
					<WaitlistForm />
				</div>
			</div>
		</div>
	);
}
