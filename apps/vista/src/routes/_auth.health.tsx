import { Card, Shell } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/health")({
	component: HealthPage,
});

function HealthPage() {
	return (
		<Shell activeApp="vista">
			<div className="p-8">
				<h1 className="text-2xl font-heading text-white mb-8">
					<Trans>System Health</Trans>
				</h1>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					<Card className="p-6">
						<h3 className="text-lg font-medium text-white mb-2">
							<Trans>Outbox Lag</Trans>
						</h3>
						<p className="text-3xl font-mono font-bold text-success">0.2s</p>
					</Card>
					<Card className="p-6">
						<h3 className="text-lg font-medium text-white mb-2">
							<Trans>Pending Events</Trans>
						</h3>
						<p className="text-3xl font-mono font-bold text-foreground">0</p>
					</Card>
					<Card className="p-6">
						<h3 className="text-lg font-medium text-white mb-2">
							<Trans>Workflow Status</Trans>
						</h3>
						<p className="text-3xl font-mono font-bold text-success">
							<Trans>Nominal</Trans>
						</p>
					</Card>
				</div>
			</div>
		</Shell>
	);
}
