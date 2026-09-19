import type { StockMovement } from "@ataqu/api-client";
import { useListMovements } from "@ataqu/api-client";
import { formatDate } from "@ataqu/shared-utils";
import { Bone, EmptyState, ExpandingSearch, SegmentedControl } from "@ataqu/ui";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useMemo, useState } from "react";
import { HistoryIcon } from "./icons";

function MovementsTable({ variantId }: { variantId: string }) {
	const movementsQuery = useListMovements(variantId, { limit: 50, offset: 0 });

	const movements = movementsQuery.data ?? [];

	const [reasonFilter, setReasonFilter] = useState("all");
	const [query, setQuery] = useState("");

	const reasons = useMemo(() => {
		const seen = new Set<string>();
		for (const movement of movements) {
			if (movement.reason) seen.add(movement.reason);
		}
		return Array.from(seen);
	}, [movements]);

	const filteredMovements = useMemo(() => {
		const needle = query.trim().toLowerCase();
		return movements.filter((movement: StockMovement) => {
			if (reasonFilter !== "all" && movement.reason !== reasonFilter)
				return false;
			if (!needle) return true;
			return (
				(movement.reason ?? "").toLowerCase().includes(needle) ||
				(movement.reference ?? "").toLowerCase().includes(needle) ||
				String(movement.quantity).includes(needle)
			);
		});
	}, [movements, query, reasonFilter]);

	if (movementsQuery.isLoading) {
		return (
			<Bone
				loading
				name="movement-history-1"
				fallback={<div className="h-48 w-full" />}
			>
				{null}
			</Bone>
		);
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
		<div className="space-y-3">
			<div className="flex flex-wrap items-center gap-2">
				<ExpandingSearch
					value={query}
					onChange={setQuery}
					placeholder={t`Search by reason, reference, or quantity...`}
					className="relative flex-1 min-w-48 max-w-sm"
				/>
				<SegmentedControl
					label={t`Filter movements`}
					options={[
						{ value: "all", label: t`All` },
						...reasons.map((reason) => ({ value: reason, label: reason })),
					]}
					value={reasonFilter}
					onValueChange={setReasonFilter}
				/>
			</div>
			{filteredMovements.length === 0 ? (
				<div className="overflow-x-auto rounded-lg border border-border">
					<p className="px-4 py-6 text-center text-sm text-muted-foreground">
						<Trans>No movements match this filter.</Trans>
					</p>
				</div>
			) : (
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
							{filteredMovements.map((movement) => (
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
			)}
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
