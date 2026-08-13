import { Button, Skeleton } from "@ataqu/ui";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { AlertTriangle, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { DLQEntry } from "../api/spark-api";
import { useDeleteDLQ, useReplayDLQ } from "../api/spark-api";
import { EmptyState } from "./empty-state";

interface DLQViewerProps {
	entries: DLQEntry[];
	isLoading: boolean;
}

export function DLQViewer({ entries, isLoading }: DLQViewerProps) {
	const [confirmId, setConfirmId] = useState<string | null>(null);
	const replayMutation = useReplayDLQ();
	const deleteMutation = useDeleteDLQ();

	if (isLoading) {
		return (
			<div className="space-y-3">
				{[1, 2, 3].map((i) => (
					<Skeleton key={i} className="h-16 w-full rounded-lg" />
				))}
			</div>
		);
	}

	if (entries.length === 0) {
		return (
			<EmptyState
				icon={AlertTriangle}
				title={<Trans>No dead-letter events</Trans>}
				description={<Trans>All workflows are healthy.</Trans>}
			/>
		);
	}

	return (
		<div className="space-y-3">
			{entries.map((entry) => (
				<div
					key={entry.id}
					className="p-4 bg-card border border-border rounded-lg"
				>
					<div className="flex items-start justify-between gap-4">
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-2 mb-2">
								<span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
									<Trans>Failed</Trans>
								</span>
								<span className="text-xs font-mono text-muted-foreground">
									{entry.event_type}
								</span>
								<span className="text-xs text-muted-foreground">
									<Trans>Attempts:</Trans> {entry.attempts}
								</span>
							</div>

							<div className="mb-2">
								<label className="text-xs text-muted-foreground block mb-0.5">
									<Trans>Error</Trans>
								</label>
								<p className="text-sm text-red-400 font-mono break-all">
									{entry.error}
								</p>
							</div>

							<div>
								<label className="text-xs text-muted-foreground block mb-0.5">
									<Trans>Payload</Trans>
								</label>
								<pre className="text-xs font-mono text-muted-foreground bg-background p-2 rounded border border-border overflow-x-auto max-h-24">
									{JSON.stringify(entry.payload, null, 2).slice(0, 500)}
								</pre>
							</div>

							<div className="text-xs text-muted-foreground mt-2">
								<Trans>Created:</Trans>{" "}
								{new Date(entry.created_at).toLocaleString()}
							</div>
						</div>

						<div className="flex flex-col gap-2 flex-shrink-0">
							<Button
								size="sm"
								variant="outline"
								onClick={() =>
									replayMutation.mutate(entry.id, {
										onSuccess: () => toast.success(t`Event replayed.`),
										onError: () => toast.error(t`Failed to replay event.`),
									})
								}
								disabled={replayMutation.isPending}
							>
								<RotateCcw className="mr-1 h-3 w-3" />
								<Trans>Replay</Trans>
							</Button>

							{confirmId === entry.id ? (
								<div className="flex flex-col gap-1">
									<Button
										size="sm"
										variant="destructive"
										onClick={() => {
											deleteMutation.mutate(entry.id, {
												onSuccess: () => {
													toast.success(t`DLQ entry deleted.`);
													setConfirmId(null);
												},
												onError: () => toast.error(t`Failed to delete entry.`),
											});
										}}
									>
										<Trans>Confirm</Trans>
									</Button>
									<Button
										size="sm"
										variant="ghost"
										onClick={() => setConfirmId(null)}
									>
										<Trans>Cancel</Trans>
									</Button>
								</div>
							) : (
								<Button
									size="sm"
									variant="destructive"
									onClick={() => setConfirmId(entry.id)}
								>
									<Trash2 className="mr-1 h-3 w-3" />
									<Trans>Delete</Trans>
								</Button>
							)}
						</div>
					</div>
				</div>
			))}
		</div>
	);
}
