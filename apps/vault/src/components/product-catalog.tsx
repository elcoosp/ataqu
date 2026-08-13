import { useGetLowStockAlerts, useListProducts } from "@ataqu/api-client";
import { useDebounce } from "@ataqu/shared-hooks";
import { Badge, Button, Input, Skeleton } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { useMemo, useState } from "react";
import { CreateProductForm } from "./create-product-form";
import { CsvImport } from "./csv-import";
import { EmptyState } from "./empty-state";
import { PackageIcon } from "./icons";
import { showToast } from "./toast-store";

const escapeCsvValue = (value: string): string =>
	`"${value.replace(/"/g, '""')}"`;

export function ProductCatalog() {
	const [search, setSearch] = useState("");
	const [view, setView] = useState<"list" | "grid">("list");
	const [showCreateForm, setShowCreateForm] = useState(false);
	const debouncedSearch = useDebounce(search, 300);

	const productsQuery = useListProducts({ limit: 100, offset: 0 });
	const lowStockQuery = useGetLowStockAlerts({ threshold: 5 });

	const products = productsQuery.data?.items ?? [];
	const lowStockProductIds = useMemo(
		() =>
			new Set((lowStockQuery.data ?? []).map((variant) => variant.product_id)),
		[lowStockQuery.data],
	);

	const filteredProducts = useMemo(() => {
		const query = debouncedSearch.trim().toLowerCase();
		if (query.length === 0) return products;

		return products.filter(
			(product) =>
				product.name.toLowerCase().includes(query) ||
				product.sku.toLowerCase().includes(query),
		);
	}, [debouncedSearch, products]);

	const handleExportCsv = () => {
		const header = ["id", "name", "sku", "description"];
		const rows = filteredProducts.map((product) => [
			product.id,
			product.name,
			product.sku,
			product.description,
		]);

		const csv = [header, ...rows]
			.map((row) => row.map((cell) => escapeCsvValue(cell)).join(","))
			.join("\n");

		const blob = new Blob([csv], { type: "text/csv" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = "products.csv";
		link.click();
		URL.revokeObjectURL(url);

		showToast({
			variant: "success",
			title: <Trans>Export ready.</Trans>,
			description: <Trans>Your product CSV download has started.</Trans>,
		});
	};

	if (productsQuery.isLoading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-12 w-full" />
				<Skeleton className="h-72 w-full" />
			</div>
		);
	}

	if (productsQuery.isError) {
		return (
			<EmptyState
				icon={<PackageIcon />}
				title={<Trans>Unable to load products</Trans>}
				description={
					<Trans>Reload the page or try again in a few seconds.</Trans>
				}
			/>
		);
	}

	if (products.length === 0 && !showCreateForm) {
		return (
			<EmptyState
				icon={<PackageIcon />}
				title={<Trans>No products</Trans>}
				description={
					<Trans>
						Import your product catalog from CSV, or add your first product.
					</Trans>
				}
				ctaLabel={<Trans>Create Product</Trans>}
				onCtaClick={() => setShowCreateForm(true)}
			/>
		);
	}

	return (
		<section className="space-y-4">
			<div className="flex flex-wrap items-center gap-2">
				<Input
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					placeholder={"Search by name or SKU"}
					aria-label={"Search products"}
					className="max-w-sm"
				/>
				<Button
					type="button"
					variant="outline"
					aria-pressed={view === "grid"}
					onClick={() => setView("grid")}
				>
					<Trans>Grid</Trans>
				</Button>
				<Button
					type="button"
					variant="outline"
					aria-pressed={view === "list"}
					onClick={() => setView("list")}
				>
					<Trans>List</Trans>
				</Button>

				<div className="ml-auto flex flex-wrap items-center gap-2">
					<CsvImport />
					<Button type="button" variant="outline" onClick={handleExportCsv}>
						<Trans>Export CSV</Trans>
					</Button>
					<Button
						type="button"
						onClick={() => setShowCreateForm((current) => !current)}
					>
						{showCreateForm ? (
							<Trans>Close</Trans>
						) : (
							<Trans>Create Product</Trans>
						)}
					</Button>
				</div>
			</div>

			{showCreateForm ? (
				<CreateProductForm onCreated={() => setShowCreateForm(false)} />
			) : null}

			{filteredProducts.length === 0 ? (
				<EmptyState
					icon={<PackageIcon />}
					title={<Trans>No matching products</Trans>}
					description={
						<Trans>Try another search term or create a new product.</Trans>
					}
					ctaLabel={<Trans>Create Product</Trans>}
					onCtaClick={() => setShowCreateForm(true)}
				/>
			) : view === "list" ? (
				<div className="overflow-x-auto rounded-lg border border-border">
					<table className="w-full text-left text-sm">
						<thead className="border-b border-border bg-muted/20 text-xs uppercase text-muted-foreground">
							<tr>
								<th className="px-4 py-3">
									<Trans>Name</Trans>
								</th>
								<th className="px-4 py-3">
									<Trans>SKU</Trans>
								</th>
								<th className="px-4 py-3">
									<Trans>Description</Trans>
								</th>
								<th className="px-4 py-3">
									<Trans>Status</Trans>
								</th>
							</tr>
						</thead>
						<tbody>
							{filteredProducts.map((product) => (
								<tr
									key={product.id}
									className="border-b border-border last:border-b-0"
								>
									<td className="px-4 py-3">
										<a
											href={`/products/${product.id}`}
											className="font-medium text-foreground hover:underline"
										>
											{product.name}
										</a>
									</td>
									<td className="px-4 py-3 font-mono text-xs">{product.sku}</td>
									<td className="max-w-xs truncate px-4 py-3 text-muted-foreground">
										{product.description}
									</td>
									<td className="px-4 py-3">
										{lowStockProductIds.has(product.id) ? (
											<Badge variant="destructive">
												<Trans>Low Stock</Trans>
											</Badge>
										) : (
											<Badge variant="secondary">
												<Trans>In Stock</Trans>
											</Badge>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : (
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
					{filteredProducts.map((product) => (
						<a
							key={product.id}
							href={`/products/${product.id}`}
							className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40"
						>
							<div className="flex items-start justify-between gap-3">
								<div>
									<h3 className="font-heading text-base font-semibold text-foreground">
										{product.name}
									</h3>
									<p className="font-mono text-xs text-muted-foreground">
										{product.sku}
									</p>
								</div>
								{lowStockProductIds.has(product.id) ? (
									<Badge variant="destructive">
										<Trans>Low Stock</Trans>
									</Badge>
								) : null}
							</div>
							<p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
								{product.description}
							</p>
						</a>
					))}
				</div>
			)}
		</section>
	);
}
