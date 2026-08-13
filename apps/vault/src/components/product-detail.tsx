import { useGetProduct, useListVariants } from '@ataqu/api-client';
import { formatCurrency } from '@ataqu/shared-utils';
import { Button, OnboardTour, Skeleton } from '@ataqu/ui';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { useMemo, useState } from 'react';
import { CreateVariantForm } from './create-variant-form';
import { CrossAppBadge } from './cross-app-badge';
import { EmptyState } from './empty-state';
import { PackageIcon } from './icons';
import { IntegrationToggle } from './integration-toggle';
import { LowStockAlertForm } from './low-stock-alert-form';
import { MovementHistory } from './movement-history';
import { ShopifyConnect } from './settings/shopify-connect';
import { ShopifyErrorLog } from './settings/shopify-error-log';
import { ShopifyStatus } from './settings/shopify-status';
import { ShopifySyncButton } from './shopify-sync-button';
import { StockAdjustment } from './stock-adjustment';

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
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [showCreateVariant, setShowCreateVariant] = useState(false);

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
        title={<Trans>Unable to load product</Trans>}
        description={<Trans>Reload the page or try again in a few seconds.</Trans>}
      />
    );
  }

  const product = productQuery.data;

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
              <h1 className="font-heading text-3xl font-bold text-foreground">{product.name}</h1>
              <p className="font-mono text-sm text-muted-foreground">{product.sku}</p>
              <p className="max-w-2xl text-sm text-muted-foreground">{product.description}</p>
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
                  ? 'font-mono text-2xl font-bold text-success'
                  : 'font-mono text-2xl font-bold text-destructive'
              }
            >
              {totalStock}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">
              <Trans>Reserved</Trans>
            </p>
            <p className="font-mono text-2xl font-bold text-foreground">{totalReserved}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">
              <Trans>Available</Trans>
            </p>
            <p className="font-mono text-2xl font-bold text-foreground">{availableStock}</p>
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
              {showCreateVariant ? <Trans>Close</Trans> : <Trans>Add Variant</Trans>}
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
              description={<Trans>Add a variant to start tracking stock and movements.</Trans>}
              ctaLabel={<Trans>Add Variant</Trans>}
              onCtaClick={() => setShowCreateVariant(true)}
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/20 text-xs uppercase text-muted-foreground">
                  <tr>
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
