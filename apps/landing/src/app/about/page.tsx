"use client";

import { Trans } from "@lingui/react/macro";

export default function AboutPage() {
	return (
		<div className="container section-padding">
			<div className="mx-auto max-w-[68ch]">
				<h1 className="display text-4xl leading-tight text-ink-strong md:text-5xl">
					<Trans>About Ataqu</Trans>
				</h1>

				<div className="mt-14">
					<section>
						<h2 className="display border-b-2 border-ink-strong pb-3 text-2xl text-ink-strong">
							<Trans>The Consumer Manifesto</Trans>
						</h2>
						<div className="mt-6 leading-relaxed text-ink-soft">
							<p>
								<Trans>The SaaS market is broken.</Trans>
							</p>
							<p className="mt-4">
								<Trans>
									Prices that climb without warning. Contracts that trap you.
									Support that ignores you. Tools that don't talk to each other.
								</Trans>
							</p>
							<p className="mt-4">
								<Trans>
									Companies pay a fortune. They're prisoners. They suffer.
								</Trans>
							</p>
							<p className="mt-4">
								<Trans>We looked at that. We said: "We can do better."</Trans>
							</p>
							<p className="mt-4 font-medium text-ink">
								<Trans>We built Ataqu.</Trans>
							</p>
							<p className="mt-4">
								<Trans>
									10 business apps, natively integrated. In Rust with
									PostgreSQL. Fixed price.
								</Trans>
							</p>
							<p className="mt-4">
								<Trans>
									$15/mo for one app, $39/mo for 5 apps, or $79/mo for all 10.
								</Trans>
							</p>
							<p className="mt-4">
								<Trans>No lock‑in. Cancel in 1 click.</Trans>
							</p>
							<p className="mt-4">
								<Trans>No bot support. Humans who respond in 24h.</Trans>
							</p>
							<p className="mt-4">
								<Trans>No surprises. No bullshit.</Trans>
							</p>
							<p className="mt-6 border-l-2 border-redline pl-4 font-medium text-ink">
								<Trans>
									Ataqu attacks the market so you don't have to suffer.
								</Trans>
							</p>
							<p className="meta mt-8 text-ink-strong">
								<Trans>ATAQU. 10 APPS, ONE PRICE, ZERO LOCK‑IN.</Trans>
							</p>
						</div>
					</section>

					<section className="mt-16">
						<h2 className="display border-b-2 border-ink-strong pb-3 text-2xl text-ink-strong">
							<Trans>The Engineering Manifesto</Trans>
						</h2>
						<div className="mt-6 leading-relaxed text-ink-soft">
							<p>
								<Trans>
									We didn't just wrap APIs in a new UI. We eradicated the bloat.
								</Trans>
							</p>
							<p className="mt-4">
								<Trans>
									We built a monolithic backend in Rust with PostgreSQL and
									SeaORM 2.0. We use schemas, PostgreSQL Roles, RLS,
									Column‑Level Privileges, and a type‑safe{" "}
									<code className="font-mono text-[0.875em] text-ink">
										schema
									</code>{" "}
									ENUM for hard bounded context isolation. Our unified outbox is
									driven by{" "}
									<code className="font-mono text-[0.875em] text-ink">
										LISTEN/NOTIFY
									</code>{" "}
									for instant event delivery. We use{" "}
									<code className="font-mono text-[0.875em] text-ink">
										JSONB
									</code>{" "}
									with graceful degradation for custom field filtering. We
									enforce strict tenant isolation via private{" "}
									<code className="font-mono text-[0.875em] text-ink">
										TenantId
									</code>{" "}
									newtype, database‑level roles, RLS, and Column‑Level
									Privileges. PII is redacted at compile time via redacting
									newtypes with zero runtime overhead; JSON serialization is
									strictly restricted to the API layer via wrapper structs.
								</Trans>
							</p>
							<p className="mt-4">
								<Trans>
									We didn't do this to win architecture awards. We did it
									because "cheap" shouldn't mean "fragile."
								</Trans>
							</p>
							<p className="mt-4">
								<Trans>
									Other SaaS tools break under their own weight. Ataqu is built
									to last. It is mathematically sound, deterministically
									fault‑tolerant, and ruthlessly fast.
								</Trans>
							</p>
							<p className="meta mt-8 text-ink-strong">
								<Trans>ATAQU. ENGINEERED FOR SCALE. PRICED FOR EVERYONE.</Trans>
							</p>
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}
