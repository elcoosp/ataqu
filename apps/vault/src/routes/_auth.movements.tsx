import { useListVariants } from '@ataqu/api-client';
import { Label, Skeleton } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { EmptyState } from '../components/empty-state';
import { HistoryIcon } from '../components/icons';
import { MovementHistory } from '../components/movement-history';
import { ToastViewport } from '../components/toast-viewport';

export const Route = createFileRoute('/_auth/movements')({
  component: MovementsPage,
});

function MovementsPage() {
  const variantsQuery = useListVariants({ limit: 100, offset: 0 });
  const [selectedVariantId, setSelectedVariantId] = useState('');

  if (variantsQuery.isLoading) {
    return (
      <>
        <ToastViewport />
        <Skeleton className="h-64 w-full" />
      </>
    );
  }

  if (variantsQuery.isError) {
    return (
      <>
        <ToastViewport />
        <EmptyState
          icon={<HistoryIcon />}
          title={<Trans>Unable to load movements</Trans>}
          description={<Trans>Reload the page or try again in a few seconds.</Trans>}
        />
      </>
    );
  }

  const variants = variantsQuery.data?.items ?? [];

  if (variants.length === 0) {
    return (
      <>
        <ToastViewport />
        <EmptyState
          icon={<HistoryIcon />}
          title={<Trans>No movements yet</Trans>}
          description={<Trans>Adjust stock to see history.</Trans>}
        />
      </>
    );
  }

  const activeVariantId = selectedVariantId || variants[0]?.id;

  return (
    <>
      <ToastViewport />
      <section className="space-y-4">
        <div className="max-w-sm space-y-2">
          <Label htmlFor="movements-variant-filter">
            <Trans>Variant</Trans>
          </Label>
          <select
            id="movements-variant-filter"
            value={activeVariantId ?? ''}
            onChange={(event) => setSelectedVariantId(event.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.sku}
              </option>
            ))}
          </select>
        </div>
        <MovementHistory variantId={activeVariantId} />
      </section>
    </>
  );
}
