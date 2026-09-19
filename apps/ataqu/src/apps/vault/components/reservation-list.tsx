import { useListVariants } from "@ataqu/api-client";
import { Trans } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";

export function ReservationList() {
	const query = useListVariants({ limit: 100, offset: 0 });
	const variants = (query.data?.items ?? []).filter(
		(variant) => variant.reserved_quantity > 0,
	);
	return (
		<section className="space-y-4">
			<h1 className="text-2xl font-semibold">
				<Trans>Reserved stock</Trans>
			</h1>
			<p className="text-sm text-muted-foreground">
				<Trans>
					Reserved quantities for the first 100 variants. Reservation history
					and release are not available. Open a product to reserve stock.
				</Trans>
			</p>
			{query.isLoading ? (
				<p role="status">
					<Trans>Loading stock…</Trans>
				</p>
			) : query.isError ? (
				<p role="alert">
					<Trans>Unable to load reserved stock.</Trans>
				</p>
			) : variants.length ? (
				<table className="w-full text-left text-sm">
					<thead>
						<tr>
							<th>
								<Trans>SKU</Trans>
							</th>
							<th>
								<Trans>Reserved quantity</Trans>
							</th>
						</tr>
					</thead>
					<tbody>
						{variants.map((variant) => (
							<tr key={variant.id} className="border-b border-border">
								<td className="py-3">
									<Link
										to="/vault/products/$id"
										params={{ id: variant.product_id }}
										className="hover:underline"
									>
										{variant.sku}
									</Link>
								</td>
								<td className="tabular-nums">{variant.reserved_quantity}</td>
							</tr>
						))}
					</tbody>
				</table>
			) : (
				<p>
					<Trans>No reserved stock in these variants.</Trans>
				</p>
			)}
		</section>
	);
}
