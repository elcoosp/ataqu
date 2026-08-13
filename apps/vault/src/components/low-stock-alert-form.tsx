import { api } from "@ataqu/api-client";
import type { UUID } from "@ataqu/types";
import { Button, Input, Label } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { useState } from "react";
import { showToast } from "./toast-store";

export function LowStockAlertForm({ productId }: { productId: UUID }) {
	const queryClient = useQueryClient();
	const [threshold, setThreshold] = useState("5");

	const setAlert = useMutation({
		mutationFn: (value: number) =>
			api.patch<void>(`/vault/products/${productId}/alerts`, {
				threshold: value,
			}),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: ["vault", "product", productId],
			});
			showToast({
				variant: "success",
				title: <Trans>Low stock alert set.</Trans>,
			});
		},
		onError: () => {
			showToast({
				variant: "error",
				title: <Trans>Low stock alert update failed.</Trans>,
				description: (
					<Trans>
						The threshold must be a non-negative number. Please check the value
						and try again.
					</Trans>
				),
			});
		},
	});

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const value = Number(threshold);
		if (Number.isFinite(value) && value >= 0) {
			setAlert.mutate(value);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
			<div className="space-y-2">
				<Label htmlFor="low-stock-threshold">
					<Trans>Low Stock Threshold</Trans>
				</Label>
				<Input
					id="low-stock-threshold"
					type="number"
					min="0"
					value={threshold}
					onChange={(event) => setThreshold(event.target.value)}
					className="w-32"
				/>
			</div>
			<Button type="submit" disabled={setAlert.isPending}>
				{setAlert.isPending ? (
					<Trans>Setting...</Trans>
				) : (
					<Trans>Set Low Stock Alert</Trans>
				)}
			</Button>
		</form>
	);
}
