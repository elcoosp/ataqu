import { useGetLowStockAlerts } from "@ataqu/api-client";
import { SliderDetents } from "@ataqu/ui";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useState } from "react";

export function LowStockAlertForm({ productId }: { productId: string }) {
	const [threshold, setThreshold] = useState(5);
	const query = useGetLowStockAlerts({ threshold });
	const variants = (query.data ?? []).filter(
		(variant) => variant.product_id === productId,
	);
	return (
		<section className="space-y-3" aria-label={t`Low stock`}>
			<p className="text-sm text-muted-foreground">
				<Trans>
					Current low-stock variants. This threshold filters the view; it does
					not configure notifications.
				</Trans>
			</p>
			<SliderDetents
				label={t`Low stock threshold`}
				value={threshold}
				onValueChange={setThreshold}
				min={0}
				max={100}
				step={1}
				detents={[1, 5, 10, 25]}
			/>
			{query.isLoading ? (
				<p role="status">
					<Trans>Loading stock…</Trans>
				</p>
			) : query.isError ? (
				<p role="alert">
					<Trans>Unable to load low stock.</Trans>
				</p>
			) : variants.length ? (
				<ul>
					{variants.map((variant) => (
						<li
							key={variant.id}
							className="flex justify-between border-b border-border py-2"
						>
							<span>{variant.sku}</span>
							<span className="tabular-nums">
								{variant.stock_quantity - variant.reserved_quantity}
							</span>
						</li>
					))}
				</ul>
			) : (
				<p>
					<Trans>No variants below this threshold.</Trans>
				</p>
			)}
		</section>
	);
}
