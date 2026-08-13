import { useListMovements } from "@ataqu/api-client";
import { formatDate } from "@ataqu/shared-utils";
import { Skeleton } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { EmptyState } from "./empty-state";
import { HistoryIcon } from "./icons";

function MovementsTable({ variantId }: { variantId: string }) {
	const movementsQuery = useListMovements(variantId, { limit: 50, offset: 0 });

	if (movementsQuery.isLoading) {
		return <Skeleton className="h-48 w-full" />;
	}

	if (movementsQuery.isError) {
		return (
			<EmptyState
				icon={<HistoryIcon />}
				title={<Trans>Unable to load movements</Trans>}
				description={
					<Trans>Reload the page or try again in a few seconds.</Trans>
				}
			/>
		);
	}

	const movements = movementsQuery.data ?? [];

	if (movements.length === 0) {
		return (
			<EmptyState
				icon={<HistoryIcon />}
				title={<Trans>No movements yet</Trans>}
				description={<Trans>Adjust stock to see history.</Trans>}
			/>
		);
	}

	return (
		<div className="overflow-x-auto rounded-lg border border-border">
			<table className="w-full text-left text-sm">
				<thead className="border-b border-border bg-muted/20 text-xs uppercase text-muted-foreground">
					<tr>
						<th className="px-4 py-3">
							<Trans>Date</Trans>
						</th>
						<th className="px-4 py-3">
							<Trans>Change</Trans>
						</th>
						<th className="px-4 py-3">
							<Trans>Reason</Trans>
						</th>
						<th className="px-4 py-3">
							<Trans>Reference</Trans>
						</th>
					</tr>
				</thead>
				<tbody>
					{movements.map((movement) => (
						<tr
							key={movement.id}
							className="border-b border-border last:border-b-0"
						>
							<td className="px-4 py-3 text-muted-foreground">
								{formatDate(movement.timestamp)}
							</td>
							<td
								className={
									movement.quantity >= 0
										? "px-4 py-3 font-mono text-success"
										: "px-4 py-3 font-mono text-destructive"
								}
							>
								{movement.quantity >= 0
									? `+${movement.quantity}`
									: movement.quantity}
							</td>
							<td className="px-4 py-3">{movement.reason}</td>
							<td className="px-4 py-3 text-muted-foreground">
								{movement.reference ?? "—"}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

export function MovementHistory({ variantId }: { variantId?: string }) {
	if (!variantId) {
		return (
			<EmptyState
				icon={<HistoryIcon />}
				title={<Trans>No movements yet</Trans>}
				description={<Trans>Adjust stock to see history.</Trans>}
			/>
		);
	}

	return <MovementsTable variantId={variantId} />;
}
