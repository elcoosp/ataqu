import { Badge } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { useListDLQ } from "../api/spark-api";
import { DLQViewer } from "../components/dlq-viewer";

export const Route = createFileRoute("/_auth/dlq")({
	component: DLQPage,
});

function DLQPage() {
	const { data, isLoading } = useListDLQ({ limit: 50, offset: 0 });

	return (
		<div className="p-6 space-y-6 max-w-4xl mx-auto">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-3">
						<Trans>Dead Letter Queue</Trans>
						{data && data.total > 0 && (
							<Badge variant="destructive" className="text-xs">
								{data.total}
							</Badge>
						)}
					</h1>
					<p className="text-sm text-muted-foreground mt-1">
						<Trans>
							Failed events that need attention. Replay or delete them.
						</Trans>
					</p>
				</div>
			</div>

			<DLQViewer entries={data?.items ?? []} isLoading={isLoading} />
		</div>
	);
}
