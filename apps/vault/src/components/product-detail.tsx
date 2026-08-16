import {
	useBulkDeleteVariants,
	useDeleteProduct,
	useDeleteVariant,
	useGetProduct,
	useListVariants,
	useReserveStock,
	useUpdateProduct,
	useUpdateVariant,
} from "@ataqu/api-client";
import { formatCurrency, handleApiError } from "@ataqu/shared-utils";
import { Button, Input, Label, OnboardTour, Skeleton } from "@ataqu/ui";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CreateVariantForm } from "./create-variant-form";
import { CrossAppBadge } from "./cross-app-badge";
import { EmptyState } from "./empty-state";
import { PackageIcon } from "./icons";
import { IntegrationToggle } from "./integration-toggle";
import { LowStockAlertForm } from "./low-stock-alert-form";
import { MovementHistory } from "./movement-history";
import { ShopifyConnect } from "./settings/shopify-connect";
import { ShopifyErrorLog } from "./settings/shopify-error-log";
import { ShopifyStatus } from "./settings/shopify-status";
import { ShopifySyncButton } from "./shopify-sync-button";
import { StockAdjustment } from "./stock-adjustment";

const tourSteps = [
	{
		selector: '[data-tour="stock-display"]',
		content: t`Real-time stock. Zero race conditions.`,
	},
	{
		selector: '[data-tour="adjust-stock"]',
		content: t`Adjust it. The math is protected at the database level. No overselling.`,
	},
];

