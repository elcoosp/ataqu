"use client";

import { Trans } from "@lingui/react/macro";
import Image from "next/image";
import Link from "next/link";
import { WaitlistForm } from "@/components/waitlist-form";

export default function VaultPage() {
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
					src="/apps/vault.png"
					alt="vault"
					width={64}
					height={64}
					className="rounded-[2px] border border-hairline-strong"
				/>
			</div>
			<h1 className="display text-3xl leading-tight text-ink-strong md:text-5xl">
				<Trans>
					Cin7 is a siloed warehouse. VAULT connects inventory to your CRM.
				</Trans>
			</h1>
			<p className="mt-5 max-w-[62ch] text-lg leading-relaxed text-ink-soft">
				<Trans>
					VAULT is real‑time inventory management with atomic stock updates,
					native CRM integration, and no AI bloat. Stock reservations happen
					automatically when deals are won.
				</Trans>
			</p>

			<div className="mt-12 grid grid-cols-1 gap-px border border-hairline-strong bg-hairline-strong md:grid-cols-2">
				<div className="bg-paper-raised p-6 sm:p-8">
					<h2 className="display text-xl text-ink-strong">
						<Trans>Features</Trans>
					</h2>
					<ul className="mt-4 space-y-2 text-ink-soft">
						<li>
							• <Trans>Products & variants</Trans>
						</li>
						<li>
							• <Trans>Real‑time stock (atomic updates)</Trans>
						</li>
						<li>
							• <Trans>Stock movements & audit trail</Trans>
						</li>
						<li>
							• <Trans>Low stock alerts & notifications</Trans>
						</li>
						<li>
							• <Trans>Multi‑channel & multi‑warehouse</Trans>
						</li>
						<li>
							• <Trans>Native CINQ order reservation</Trans>
						</li>
					</ul>
				</div>

				<div className="bg-paper-raised p-6 sm:p-8">
					<h2 className="display text-xl text-ink-strong">
						<Trans>Why replace Cin7?</Trans>
					</h2>
					<div className="overflow-x-auto">
						<table className="tnum w-full text-sm border-collapse">
							<thead>
								<tr className="border-b border-hairline-strong">
									<th className="meta px-3 py-2.5 text-left text-ink-soft">
										<Trans>Cin7</Trans>
									</th>
									<th className="meta px-3 py-2.5 text-left text-ink-soft">
										<Trans>VAULT</Trans>
									</th>
								</tr>
							</thead>
							<tbody>
								<tr className="border-b border-hairline">
									<td className="px-3 py-2.5 text-ink-soft">
										<Trans>$79–$349/mo</Trans>
									</td>
									<td className="px-3 py-2.5 font-semibold text-redline-ink">
										<Trans>$15/mo</Trans>
									</td>
								</tr>
								<tr className="border-b border-hairline">
									<td className="px-3 py-2.5 text-ink-soft">
										<Trans>No native CRM integration</Trans>
									</td>
									<td className="px-3 py-2.5 font-semibold text-redline-ink">
										<Trans>Native CINQ deal reservation</Trans>
									</td>
								</tr>
								<tr className="border-b border-hairline">
									<td className="px-3 py-2.5 text-ink-soft">
										<Trans>AI bloat with no value</Trans>
									</td>
									<td className="px-3 py-2.5 font-semibold text-redline-ink">
										<Trans>Focused, bloat‑free</Trans>
									</td>
								</tr>
								<tr>
									<td className="px-3 py-2.5 text-ink-soft">
										<Trans>Support: 4.5/5 but expensive</Trans>
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
						When a CINQ deal is won, VAULT reserves stock atomically via outbox
						event. When stock hits zero, SPARK pauses the sales sequence. No
						middleware required.
					</Trans>
				</p>
			</div>

			<div className="mt-14">
				<h2 className="display text-2xl text-center text-ink-strong">
					<Trans>Ready to escape Cin7?</Trans>
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
