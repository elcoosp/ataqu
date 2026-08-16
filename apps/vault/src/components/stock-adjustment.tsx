import type { Variant } from "@ataqu/api-client";
import { api, useBulkAdjustStock } from "@ataqu/api-client";
import { Button, Input, Label } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import type { QueryKey } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { useState } from "react";
import { showToast } from "./toast-store";

interface PaginatedVariants {
	items: Variant[];
	total: number;
	limit: number;
	offset: number;
}

interface AdjustStockVariables {
	variantId: string;
	data: {
		delta: number;
		reason: string;
	};
	expectedVersion: number;
}

interface AdjustStockContext {
	previousVariants?: ReadonlyArray<[QueryKey, PaginatedVariants | undefined]>;
}

export function StockAdjustment({ variant }: { variant: Variant }) {
	const queryClient = useQueryClient();
	const [delta, setDelta] = useState("0");
	const [reason, setReason] = useState("adjustment");

	const bulkAdjust = useBulkAdjustStock({
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["vault", "variants"] });
			void queryClient.invalidateQueries({ queryKey: ["vault", "movements"] });
		},
	});

	const parsedDelta = Number(delta);
	const canSubmit = Number.isFinite(parsedDelta) && parsedDelta !== 0;

	const adjustStock = useMutation<
		Variant,
		Error,
		AdjustStockVariables,
		AdjustStockContext
	>({
		mutationFn: ({ variantId, data, expectedVersion }) =>
			api.put<Variant>(`/vault/variants/${variantId}/stock`, data, {
				headers: { "If-Match": `"${expectedVersion}"` },
			}),
		onMutate: async (variables) => {
			const previousVariants = queryClient.getQueriesData<PaginatedVariants>({
				queryKey: ["vault", "variants"],
			});

			queryClient.setQueriesData<PaginatedVariants>(
				{ queryKey: ["vault", "variants"] },
				(old) => {
					if (!old) return old;

					return {
						...old,
						items: old.items.map((item) =>
							item.id === variables.variantId
								? {
										...item,
										stock_quantity: item.stock_quantity + variables.data.delta,
										version: item.version + 1,
									}
								: item,
						),
					};
				},
			);

			return { previousVariants };
		},
		onError: (_error, _variables, context) => {
			if (context?.previousVariants) {
				for (const [queryKey, data] of context.previousVariants) {
					queryClient.setQueryData(queryKey, data);
				}
			}

			showToast({
				variant: "error",
				title: <Trans>Stock adjustment failed.</Trans>,
				description: (
					<Trans>The stock change was reverted. Please try again.</Trans>
				),
			});
		},
		onSuccess: () => {
			showToast({
				variant: "success",
				title: <Trans>Stock adjusted.</Trans>,
			});
			setDelta("0");
		},
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: ["vault", "variants"] });
			void queryClient.invalidateQueries({ queryKey: ["vault", "movements"] });
			void queryClient.invalidateQueries({ queryKey: ["vault", "low-stock"] });
		},
	});

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!canSubmit) return;

		adjustStock.mutate({
			variantId: variant.id,
			data: {
				delta: parsedDelta,
				reason,
			},
			expectedVersion: variant.version,
		});
	};

	return (
		<form
			onSubmit={handleSubmit}
			className="space-y-4 rounded-lg border border-border bg-card p-4"
		>
			<div className="grid gap-4 md:grid-cols-3">
				<div className="space-y-2">
					<Label htmlFor="stock-adjustment-delta">
						<Trans>Change amount</Trans>
					</Label>
					<Input
						id="stock-adjustment-delta"
						type="number"
						value={delta}
						onChange={(event) => setDelta(event.target.value)}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="stock-adjustment-reason">
						<Trans>Reason</Trans>
					</Label>
					<select
						id="stock-adjustment-reason"
						value={reason}
						onChange={(event) => setReason(event.target.value)}
						className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						<option value="sale">
							<Trans>Sale</Trans>
						</option>
						<option value="restock">
							<Trans>Restock</Trans>
						</option>
						<option value="adjustment">
							<Trans>Adjustment</Trans>
						</option>
						<option value="damage">
							<Trans>Damage</Trans>
						</option>
					</select>
				</div>
				<div className="flex items-end">
					<Button
						type="submit"
						data-tour="adjust-stock"
						disabled={!canSubmit || adjustStock.isPending}
						className="w-full md:w-auto"
					>
						{adjustStock.isPending ? (
							<Trans>Adjusting...</Trans>
						) : (
							<Trans>Adjust Stock</Trans>
						)}
					</Button>
					<Button
						type="button"
						variant="outline"
						className="ml-2"
						disabled={!canSubmit || bulkAdjust.isPending}
						onClick={() =>
							bulkAdjust.mutate({
								adjustments: [
									{
										variant_id: variant.id,
										delta: parsedDelta,
										expected_version: variant.version,
									},
								],
								reason,
							})
						}
					>
						<Trans>Bulk Adjust</Trans>
					</Button>
				</div>
			</div>
		</form>
	);
}
