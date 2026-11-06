"use client";

import { Trans } from "@lingui/react/macro";
import Image from "next/image";
import Link from "next/link";
import { WaitlistForm } from "@/components/waitlist-form";

export default function SondPage() {
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
					src="/apps/sond.png"
					alt="sond"
					width={64}
					height={64}
					className="rounded-[2px] border border-hairline-strong"
				/>
			</div>
			<h1 className="display text-3xl leading-tight text-ink-strong md:text-5xl">
				<Trans>
					Typeform taxes your success. SOND gives you unlimited responses.
				</Trans>
			</h1>
			<p className="mt-5 max-w-[62ch] text-lg leading-relaxed text-ink-soft">
				<Trans>
					SOND is a drag‑and‑drop form builder with unlimited responses, native
					CRM integration, and no per‑response fees. Conditional logic, email
					notifications, and custom branding included.
				</Trans>
			</p>

			<div className="mt-12 grid grid-cols-1 gap-px border border-hairline-strong bg-hairline-strong md:grid-cols-2">
				<div className="bg-paper-raised p-6 sm:p-8">
					<h2 className="display text-xl text-ink-strong">
						<Trans>Features</Trans>
					</h2>
					<ul className="mt-4 space-y-2 text-ink-soft">
						<li>
							• <Trans>Visual drag‑and‑drop builder</Trans>
						</li>
						<li>
							• <Trans>Unlimited responses — no per‑response fees</Trans>
						</li>
						<li>
							• <Trans>Conditional logic & branching</Trans>
						</li>
						<li>
							• <Trans>Email notifications included</Trans>
						</li>
						<li>
							• <Trans>Custom branding (remove SOND logo)</Trans>
						</li>
						<li>
							• <Trans>Native CINQ lead creation & SPARK triggers</Trans>
						</li>
					</ul>
				</div>

				<div className="bg-paper-raised p-6 sm:p-8">
					<h2 className="display text-xl text-ink-strong">
						<Trans>Why replace Typeform?</Trans>
					</h2>
					<div className="overflow-x-auto">
						<table className="tnum w-full text-sm border-collapse">
							<thead>
								<tr className="border-b border-hairline-strong">
									<th className="meta px-3 py-2.5 text-left text-ink-soft">
										<Trans>Typeform</Trans>
									</th>
									<th className="meta px-3 py-2.5 text-left text-ink-soft">
										<Trans>SOND</Trans>
									</th>
								</tr>
							</thead>
							<tbody>
								<tr className="border-b border-hairline">
									<td className="px-3 py-2.5 text-ink-soft">
										<Trans>$40/mo (10 free responses)</Trans>
									</td>
									<td className="px-3 py-2.5 font-semibold text-redline-ink">
										<Trans>$15/mo (unlimited)</Trans>
									</td>
								</tr>
								<tr className="border-b border-hairline">
									<td className="px-3 py-2.5 text-ink-soft">
										<Trans>Email notifications are paid add‑on</Trans>
									</td>
									<td className="px-3 py-2.5 font-semibold text-redline-ink">
										<Trans>Notifications included</Trans>
									</td>
								</tr>
								<tr className="border-b border-hairline">
									<td className="px-3 py-2.5 text-ink-soft">
										<Trans>No CRM integration (requires Zapier)</Trans>
									</td>
									<td className="px-3 py-2.5 font-semibold text-redline-ink">
										<Trans>Native CINQ lead creation</Trans>
									</td>
								</tr>
								<tr>
									<td className="px-3 py-2.5 text-ink-soft">
										<Trans>Support: 2.4/5 on Trustpilot</Trans>
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
						When a form is submitted, SOND creates a CINQ lead, triggers a SPARK
						workflow, and notifies the team in DIAL. No Zapier. No webhooks.
					</Trans>
				</p>
			</div>

			<div className="mt-14">
				<h2 className="display text-2xl text-center text-ink-strong">
					<Trans>Ready to escape Typeform?</Trans>
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
