"use client";

import { Trans } from "@lingui/react/macro";
import Link from "next/link";

export default function PrivacyPage() {
	return (
		<div className="container section-padding max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
			<Link
				href="/"
				className="text-primary hover:underline text-sm inline-block mb-6"
			>
				<Trans>← Back to home</Trans>
			</Link>

			<h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-8">
				<Trans>Privacy Policy</Trans>
			</h1>

			<p className="text-sm text-muted-foreground mb-8">
				<Trans>Last Updated: August 29, 2026</Trans>
			</p>

			<div className="space-y-8">
				<section>
					<h2 className="font-display text-2xl font-bold text-primary mb-4">
						<Trans>1. The Philosophy</Trans>
					</h2>
					<p className="text-muted-foreground leading-relaxed">
						<Trans>
							Ataqu does not spy on you. We do not sell your data. We do not use
							your CRM deals or internal DIAL chats to train AI models. We
							collect the absolute minimum data required to operate the 10 apps,
							process your billing, and comply with the law.
						</Trans>
					</p>
				</section>

				<section>
					<h2 className="font-display text-2xl font-bold text-primary mb-4">
						<Trans>2. What We Collect</Trans>
					</h2>
					<div className="space-y-2 text-muted-foreground leading-relaxed">
						<p>
							<Trans>
								<strong>A. Account Data:</strong> Email address, company name,
								and hashed password (if not using SSO via Google/Microsoft).
							</Trans>
						</p>
						<p>
							<Trans>
								<strong>B. Billing Data:</strong> Credit card number, expiration
								date, and billing address. Payment processing is strictly
								handled by our PCI‑DSS compliant payment processor (e.g.,
								Stripe). We never store your full credit card number on our
								servers.
							</Trans>
						</p>
						<p>
							<Trans>
								<strong>C. Customer Data:</strong> The business information you
								actively input into the apps (e.g., deals in CINQ, messages in
								DIAL, docs in PIVOT).
							</Trans>
						</p>
						<p>
							<Trans>
								<strong>D. Technical/Usage Data:</strong> IP addresses, browser
								type, and aggregate usage metrics (e.g., number of API calls,
								active integrations) to monitor system health and prevent abuse.
							</Trans>
						</p>
					</div>
				</section>

				<section>
					<h2 className="font-display text-2xl font-bold text-primary mb-4">
						<Trans>3. How We Use Your Data</Trans>
					</h2>
					<ul className="list-disc list-inside text-muted-foreground space-y-1">
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
								unauthorized access, enforce tenant isolation, and prevent abuse
								of the platform.
							</Trans>
						</li>
						<li>
							<Trans>
								<strong>To Provide Support:</strong> If you contact our human
								support team, we will use your communication history to resolve
								your issue.
							</Trans>
						</li>
					</ul>
				</section>

				<section>
					<h2 className="font-display text-2xl font-bold text-primary mb-4">
						<Trans>4. The AI Guarantee (Strict Prohibition)</Trans>
					</h2>
					<p className="text-muted-foreground leading-relaxed">
						<Trans>
							<strong>
								Ataqu explicitly prohibits the use of Customer Data for training
								artificial intelligence.
							</strong>
						</Trans>
					</p>
					<ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
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
					<h2 className="font-display text-2xl font-bold text-primary mb-4">
						<Trans>5. Data Architecture & Tenant Isolation</Trans>
					</h2>
					<p className="text-muted-foreground leading-relaxed">
						<Trans>
							Your Customer Data is stored in a single PostgreSQL 16.14 instance
							with schemas for bounded context isolation (core, collab_crm,
							collab_ops, vault, dial, vista). Logical separation is strictly
							enforced at the database level via PostgreSQL Roles, Row Level
							Security (RLS), Column-Level Privileges, and a type‑safe schema
							ENUM.
						</Trans>
					</p>
					<ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
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
								Postgres (Neon/RDS) while maintaining the same strict isolation
								guarantees.
							</Trans>
						</li>
					</ul>
				</section>

				<section>
					<h2 className="font-display text-2xl font-bold text-primary mb-4">
						<Trans>6. Data Retention & Deletion</Trans>
					</h2>
					<ul className="list-disc list-inside text-muted-foreground space-y-1">
						<li>
							<Trans>
								<strong>Active Accounts:</strong> Your data is retained as long
								as your account is active.
							</Trans>
						</li>
						<li>
							<Trans>
								<strong>Canceled Accounts:</strong> Upon account cancellation,
								your data remains accessible for export for 7 days. After 30
								days, all Customer Data is permanently and irreversibly deleted
								from the primary PostgreSQL databases and all backups.
							</Trans>
						</li>
						<li>
							<Trans>
								<strong>PII Anonymization:</strong> In certain apps (like
								PAUSE/HR), GDPR anonymization routines (compiled table registry)
								automatically strip Personally Identifiable Information (PII)
								when records are deleted, replacing them with irreversible
								cryptographic hashes.
							</Trans>
						</li>
					</ul>
				</section>

				<section>
					<h2 className="font-display text-2xl font-bold text-primary mb-4">
						<Trans>7. Sub-Processors</Trans>
					</h2>
					<p className="text-muted-foreground leading-relaxed">
						<Trans>
							We use highly vetted, enterprise‑grade infrastructure providers.
							We do not share your Customer Data with marketing or advertising
							networks. Our core sub‑processors are:
						</Trans>
					</p>
					<ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
						<li>
							<Trans>
								Hetzner: VPS hosting for the Rust binary and PostgreSQL 16.14.
							</Trans>
						</li>
						<li>
							<Trans>
								Cloudflare: Edge network, DDoS protection, and SSL termination.
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
							<Trans>SendGrid / Postmark: Transactional email delivery.</Trans>
						</li>
						<li>
							<Trans>
								Axiom / Tempo: Logs, traces, and metrics (via OTLP HTTP).
							</Trans>
						</li>
					</ul>
					<p className="text-muted-foreground leading-relaxed mt-2">
						<Trans>
							If we add a new sub‑processor that processes Customer Data, we
							will notify you 30 days in advance.
						</Trans>
					</p>
				</section>

				<section>
					<h2 className="font-display text-2xl font-bold text-primary mb-4">
						<Trans>8. Your Rights (GDPR & CCPA)</Trans>
					</h2>
					<p className="text-muted-foreground leading-relaxed">
						<Trans>
							Depending on your location (EU/EEA or California), you have
							specific rights regarding your data:
						</Trans>
					</p>
					<ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
						<li>
							<Trans>
								<strong>Right to Access:</strong> You can request a copy of your
								data (or just use the 1‑click export tool).
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
					<p className="text-muted-foreground leading-relaxed mt-2">
						<Trans>
							To exercise these rights, simply use the in‑app tools. If you need
							assistance, email privacy@ataqu.com from your registered email
							address.
						</Trans>
					</p>
				</section>

				<section>
					<h2 className="font-display text-2xl font-bold text-primary mb-4">
						<Trans>9. International Data Transfers</Trans>
					</h2>
					<p className="text-muted-foreground leading-relaxed">
						<Trans>
							Ataqu infrastructure is hosted primarily in Germany (EU). If you
							are outside the EU, your data may be transferred. We rely on
							Standard Contractual Clauses (SCCs) to ensure your data is
							transferred in compliance with GDPR.
						</Trans>
					</p>
				</section>

				<section>
					<h2 className="font-display text-2xl font-bold text-primary mb-4">
						<Trans>10. Security Breach Protocol</Trans>
					</h2>
					<p className="text-muted-foreground leading-relaxed">
						<Trans>In the event of a confirmed data breach:</Trans>
					</p>
					<ol className="list-decimal list-inside text-muted-foreground mt-2 space-y-1">
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
								detection, including the scope of the breach and the remediation
								steps taken.
							</Trans>
						</li>
					</ol>
				</section>

				<section>
					<h2 className="font-display text-2xl font-bold text-primary mb-4">
						<Trans>11. Changes to This Policy</Trans>
					</h2>
					<p className="text-muted-foreground leading-relaxed">
						<Trans>
							If we change how we process your data, we will update this
							document and notify you 30 days in advance. We will never
							retroactively apply a policy that reduces your privacy rights.
						</Trans>
					</p>
				</section>
			</div>
		</div>
	);
}
