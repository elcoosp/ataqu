import {
	listProducts,
	searchProducts,
	useBulkDeleteProducts,
	useGetLowStockAlerts,
} from "@ataqu/api-client";
import { useDebounce, useUrlSearchParam } from "@ataqu/shared-hooks";
import {
	Badge,
	Bone,
	BulkActionBar,
	Button,
	EmptyState,
	Input,
	SelectAllCheckbox,
	SelectionCheckbox,
	VirtualRows,
} from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { toast } from "sonner";
import { CreateProductForm } from "./create-product-form";
import { CsvImport } from "./csv-import";
import { PackageIcon } from "./icons";

const SCOPE = "vault:products";

const escapeCsvValue = (value: string): string =>
	`"${value.replace(/"/g, '""')}"`;

export function ProductCatalog() {
	// Search, view mode, and create-form visibility are URL-backed so a
	// narrowed catalog (or a direct link to the create form) is shareable
	// and survives reload (brainstorm P1-3).
	const [search, setSearch] = useUrlSearchParam("q", { default: "" });
	const [view, setView] = useUrlSearchParam<"list" | "grid">("view", {
		default: "list",
		parse: (raw) => (raw === "grid" ? "grid" : "list"),
		serialize: (v) => (v === "list" ? undefined : v),
	});
	const [showCreateForm, setShowCreateForm] = useUrlSearchParam("createOpen", {
		default: false,
		parse: (raw) => raw === "1",
		serialize: (v) => (v ? "1" : undefined),
	});
	const debouncedSearch = useDebounce(search, 300);

	const productsQuery = useQuery({
		queryKey: ["vault", "products", { q: debouncedSearch, limit: 100 }],
		queryFn: () =>
			debouncedSearch.trim()
				? searchProducts(debouncedSearch.trim(), 100)
				: listProducts({ limit: 100, offset: 0 }),
	});
	const lowStockQuery = useGetLowStockAlerts({ threshold: 5 });
	const bulkDelete = useBulkDeleteProducts();

	const products = productsQuery.data?.items ?? [];
	const lowStockProductIds = useMemo(
		() =>
			new Set((lowStockQuery.data ?? []).map((variant) => variant.product_id)),
		[lowStockQuery.data],
	);

	const filteredProducts = products;

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

		toast.success(<Trans>Export ready.</Trans>, {
			description: <Trans>Your product CSV download has started.</Trans>,
		});
	};

	if (productsQuery.isLoading) {
		return (
			<div className="space-y-4">
				<Bone
					loading
					name="product-catalog-1"
					fallback={<div className="h-12 w-full" />}
				>
					{null}
				</Bone>
				<Bone
					loading
					name="product-catalog-2"
					fallback={<div className="h-72 w-full" />}
				>
					{null}
				</Bone>
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

	if (products.length === 0 && !search.trim() && !showCreateForm) {
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
						onClick={() => setShowCreateForm(!showCreateForm)}
					>
						{showCreateForm ? (
							<Trans>Close</Trans>
						) : (
							<Trans>Create Product</Trans>
						)}
					</Button>
				</div>
			</div>

			<BulkActionBar
				scope={SCOPE}
				actions={[
					{
						id: "delete",
						label: <Trans>Delete</Trans>,
						variant: "destructive",
						onClick: (selected) => bulkDelete.mutate({ ids: selected }),
					},
				]}
			/>

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
				<VirtualRows
					count={filteredProducts.length}
					estimateSize={52}
					maxHeight={600}
					className="rounded-lg border border-border"
				>
					{({ padTop, padBottom, items, measureElement }) => (
						<table className="w-full text-left text-sm">
							<thead className="border-b border-border bg-muted/20 text-xs uppercase text-muted-foreground">
								<tr>
									<th className="w-10 px-4 py-3">
										<SelectAllCheckbox
											scope={SCOPE}
											ids={filteredProducts.map((p) => p.id)}
										/>
									</th>
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
								{padTop > 0 && (
									<tr style={{ height: `${padTop}px` }} aria-hidden="true" />
								)}
								{items.map((vRow) => {
									const product = filteredProducts[vRow.index];
									return (
										<tr
											key={product.id}
											data-index={vRow.index}
											ref={measureElement}
											className="border-b border-border last:border-b-0"
										>
											<td
												className="px-4 py-3"
												onClick={(e) => e.preventDefault()}
											>
												<SelectionCheckbox scope={SCOPE} id={product.id} />
											</td>
											<td className="px-4 py-3">
												<Link
													to="/vault/products/$id"
													params={{ id: product.id }}
													className="font-medium text-foreground hover:underline"
												>
													{product.name}
												</Link>
											</td>
											<td className="px-4 py-3 font-mono text-xs">
												{product.sku}
											</td>
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
									);
								})}
								{padBottom > 0 && (
									<tr style={{ height: `${padBottom}px` }} aria-hidden="true" />
								)}
							</tbody>
						</table>
					)}
				</VirtualRows>
			) : (
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
					{filteredProducts.map((product) => (
						<Link
							key={product.id}
							to="/vault/products/$id"
							params={{ id: product.id }}
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
						</Link>
					))}
				</div>
			)}
		</section>
	);
}