export function ProductDetail({ productId }: { productId: string }) {
	const productQuery = useGetProduct(productId);
	const variantsQuery = useListVariants({ limit: 100, offset: 0 });
	const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
		null,
	);
	const [showCreateVariant, setShowCreateVariant] = useState(false);
	const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>([]);

	const bulkDeleteVariants = useBulkDeleteVariants({
		onSuccess: () => {
			setSelectedVariantIds([]);
			void variantsQuery.refetch();
		},
	});

	const variants = useMemo(
		() =>
			(variantsQuery.data?.items ?? []).filter(
				(variant) => variant.product_id === productId,
			),
		[variantsQuery.data, productId],
	);

	const selectedVariant =
		variants.find((variant) => variant.id === selectedVariantId) ?? variants[0];

	const totalStock = variants.reduce(
		(sum, variant) => sum + variant.stock_quantity,
		0,
	);
	const totalReserved = variants.reduce(
		(sum, variant) => sum + variant.reserved_quantity,
		0,
	);
	const availableStock = totalStock - totalReserved;

	if (productQuery.isLoading || variantsQuery.isLoading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-16 w-full" />
				<Skeleton className="h-64 w-full" />
			</div>
		);
	}

	if (productQuery.isError || variantsQuery.isError) {
		return (
			<EmptyState
				icon={<PackageIcon />}
				title={<Trans>Unable to load product</Trans>}
				description={
					<Trans>Reload the page or try again in a few seconds.</Trans>
				}
			/>
		);
	}

	const product = productQuery.data;

	if (!product) return null;

	const updateProduct = useUpdateProduct({
		onSuccess: () => toast.success(t`Product updated`),
		onError: (err) => toast.error(handleApiError(err)),
	});
	const updateVariant = useUpdateVariant({
		onSuccess: () => toast.success(t`Variant updated`),
		onError: (err) => toast.error(handleApiError(err)),
	});
	const deleteProduct = useDeleteProduct({
		onSuccess: () => {
			toast.success(t`Product deleted`);
			window.history.back();
		},
		onError: (err) => toast.error(handleApiError(err)),
	});
	const deleteVariant = useDeleteVariant({
		onSuccess: () => toast.success(t`Variant deleted`),
		onError: (err) => toast.error(handleApiError(err)),
	});
	const reserveStock = useReserveStock({
		onSuccess: () => {
			toast.success(t`Stock reserved`);
			setReserveQty("");
			setReserving(false);
		},
		onError: (err) => toast.error(handleApiError(err)),
	});
	const [reserving, setReserving] = useState(false);
	const [reserveQty, setReserveQty] = useState("");

	const saveReserve = () => {
		if (!selectedVariant) return;
		const qty = Number(reserveQty);
		if (!Number.isFinite(qty) || qty <= 0) return;
		reserveStock.mutate({
			variantId: selectedVariant.id,
			data: { quantity: qty },
			version: selectedVariant.version,
		});
	};

	const [editingProduct, setEditingProduct] = useState(false);
	const [prodName, setProdName] = useState("");
	const [prodDescription, setProdDescription] = useState("");
	const [prodSku, setProdSku] = useState("");

	const startEditProduct = () => {
		setProdName(product.name);
		setProdDescription(product.description);
		setProdSku(product.sku);
		setEditingProduct(true);
	};

	const saveProduct = () => {
		updateProduct.mutate({
			id: product.id,
			data: {
				name: prodName,
				description: prodDescription,
				sku: prodSku,
			},
			version: product.version,
		});
		setEditingProduct(false);
	};

	const [editingVariant, setEditingVariant] = useState(false);
	const [varPrice, setVarPrice] = useState("");
	const [varSku, setVarSku] = useState("");

	const startEditVariant = () => {
		if (!selectedVariant) return;
		setVarPrice(String(selectedVariant.price / 100));
		setVarSku(selectedVariant.sku);
		setEditingVariant(true);
	};

	const saveVariant = () => {
		if (!selectedVariant) return;
		updateVariant.mutate({
			id: selectedVariant.id,
			data: {
				price: Math.round(Number(varPrice) * 100),
				sku: varSku,
			},
			version: selectedVariant.version,
		});
		setEditingVariant(false);
	};

	if (!product) {
		return (
			<EmptyState
				icon={<PackageIcon />}
				title={<Trans>Product not found</Trans>}
				description={<Trans>This product may have been deleted.</Trans>}
			/>
		);
	}

	return (
		<OnboardTour tourId="vault-stock-tour" steps={tourSteps}>
			<section className="space-y-6">
				<header className="space-y-2">
					<div className="flex flex-wrap items-start justify-between gap-4">
						<div>
							{editingProduct ? (
								<div className="space-y-2">
									<Input
										value={prodName}
										onChange={(e) => setProdName(e.target.value)}
										placeholder={t`Name`}
									/>
									<Input
										value={prodSku}
										onChange={(e) => setProdSku(e.target.value)}
										placeholder={t`SKU`}
									/>
									<textarea
										className="w-full rounded-md border border-input bg-background p-2 text-sm"
										value={prodDescription}
										onChange={(e) => setProdDescription(e.target.value)}
										rows={2}
									/>
									<div className="flex gap-2">
										<Button
											onClick={saveProduct}
											disabled={updateProduct.isPending}
										>
											<Trans>Save</Trans>
										</Button>
										<Button
											variant="ghost"
											onClick={() => setEditingProduct(false)}
										>
											<Trans>Cancel</Trans>
										</Button>
									</div>
								</div>
							) : (
								<>
									<h1 className="font-heading text-3xl font-bold text-foreground">
										{product.name}
									</h1>
									<p className="font-mono text-sm text-muted-foreground">
										{product.sku}
									</p>
									<p className="max-w-2xl text-sm text-muted-foreground">
										{product.description}
									</p>
									<Button
										variant="outline"
										size="sm"
										className="mt-2"
										onClick={startEditProduct}
									>
										<Trans>Edit Product</Trans>
									</Button>
									<Button
										variant="destructive"
										size="sm"
										className="mt-2"
										onClick={() => deleteProduct.mutate(product.id)}
										disabled={deleteProduct.isPending}
									>
										<Trans>Delete Product</Trans>
									</Button>
								</>
							)}
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<CrossAppBadge entityId={product.id} />
							<ShopifySyncButton />
						</div>
					</div>
				</header>

				<div className="grid gap-4 md:grid-cols-3">
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="text-sm text-muted-foreground">
							<Trans>Total stock</Trans>
						</p>
						<p
							data-tour="stock-display"
							className={
								totalStock > 0
									? "font-mono text-2xl font-bold text-success"
									: "font-mono text-2xl font-bold text-destructive"
							}
						>
							{totalStock}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="text-sm text-muted-foreground">
							<Trans>Reserved</Trans>
						</p>
						<p className="font-mono text-2xl font-bold text-foreground">
							{totalReserved}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-4">
						<p className="text-sm text-muted-foreground">
							<Trans>Available</Trans>
						</p>
						<p className="font-mono text-2xl font-bold text-foreground">
							{availableStock}
						</p>
					</div>
				</div>

				<div className="space-y-4 rounded-lg border border-border bg-card p-4">
					<h2 className="font-heading text-xl font-semibold text-foreground">
						<Trans>Integrations</Trans>
					</h2>
					<IntegrationToggle entityId={product.id} />
					<LowStockAlertForm productId={product.id} />
				</div>

				<div className="space-y-4">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<h2 className="font-heading text-xl font-semibold text-foreground">
							<Trans>Variants</Trans>
						</h2>
						<Button
							type="button"
							variant="outline"
							onClick={() => setShowCreateVariant((current) => !current)}
						>
							{showCreateVariant ? (
								<Trans>Close</Trans>
							) : (
								<Trans>Add Variant</Trans>
							)}
						</Button>
					</div>

					{showCreateVariant ? (
						<CreateVariantForm
							productId={productId}
							onCreated={() => setShowCreateVariant(false)}
						/>
					) : null}

					{variants.length === 0 ? (
						<EmptyState
							icon={<PackageIcon />}
							title={<Trans>No variants</Trans>}
							description={
								<Trans>
									Add a variant to start tracking stock and movements.
								</Trans>
							}
							ctaLabel={<Trans>Add Variant</Trans>}
							onCtaClick={() => setShowCreateVariant(true)}
						/>
					) : (
						<div className="overflow-x-auto rounded-lg border border-border">
							{selectedVariantIds.length > 0 && (
								<div className="flex items-center gap-2 border-b border-border bg-muted/20 px-4 py-2 text-sm">
									<span className="text-muted-foreground">
										{selectedVariantIds.length} selected
									</span>
									<Button
										variant="destructive"
										size="sm"
										disabled={bulkDeleteVariants.isPending}
										onClick={() =>
											bulkDeleteVariants.mutate({ ids: selectedVariantIds })
										}
									>
										<Trans>Delete selected</Trans>
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => setSelectedVariantIds([])}
									>
										<Trans>Clear</Trans>
									</Button>
								</div>
							)}
							<table className="w-full text-left text-sm">
								<thead className="border-b border-border bg-muted/20 text-xs uppercase text-muted-foreground">
									<tr>
										<th className="w-10 px-4 py-3">
											<input
												type="checkbox"
												aria-label="Select all variants"
												checked={
													variants.length > 0 &&
													selectedVariantIds.length === variants.length
												}
												onChange={(e) =>
													setSelectedVariantIds(
														e.target.checked ? variants.map((v) => v.id) : [],
													)
												}
											/>
										</th>
										<th className="px-4 py-3">
											<Trans>SKU</Trans>
										</th>
										<th className="px-4 py-3">
											<Trans>Price</Trans>
										</th>
										<th className="px-4 py-3">
											<Trans>Stock</Trans>
										</th>
										<th className="px-4 py-3">
											<Trans>Reserved</Trans>
										</th>
										<th className="px-4 py-3">
											<Trans>Available</Trans>
										</th>
									</tr>
								</thead>
								<tbody>
									{variants.map((variant) => (
										<tr
											key={variant.id}
											className="cursor-pointer border-b border-border last:border-b-0 hover:bg-muted/10"
											onClick={() => setSelectedVariantId(variant.id)}
										>
											<td
												className="w-10 px-4 py-3"
												onClick={(e) => e.stopPropagation()}
											>
												<input
													type="checkbox"
													aria-label={`Select ${variant.sku}`}
													checked={selectedVariantIds.includes(variant.id)}
													onChange={(e) =>
														setSelectedVariantIds((prev) =>
															e.target.checked
																? [...prev, variant.id]
																: prev.filter((id) => id !== variant.id),
														)
													}
												/>
											</td>
											<td className="px-4 py-3 font-mono text-xs">
												{variant.sku}
											</td>
											<td className="px-4 py-3">
												{formatCurrency(variant.price / 100)}
											</td>
											<td className="px-4 py-3 font-mono">
												{variant.stock_quantity}
											</td>
											<td className="px-4 py-3 font-mono">
												{variant.reserved_quantity}
											</td>
											<td className="px-4 py-3 font-mono">
												{variant.stock_quantity - variant.reserved_quantity}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>

				{selectedVariant ? (
					<div className="space-y-6">
						<div className="flex flex-wrap items-start justify-between gap-2">
							<h2 className="font-heading text-xl font-semibold text-foreground">
								<Trans>Selected variant</Trans>
							</h2>
							<div className="flex gap-2">
								{!editingVariant && !reserving && (
									<Button
										variant="outline"
										size="sm"
										onClick={() => setReserving(true)}
									>
										<Trans>Reserve Stock</Trans>
									</Button>
								)}
								{!editingVariant && !reserving && (
									<>
										<Button
											variant="outline"
											size="sm"
											onClick={startEditVariant}
										>
											<Trans>Edit Variant</Trans>
										</Button>
										<Button
											variant="destructive"
											size="sm"
											onClick={() => deleteVariant.mutate(selectedVariant.id)}
											disabled={deleteVariant.isPending}
										>
											<Trans>Delete Variant</Trans>
										</Button>
									</>
								)}
							</div>
						</div>
						{reserving ? (
							<div className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-4">
								<div className="space-y-2">
									<Label>
										<Trans>Quantity to reserve</Trans>
									</Label>
									<Input
										type="number"
										value={reserveQty}
										onChange={(e) => setReserveQty(e.target.value)}
										className="w-40"
									/>
								</div>
								<Button onClick={saveReserve} disabled={reserveStock.isPending}>
									<Trans>Reserve</Trans>
								</Button>
								<Button variant="ghost" onClick={() => setReserving(false)}>
									<Trans>Cancel</Trans>
								</Button>
							</div>
						) : editingVariant ? (
							<div className="space-y-2 rounded-lg border border-border p-4">
								<div>
									<Label>
										<Trans>SKU</Trans>
									</Label>
									<Input
										value={varSku}
										onChange={(e) => setVarSku(e.target.value)}
									/>
								</div>
								<div>
									<Label>
										<Trans>Price</Trans>
									</Label>
									<Input
										type="number"
										step="0.01"
										value={varPrice}
										onChange={(e) => setVarPrice(e.target.value)}
									/>
								</div>
								<div className="flex gap-2">
									<Button
										onClick={saveVariant}
										disabled={updateVariant.isPending}
									>
										<Trans>Save</Trans>
									</Button>
									<Button
										variant="ghost"
										onClick={() => setEditingVariant(false)}
									>
										<Trans>Cancel</Trans>
									</Button>
								</div>
							</div>
						) : (
							<StockAdjustment variant={selectedVariant} />
						)}
						<div className="space-y-4">
							<h2 className="font-heading text-xl font-semibold text-foreground">
								<Trans>Movement history</Trans>
							</h2>
							<MovementHistory variantId={selectedVariant.id} />
						</div>
					</div>
				) : null}

				<div className="space-y-4">
					<h2 className="font-heading text-xl font-semibold text-foreground">
						<Trans>Shopify</Trans>
					</h2>
					<ShopifyConnect />
					<ShopifyStatus />
					<ShopifyErrorLog />
				</div>
			</section>
		</OnboardTour>
	);
}
