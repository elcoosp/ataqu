"use client";

import { Trans } from "@lingui/react/macro";
import Link from "next/link";

export default function PrivacyPage() {
	return (
		<div className="container section-padding">
			<div className="max-w-4xl">
				<Link
					href="/"
					className="meta text-ink-soft transition-colors hover:text-redline-ink"
				>
					<Trans>← Back to home</Trans>
				</Link>

				<h1 className="display mt-8 mb-10 text-4xl leading-tight text-ink-strong md:text-5xl">
					<Trans>Privacy Policy</Trans>
				</h1>

				<p className="meta mb-10 text-ink-soft">
					<Trans>Last Updated: August 29, 2026</Trans>
				</p>

				<div className="mt-12 max-w-4xl space-y-12">
					<section>
						<h2 className="display mb-4 border-b-2 border-ink-strong pb-2 text-xl text-ink-strong">
							<Trans>1. The Philosophy</Trans>
						</h2>
						<p className="max-w-[68ch] leading-relaxed text-ink-soft">
							<Trans>
								Ataqu does not spy on you. We do not sell your data. We do not
								use your CRM deals or internal DIAL chats to train AI models. We
								collect the absolute minimum data required to operate the 10
								apps, process your billing, and comply with the law.
							</Trans>
						</p>
					</section>

					<section>
						<h2 className="display mb-4 border-b-2 border-ink-strong pb-2 text-xl text-ink-strong">
							<Trans>2. What We Collect</Trans>
						</h2>
						<div className="space-y-2 leading-relaxed text-ink-soft">
							<p>
								<Trans>
									<strong>A. Account Data:</strong> Email address, company name,
									and hashed password (if not using SSO via Google/Microsoft).
								</Trans>
							</p>
							<p>
								<Trans>
									<strong>B. Billing Data:</strong> Credit card number,
									expiration date, and billing address. Payment processing is
									strictly handled by our PCI‑DSS compliant payment processor
									(e.g., Stripe). We never store your full credit card number on
									our servers.
								</Trans>
							</p>
							<p>
								<Trans>
									<strong>C. Customer Data:</strong> The business information
									you actively input into the apps (e.g., deals in CINQ,
									messages in DIAL, docs in PIVOT).
								</Trans>
							</p>
							<p>
								<Trans>
									<strong>D. Technical/Usage Data:</strong> IP addresses,
									browser type, and aggregate usage metrics (e.g., number of API
									calls, active integrations) to monitor system health and
									prevent abuse.
								</Trans>
							</p>
						</div>
					</section>

					<section>
						<h2 className="display mb-4 border-b-2 border-ink-strong pb-2 text-xl text-ink-strong">
							<Trans>3. How We Use Your Data</Trans>
						</h2>
						<ul className="max-w-[68ch] space-y-1.5 pl-5 leading-relaxed text-ink-soft [&>li]:list-disc">
							<li>
								<Trans>
									<strong>To Provide the Service:</strong> To run the 10 apps,
									execute SPARK automations, and display VISTA analytics.
								</Trans>
							</li>
							<li>
								<Trans>
									<strong>To Bill You:</strong> To process your subscription
									(starting at $15/mo).
								</Trans>
							</li>
							<li>
								<Trans>
									<strong>To Secure the System:</strong> To monitor for
									unauthorized access, enforce tenant isolation, and prevent
									abuse of the platform.
								</Trans>
							</li>
							<li>
								<Trans>
									<strong>To Provide Support:</strong> If you contact our human
									support team, we will use your communication history to
									resolve your issue.
								</Trans>
							</li>
						</ul>
					</section>

					<section>
						<h2 className="display mb-4 border-b-2 border-ink-strong pb-2 text-xl text-ink-strong">
							<Trans>4. The AI Guarantee (Strict Prohibition)</Trans>
						</h2>
						<p className="max-w-[68ch] leading-relaxed text-ink-soft">
							<Trans>
								<strong>
									Ataqu explicitly prohibits the use of Customer Data for
									training artificial intelligence.
								</strong>
							</Trans>
						</p>
						<ul className="mt-2 max-w-[68ch] space-y-1.5 pl-5 leading-relaxed text-ink-soft [&>li]:list-disc">
							<li>
								<Trans>
									Your data is never fed into internal or external LLMs.
								</Trans>
							</li>
							<li>
								<Trans>Your data is never used for algorithmic tuning.</Trans>
							</li>
							<li>
								<Trans>
									If we introduce AI features in the future (e.g., smart text
									generation in PIVOT), it will be strictly opt‑in, and the data
									from that session will not be persisted for model training.
								</Trans>
							</li>
						</ul>
					</section>

					<section>
						<h2 className="display mb-4 border-b-2 border-ink-strong pb-2 text-xl text-ink-strong">
							<Trans>5. Data Architecture & Tenant Isolation</Trans>
						</h2>
						<p className="max-w-[68ch] leading-relaxed text-ink-soft">
							<Trans>
								Your Customer Data is stored in a single PostgreSQL 16.14
								instance with schemas for bounded context isolation (core,
								collab_crm, collab_ops, vault, dial, vista). Logical separation
								is strictly enforced at the database level via PostgreSQL Roles,
								Row Level Security (RLS), Column-Level Privileges, and a
								type‑safe schema ENUM.
							</Trans>
						</p>
						<ul className="mt-2 max-w-[68ch] space-y-1.5 pl-5 leading-relaxed text-ink-soft [&>li]:list-disc">
							<li>
								<Trans>
									Every database query executed by the Ataqu Rust backend is
									scoped to your TenantId via compile-time Repository traits.
								</Trans>
							</li>
							<li>
								<Trans>
									RLS on core.outbox prevents cross-domain event spoofing.
									Cross-schema queries are physically impossible at the database
									level.
								</Trans>
							</li>
							<li>
								<Trans>
									It is architecturally impossible for one Ataqu tenant to query
									another tenant's data.
								</Trans>
							</li>
							<li>
								<Trans>
									<strong>Future Phase 2:</strong> We will migrate to managed
									Postgres (Neon/RDS) while maintaining the same strict
									isolation guarantees.
								</Trans>
							</li>
						</ul>
					</section>

					<section>
						<h2 className="display mb-4 border-b-2 border-ink-strong pb-2 text-xl text-ink-strong">
							<Trans>6. Data Retention & Deletion</Trans>
						</h2>
						<ul className="max-w-[68ch] space-y-1.5 pl-5 leading-relaxed text-ink-soft [&>li]:list-disc">
							<li>
								<Trans>
									<strong>Active Accounts:</strong> Your data is retained as
									long as your account is active.
								</Trans>
							</li>
							<li>
								<Trans>
									<strong>Canceled Accounts:</strong> Upon account cancellation,
									your data remains accessible for export for 7 days. After 30
									days, all Customer Data is permanently and irreversibly
									deleted from the primary PostgreSQL databases and all backups.
								</Trans>
							</li>
							<li>
								<Trans>
									<strong>PII Anonymization:</strong> In certain apps (like
									PAUSE/HR), GDPR anonymization routines (compiled table
									registry) automatically strip Personally Identifiable
									Information (PII) when records are deleted, replacing them
									with irreversible cryptographic hashes.
								</Trans>
							</li>
						</ul>
					</section>

					<section>
						<h2 className="display mb-4 border-b-2 border-ink-strong pb-2 text-xl text-ink-strong">
							<Trans>7. Sub-Processors</Trans>
						</h2>
						<p className="max-w-[68ch] leading-relaxed text-ink-soft">
							<Trans>
								We use highly vetted, enterprise‑grade infrastructure providers.
								We do not share your Customer Data with marketing or advertising
								networks. Our core sub‑processors are:
							</Trans>
						</p>
						<ul className="mt-2 max-w-[68ch] space-y-1.5 pl-5 leading-relaxed text-ink-soft [&>li]:list-disc">
							<li>
								<Trans>
									Hetzner: VPS hosting for the Rust binary and PostgreSQL 16.14.
								</Trans>
							</li>
							<li>
								<Trans>
									Cloudflare: Edge network, DDoS protection, and SSL
									termination.
								</Trans>
							</li>
							<li>
								<Trans>Stripe: Payment processing.</Trans>
							</li>
							<li>
								<Trans>
									Google/Microsoft: SSO identity verification (via OIDC).
								</Trans>
							</li>
							<li>
								<Trans>
									SendGrid / Postmark: Transactional email delivery.
								</Trans>
							</li>
							<li>
								<Trans>
									Axiom / Tempo: Logs, traces, and metrics (via OTLP HTTP).
								</Trans>
							</li>
						</ul>
						<p className="max-w-[68ch] leading-relaxed text-ink-soft mt-3">
							<Trans>
								If we add a new sub‑processor that processes Customer Data, we
								will notify you 30 days in advance.
							</Trans>
						</p>
					</section>

					<section>
						<h2 className="display mb-4 border-b-2 border-ink-strong pb-2 text-xl text-ink-strong">
							<Trans>8. Your Rights (GDPR & CCPA)</Trans>
						</h2>
						<p className="max-w-[68ch] leading-relaxed text-ink-soft">
							<Trans>
								Depending on your location (EU/EEA or California), you have
								specific rights regarding your data:
							</Trans>
						</p>
						<ul className="mt-2 max-w-[68ch] space-y-1.5 pl-5 leading-relaxed text-ink-soft [&>li]:list-disc">
							<li>
								<Trans>
									<strong>Right to Access:</strong> You can request a copy of
									your data (or just use the 1‑click export tool).
								</Trans>
							</li>
							<li>
								<Trans>
									<strong>Right to Rectification:</strong> You can correct
									inaccurate data.
								</Trans>
							</li>
							<li>
								<Trans>
									<strong>Right to Erasure:</strong> You can request immediate
									deletion of your data (or just use the 1‑click cancel button).
								</Trans>
							</li>
							<li>
								<Trans>
									<strong>Right to Object:</strong> You can object to certain
									types of processing.
								</Trans>
							</li>
							<li>
								<Trans>
									<strong>Data Portability:</strong> You can export your data in
									machine‑readable CSV/JSON formats.
								</Trans>
							</li>
						</ul>
						<p className="max-w-[68ch] leading-relaxed text-ink-soft mt-3">
							<Trans>
								To exercise these rights, simply use the in‑app tools. If you
								need assistance, email privacy@ataqu.com from your registered
								email address.
							</Trans>
						</p>
					</section>

					<section>
						<h2 className="display mb-4 border-b-2 border-ink-strong pb-2 text-xl text-ink-strong">
							<Trans>9. International Data Transfers</Trans>
						</h2>
						<p className="max-w-[68ch] leading-relaxed text-ink-soft">
							<Trans>
								Ataqu infrastructure is hosted primarily in Germany (EU). If you
								are outside the EU, your data may be transferred. We rely on
								Standard Contractual Clauses (SCCs) to ensure your data is
								transferred in compliance with GDPR.
							</Trans>
						</p>
					</section>

					<section>
						<h2 className="display mb-4 border-b-2 border-ink-strong pb-2 text-xl text-ink-strong">
							<Trans>10. Security Breach Protocol</Trans>
						</h2>
						<p className="max-w-[68ch] leading-relaxed text-ink-soft">
							<Trans>In the event of a confirmed data breach:</Trans>
						</p>
						<ol className="mt-2 max-w-[68ch] space-y-1.5 pl-5 leading-relaxed text-ink-soft [&>li]:list-decimal">
							<li>
								<Trans>We will immediately secure the affected systems.</Trans>
							</li>
							<li>
								<Trans>
									We will publish an initial incident report on status.ataqu.com
									within 24 hours of detection.
								</Trans>
							</li>
							<li>
								<Trans>
									We will notify affected customers via email within 72 hours of
									detection, including the scope of the breach and the
									remediation steps taken.
								</Trans>
							</li>
						</ol>
					</section>

					<section>
						<h2 className="display mb-4 border-b-2 border-ink-strong pb-2 text-xl text-ink-strong">
							<Trans>11. Changes to This Policy</Trans>
						</h2>
						<p className="max-w-[68ch] leading-relaxed text-ink-soft">
							<Trans>
								If we change how we process your data, we will update this
								document and notify you 30 days in advance. We will never
								retroactively apply a policy that reduces your privacy rights.
							</Trans>
						</p>
					</section>
				</div>
			</div>
		</div>
	);
}
