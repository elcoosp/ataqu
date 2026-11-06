"use client";

import { Trans } from "@lingui/react/macro";

const PHASES = [
	{
		name: "Backend Core (Done)",
		tasks: [
			{ name: "User authentication & SSO (AEGIS)", status: "done" },
			{ name: "CRM (CINQ) – contacts, deals, pipeline", status: "done" },
			{ name: "Inventory (VAULT) – stock & movements", status: "done" },
			{ name: "Forms & surveys (SOND)", status: "done" },
			{ name: "Docs & databases (PIVOT)", status: "done" },
			{ name: "Team chat & support (DIAL)", status: "done" },
			{ name: "Workflow automation (SPARK)", status: "done" },
			{ name: "Scheduling (TEMPO)", status: "done" },
			{ name: "HR & leave (PAUSE)", status: "done" },
			{ name: "Analytics & dashboards (VISTA)", status: "done" },
		],
	},
	{
		name: "Integration Layer (Done)",
		tasks: [
			{ name: "Event outbox with LISTEN/NOTIFY", status: "done" },
			{ name: "Idempotency & exactly-once delivery", status: "done" },
			{ name: "Role-based database isolation (RLS)", status: "done" },
			{ name: "Compile-time PII redaction", status: "done" },
			{ name: "Generic batch ingestion", status: "done" },
		],
	},
	{
		name: "Public Website & Brand (Done)",
		tasks: [
			{ name: "Landing page & waitlist", status: "done" },
			{ name: "Competitor comparison pages", status: "done" },
			{ name: "Engineering blog", status: "done" },
			{ name: "Public roadmap & about pages", status: "done" },
			{ name: "Full i18n support", status: "done" },
		],
	},
	{
		name: "Application Layer (In Progress)",
		tasks: [
			{ name: "Application services (orchestration)", status: "done" },
			{ name: "API handlers (REST + WebSocket)", status: "in-progress" },
			{ name: "Admin CLI & audit logs", status: "planned" },
			{ name: "Background workers & cron", status: "planned" },
		],
	},
	{
		name: "Frontend SPAs (Planned)",
		tasks: [
			{ name: "AEGIS – Admin & SSO UI", status: "planned" },
			{ name: "CINQ – CRM interface", status: "planned" },
			{ name: "VAULT – Inventory dashboard", status: "planned" },
			{ name: "DIAL – Chat client", status: "planned" },
			{ name: "PIVOT – Docs & database UI", status: "planned" },
			{
				name: "All other apps (SOND, SPARK, TEMPO, PAUSE, VISTA)",
				status: "planned",
			},
		],
	},
	{
		name: "Production Readiness (Planned)",
		tasks: [
			{ name: "GDPR compliance & data privacy", status: "planned" },
			{ name: "Load testing & performance tuning", status: "planned" },
			{ name: "CI/CD pipeline", status: "planned" },
			{ name: "Documentation & runbooks", status: "planned" },
			{ name: "Public launch", status: "planned" },
		],
	},
];

function StatusBadge({ status }: { status: string }) {
	const styles = {
		done: "text-stamp border-stamp/50",
		"in-progress": "text-caution border-caution/50",
		planned: "text-ink-soft border-hairline-strong",
	};
	const labels = {
		done: "Done",
		"in-progress": "In Progress",
		planned: "Planned",
	};
	const style = styles[status as keyof typeof styles] || styles.planned;
	const label = labels[status as keyof typeof labels] || labels.planned;
	return (
		<span className={`meta shrink-0 rounded-[2px] border px-2 py-1 ${style}`}>
			{label}
		</span>
	);
}

export default function RoadmapPage() {
	return (
		<div className="container section-padding">
			<div className="max-w-4xl">
				<h1 className="display text-4xl leading-tight text-ink-strong md:text-5xl">
					<Trans>Public Roadmap</Trans>
				</h1>
				<p className="mt-4 max-w-[62ch] text-lg leading-relaxed text-ink-soft">
					<Trans>
						We're building the Unified SMB OS in the open. Here's what's done,
						what's next, and what's planned.
					</Trans>
				</p>

				<div className="mt-14 space-y-14">
					{PHASES.map((phase, idx) => (
						<section key={idx}>
							<h2 className="display border-b-2 border-ink-strong pb-3 text-xl text-ink-strong">
								<Trans>{phase.name}</Trans>
							</h2>
							<ul className="mt-2">
								{phase.tasks.map((task, tIdx) => (
									<li
										key={tIdx}
										className="flex items-center justify-between gap-4 border-b border-hairline py-3"
									>
										<span className="text-sm text-ink">
											<Trans>{task.name}</Trans>
										</span>
										<StatusBadge status={task.status} />
									</li>
								))}
							</ul>
						</section>
					))}
				</div>
			</div>
		</div>
	);
}
