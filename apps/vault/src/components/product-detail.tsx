import { useGetProduct, useListVariants } from '@ataqu/api-client';
import { formatCurrency } from '@ataqu/shared-utils';
import { Button, OnboardTour, Skeleton } from '@ataqu/ui';
import { useMemo, useState } from 'react';
import { EmptyState } from './empty-state';
import { PackageIcon } from './icons';
import { MovementHistory } from './movement-history';
import { StockAdjustment } from './stock-adjustment';

const tourSteps = [
  {
    selector: '[data-tour="stock-display"]',
    content: 'Real-time stock. Zero race conditions.',
  },
  {
    selector: '[data-tour="adjust-stock"]',
    content: 'Adjust it. The math is protected at the database level. No overselling.',
  },
];

export function ProductDetail({ productId }: { productId: string }) {
  const productQuery = useGetProduct(productId);
  const variantsQuery = useListVariants({ limit: 100, offset: 0 });
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  const variants = useMemo(
    () => (variantsQuery.data?.items ?? []).filter((variant) => variant.product_id === productId),
    [variantsQuery.data, productId]
  );

  const selectedVariant =
    variants.find((variant) => variant.id === selectedVariantId) ?? variants[0];

  const totalStock = variants.reduce((sum, variant) => sum + variant.stock_quantity, 0);
  const totalReserved = variants.reduce((sum, variant) => sum + variant.reserved_quantity, 0);
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
        title="Unable to load product"
        description="Reload the page or try again in a few seconds."
      />
    );
  }

  const product = productQuery.data;

  if (!product) {
    return (
      <EmptyState
        icon={<PackageIcon />}
        title="Product not found"
        description="This product may have been deleted."
      />
    );
  }

  return (
    <OnboardTour tourId="vault-stock-tour" steps={tourSteps}>
      <section className="space-y-6">
        <header className="space-y-2">
          <h1 className="font-heading text-3xl font-bold text-foreground">{product.name}</h1>
          <p className="font-mono text-sm text-muted-foreground">{product.sku}</p>
          <p className="max-w-2xl text-sm text-muted-foreground">{product.description}</p>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total stock</p>
            <p
              data-tour="stock-display"
              className={
                totalStock > 0
                  ? 'font-mono text-2xl font-bold text-success'
                  : 'font-mono text-2xl font-bold text-destructive'
              }
            >
              {totalStock}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Reserved</p>
            <p className="font-mono text-2xl font-bold text-foreground">{totalReserved}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Available</p>
            <p className="font-mono text-2xl font-bold text-foreground">{availableStock}</p>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="font-heading text-xl font-semibold text-foreground">Variants</h2>
          {variants.length === 0 ? (
            <EmptyState
              icon={<PackageIcon />}
              title="No variants"
              description="Add a variant to start tracking stock and movements."
              ctaLabel="Add Variant"
              onCtaClick={() => {}}
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/20 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3">Reserved</th>
                    <th className="px-4 py-3">Available</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((variant) => (
                    <tr
                      key={variant.id}
                      className="cursor-pointer border-b border-border last:border-b-0 hover:bg-muted/10"
                      onClick={() => setSelectedVariantId(variant.id)}
                    >
                      <td className="px-4 py-3 font-mono text-xs">{variant.sku}</td>
                      <td className="px-4 py-3">{formatCurrency(variant.price / 100)}</td>
                      <td className="px-4 py-3 font-mono">{variant.stock_quantity}</td>
                      <td className="px-4 py-3 font-mono">{variant.reserved_quantity}</td>
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
            <StockAdjustment variant={selectedVariant} />
            <div className="space-y-4">
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Movement history
              </h2>
              <MovementHistory variantId={selectedVariant.id} />
            </div>
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => {}}>
            Sync Shopify
          </Button>
        </div>
      </section>
    </OnboardTour>
  );
}
