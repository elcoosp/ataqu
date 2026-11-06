"use client";

import { Trans } from "@lingui/react/macro";
import Image from "next/image";
import Link from "next/link";
import { WaitlistForm } from "@/components/waitlist-form";

export default function TempoPage() {
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
					src="/apps/tempo.png"
					alt="tempo"
					width={64}
					height={64}
					className="rounded-[2px] border border-hairline-strong"
				/>
			</div>
			<h1 className="display text-3xl leading-tight text-ink-strong md:text-5xl">
				<Trans>
					Calendly is a scheduling island. TEMPO is built into your OS.
				</Trans>
			</h1>
			<p className="mt-5 max-w-[62ch] text-lg leading-relaxed text-ink-soft">
				<Trans>
					TEMPO handles booking links, calendar sync, and no‑show detection —
					natively connected to your CRM. No per‑user fees. No separate Zapier
					workflow. Just native scheduling.
				</Trans>
			</p>

			<div className="mt-12 grid grid-cols-1 gap-px border border-hairline-strong bg-hairline-strong md:grid-cols-2">
				<div className="bg-paper-raised p-6 sm:p-8">
					<h2 className="display text-xl text-ink-strong">
						<Trans>Features</Trans>
					</h2>
					<ul className="mt-4 space-y-2 text-ink-soft">
						<li>
							• <Trans>Booking links & event types</Trans>
						</li>
						<li>
							• <Trans>Calendar sync (Google, Outlook)</Trans>
						</li>
						<li>
							• <Trans>No‑show detection within 15 minutes</Trans>
						</li>
						<li>
							• <Trans>Automatic reminders (email, SMS)</Trans>
						</li>
						<li>
							• <Trans>Custom branding & emails</Trans>
						</li>
						<li>
							• <Trans>Native CRM activity creation</Trans>
						</li>
					</ul>
				</div>

				<div className="bg-paper-raised p-6 sm:p-8">
					<h2 className="display text-xl text-ink-strong">
						<Trans>Why replace Calendly?</Trans>
					</h2>
					<div className="overflow-x-auto">
						<table className="tnum w-full text-sm border-collapse">
							<thead>
								<tr className="border-b border-hairline-strong">
									<th className="meta px-3 py-2.5 text-left text-ink-soft">
										<Trans>Calendly</Trans>
									</th>
									<th className="meta px-3 py-2.5 text-left text-ink-soft">
										<Trans>TEMPO</Trans>
									</th>
								</tr>
							</thead>
							<tbody>
								<tr className="border-b border-hairline">
									<td className="px-3 py-2.5 text-ink-soft">
										<Trans>$15/user/mo</Trans>
									</td>
									<td className="px-3 py-2.5 font-semibold text-redline-ink">
										<Trans>$15/mo (whole team)</Trans>
									</td>
								</tr>
								<tr className="border-b border-hairline">
									<td className="px-3 py-2.5 text-ink-soft">
										<Trans>No‑show detection: 24 hours</Trans>
									</td>
									<td className="px-3 py-2.5 font-semibold text-redline-ink">
										<Trans>No‑show detection: 15 minutes</Trans>
									</td>
								</tr>
								<tr className="border-b border-hairline">
									<td className="px-3 py-2.5 text-ink-soft">
										<Trans>No CRM integration (requires Zapier)</Trans>
									</td>
									<td className="px-3 py-2.5 font-semibold text-redline-ink">
										<Trans>Native CINQ activity creation</Trans>
									</td>
								</tr>
								<tr>
									<td className="px-3 py-2.5 text-ink-soft">
										<Trans>Support: 3.6/5 on Trustpilot</Trans>
									</td>
									<td className="px-3 py-2.5 font-semibold text-redline-ink">
										<Trans>Human support, 24h SLA</Trans>
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
						When a prospect books a meeting, TEMPO creates a CINQ activity,
						alerts the rep in DIAL, and pauses a SPARK outreach sequence. When a
						meeting is missed, the follow‑up is triggered within minutes.
					</Trans>
				</p>
			</div>

			<div className="mt-14">
				<h2 className="display text-2xl text-center text-ink-strong">
					<Trans>Ready to escape Calendly?</Trans>
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
