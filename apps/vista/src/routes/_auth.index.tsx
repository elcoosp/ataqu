import { type Dashboard, useListDashboards } from "@ataqu/api-client";
import { Button, Card, EmptyState, Shell } from "@ataqu/ui";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, Plus } from "lucide-react";
import { useVistaActions } from "../actions";
import { CrossAppSection } from "../components/cross-app-section";

export const Route = createFileRoute("/_auth/")({
	component: DashboardListPage,
});

function DashboardListPage() {
	const { data: dashboards, isLoading } = useListDashboards();
	const actions = useVistaActions();

	const searchFn = async (q: string) => {
		return actions
			.filter((a) => a.label.toLowerCase().includes(q.toLowerCase()))
			.map((a) => ({ id: a.id, title: a.label, url: "#" }));
	};

	return (
		<Shell activeApp="vista" searchFn={searchFn}>
			<div className="p-8">
				<div className="flex justify-between items-center mb-8">
					<h1 className="text-2xl font-heading text-white">
						<Trans>Dashboards</Trans>
					</h1>
					<Button>
						<Plus className="h-4 w-4 mr-2" />
						<Trans>Create Dashboard</Trans>
					</Button>
				</div>

				{isLoading ? (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{[1, 2, 3].map((i) => (
							<div key={i} className="h-32 bg-card animate-pulse rounded-lg" />
						))}
					</div>
				) : dashboards && dashboards.length > 0 ? (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{dashboards.map((d: Dashboard) => (
							<Link to="/dashboard/$id" params={{ id: d.id }} key={d.id}>
								<Card className="p-6 hover:border-amber transition-colors cursor-pointer h-full">
									<h3 className="text-lg font-medium text-white mb-2">
										{d.name}
									</h3>
									<p className="text-xs text-muted-foreground">
										<Trans>
											Last updated:{" "}
											{new Date(d.updated_at).toLocaleDateString()}
										</Trans>
									</p>
								</Card>
							</Link>
						))}
					</div>
				) : (
					<EmptyState
						icon={BarChart3 as any}
						title={t`No dashboards`}
						description={t`Dashboards are empty because you haven't connected CINQ and VAULT yet. 1 click to connect.`}
						ctaLabel={t`Create Dashboard`}
					/>
				)}

				<div className="mt-10">
					<CrossAppSection />
				</div>
			</div>
		</Shell>
	);
}
