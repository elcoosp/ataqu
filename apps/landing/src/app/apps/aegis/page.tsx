"use client";

import { Trans } from "@lingui/react/macro";
import Image from "next/image";
import Link from "next/link";
import { WaitlistForm } from "@/components/waitlist-form";

export default function AegisPage() {
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
					src="/apps/aegis.png"
					alt="aegis"
					width={64}
					height={64}
					className="rounded-[2px] border border-hairline-strong"
				/>
			</div>
			<h1 className="display text-3xl leading-tight text-ink-strong md:text-5xl">
				<Trans>
					Okta is a gatekeeper. AEGIS is the vault built into your foundation.
				</Trans>
			</h1>
			<p className="mt-5 max-w-[62ch] text-lg leading-relaxed text-ink-soft">
				<Trans>
					AEGIS provides SSO, MFA, and RBAC — natively integrated with PAUSE and
					all 10 apps. No per‑user fees. No separate identity product. Just
					native security.
				</Trans>
			</p>

			<div className="mt-12 grid grid-cols-1 gap-px border border-hairline-strong bg-hairline-strong md:grid-cols-2">
				<div className="bg-paper-raised p-6 sm:p-8">
					<h2 className="display text-xl text-ink-strong">
						<Trans>Features</Trans>
					</h2>
					<ul className="mt-4 space-y-2 text-ink-soft">
						<li>
							• <Trans>SSO (Google, Microsoft)</Trans>
						</li>
						<li>
							• <Trans>MFA (TOTP with Google Authenticator)</Trans>
						</li>
						<li>
							• <Trans>RBAC (Admin, Member, Viewer, Custom)</Trans>
						</li>
						<li>
							• <Trans>JWT sessions & refresh tokens</Trans>
						</li>
						<li>
							• <Trans>API keys for developers</Trans>
						</li>
						<li>
							• <Trans>Native PAUSE deprovisioning</Trans>
						</li>
					</ul>
				</div>

				<div className="bg-paper-raised p-6 sm:p-8">
					<h2 className="display text-xl text-ink-strong">
						<Trans>Why replace Okta?</Trans>
					</h2>
					<div className="overflow-x-auto">
						<table className="tnum w-full text-sm border-collapse">
							<thead>
								<tr className="border-b border-hairline-strong">
									<th className="meta px-3 py-2.5 text-left text-ink-soft">
										<Trans>Okta</Trans>
									</th>
									<th className="meta px-3 py-2.5 text-left text-ink-soft">
										<Trans>AEGIS</Trans>
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
										<Trans>No native HR integration</Trans>
									</td>
									<td className="px-3 py-2.5 font-semibold text-redline-ink">
										<Trans>Native PAUSE deprovisioning</Trans>
									</td>
								</tr>
								<tr className="border-b border-hairline">
									<td className="px-3 py-2.5 text-ink-soft">
										<Trans>Complex admin UI</Trans>
									</td>
									<td className="px-3 py-2.5 font-semibold text-redline-ink">
										<Trans>Simple, minimal interface</Trans>
									</td>
								</tr>
								<tr>
									<td className="px-3 py-2.5 text-ink-soft">
										<Trans>Support: 1.3/5 on Trustpilot</Trans>
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
						AEGIS is woven into the source code of Ataqu. When an employee is
						offboarded in PAUSE, AEGIS instantly revokes their access to all 10
						apps. No manual deprovisioning.
					</Trans>
				</p>
			</div>

			<div className="mt-14">
				<h2 className="display text-2xl text-center text-ink-strong">
					<Trans>Ready to escape Okta?</Trans>
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
