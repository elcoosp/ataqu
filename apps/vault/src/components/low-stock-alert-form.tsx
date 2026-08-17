import { api } from "@ataqu/api-client";
import type { UUID } from "@ataqu/types";
import { CollapsibleBanner, LoadingButton, SliderDetents } from "@ataqu/ui";
import { t } from "@lingui/core/macro";
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
		<div className="space-y-4">
			<CollapsibleBanner
				title={<Trans>About low stock alerts</Trans>}
				description={
					<Trans>
						You'll be notified when any variant's available stock drops to or
						below the threshold you set here.
					</Trans>
				}
			/>
			<form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
				<div className="space-y-2">
					<SliderDetents
						label={t`Low Stock Threshold`}
						value={Number.isFinite(Number(threshold)) ? Number(threshold) : 0}
						onValueChange={(v) => setThreshold(String(v))}
						min={0}
						max={100}
						step={1}
						detents={[1, 5, 10, 25]}
					/>
				</div>
				<LoadingButton
					onAction={async () => {
						await new Promise<void>((resolve, reject) => {
							try {
								const value = Number(threshold);
								if (Number.isFinite(value) && value >= 0) {
									setAlert.mutate(value, {
										onSuccess: () => resolve(),
										onError: () => reject(),
									});
								} else {
									resolve();
								}
							} catch (e) {
								reject(e);
							}
						});
					}}
					disabled={setAlert.isPending}
				>
					Set Low Stock Alert
				</LoadingButton>
			</form>
		</div>
	);
}
