import type { WorkflowRun } from "@ataqu/api-client";
import { Button } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { X } from "lucide-react";

interface RunDetailPanelProps {
	run: WorkflowRun | null;
	onClose: () => void;
}

export function RunDetailPanel({ run, onClose }: RunDetailPanelProps) {
	if (!run) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
			role="dialog"
			aria-modal="true"
		>
			<div className="ataqu-glass w-full max-w-2xl max-h-[80vh] rounded-lg p-6 overflow-y-auto">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg font-heading font-bold text-foreground">
						<Trans>Run Details</Trans>
					</h2>
					<Button
						variant="ghost"
						size="icon"
						onClick={onClose}
						className="h-8 w-8"
					>
						<X className="h-4 w-4" />
					</Button>
				</div>

				<div className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="text-xs text-muted-foreground block mb-1">
								<Trans>Run ID</Trans>
							</label>
							<p className="text-sm font-mono text-foreground break-all">
								{run.id}
							</p>
						</div>
						<div>
							<label className="text-xs text-muted-foreground block mb-1">
								<Trans>Workflow ID</Trans>
							</label>
							<p className="text-sm font-mono text-foreground break-all">
								{run.workflow_id}
							</p>
						</div>
						<div>
							<label className="text-xs text-muted-foreground block mb-1">
								<Trans>Status</Trans>
							</label>
							<p className="text-sm font-medium text-foreground capitalize">
								{run.status.replace("_", " ")}
							</p>
						</div>
						<div>
							<label className="text-xs text-muted-foreground block mb-1">
								<Trans>Started</Trans>
							</label>
							<p className="text-sm text-foreground">
								{new Date(run.created_at).toLocaleString()}
							</p>
						</div>
						<div>
							<label className="text-xs text-muted-foreground block mb-1">
								<Trans>Last Updated</Trans>
							</label>
							<p className="text-sm text-foreground">
								{new Date(run.updated_at).toLocaleString()}
							</p>
						</div>
					</div>

					<div>
						<label className="text-xs text-muted-foreground block mb-1">
							<Trans>Payload</Trans>
						</label>
						<pre className="p-3 rounded-md bg-background border border-border text-xs font-mono text-foreground overflow-x-auto max-h-64">
							{JSON.stringify(run.payload, null, 2)}
						</pre>
					</div>
				</div>
			</div>
		</div>
	);
}
