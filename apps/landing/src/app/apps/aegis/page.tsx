"use client";

import { Trans } from "@lingui/react/macro";
import Image from "next/image";
import Link from "next/link";
import { WaitlistForm } from "@/components/waitlist-form";

export default function AegisPage() {
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
					src="/apps/aegis.png"
					alt="aegis"
					width={64}
					height={64}
					className="rounded-full border border-primary/20"
				/>
			</div>
			<h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold">
				<Trans>
					Okta is a gatekeeper. AEGIS is the vault built into your foundation.
				</Trans>
			</h1>
			<p className="mt-4 text-lg text-muted-foreground">
				<Trans>
					AEGIS provides SSO, MFA, and RBAC — natively integrated with PAUSE and
					all 10 apps. No per‑user fees. No separate identity product. Just
					native security.
				</Trans>
			</p>

			<div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
				<div className="p-6 rounded-lg border border-border bg-card/30 overflow-x-auto">
					<h2 className="font-display text-xl font-bold text-primary">
						<Trans>Features</Trans>
					</h2>
					<ul className="mt-4 space-y-2 text-muted-foreground">
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

				<div className="p-6 rounded-lg border border-border bg-card/30 overflow-x-auto">
					<h2 className="font-display text-xl font-bold text-primary">
						<Trans>Why replace Okta?</Trans>
					</h2>
					<div className="overflow-x-auto">
						<table className="w-full text-sm border-collapse">
							<thead>
								<tr className="border-b border-border">
									<th className="text-left py-2 font-display text-muted-foreground">
										<Trans>Okta</Trans>
									</th>
									<th className="text-left py-2 font-display text-muted-foreground">
										<Trans>AEGIS</Trans>
									</th>
								</tr>
							</thead>
							<tbody>
								<tr className="border-b border-border/50">
									<td className="py-2 text-muted-foreground">
										<Trans>$15/user/mo</Trans>
									</td>
									<td className="py-2 text-primary font-bold">
										<Trans>$15/mo (whole team)</Trans>
									</td>
								</tr>
								<tr className="border-b border-border/50">
									<td className="py-2 text-muted-foreground">
										<Trans>No native HR integration</Trans>
									</td>
									<td className="py-2 text-primary font-bold">
										<Trans>Native PAUSE deprovisioning</Trans>
									</td>
								</tr>
								<tr className="border-b border-border/50">
									<td className="py-2 text-muted-foreground">
										<Trans>Complex admin UI</Trans>
									</td>
									<td className="py-2 text-primary font-bold">
										<Trans>Simple, minimal interface</Trans>
									</td>
								</tr>
								<tr>
									<td className="py-2 text-muted-foreground">
										<Trans>Support: 1.3/5 on Trustpilot</Trans>
									</td>
									<td className="py-2 text-primary font-bold">
										<Trans>Human support, 24h SLA</Trans>
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
						AEGIS is woven into the source code of Ataqu. When an employee is
						offboarded in PAUSE, AEGIS instantly revokes their access to all 10
						apps. No manual deprovisioning.
					</Trans>
				</p>
			</div>

			<div className="mt-12">
				<h2 className="font-display text-2xl font-bold text-center">
					<Trans>Ready to escape Okta?</Trans>
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
