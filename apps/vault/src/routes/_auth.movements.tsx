import { useListVariants } from '@ataqu/api-client';
import { Label, Skeleton } from '@ataqu/ui';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { EmptyState } from '../components/empty-state';
import { HistoryIcon } from '../components/icons';
import { MovementHistory } from '../components/movement-history';

export const Route = createFileRoute('/_auth/movements')({
  component: MovementsPage,
});

function MovementsPage() {
  const variantsQuery = useListVariants({ limit: 100, offset: 0 });
  const [selectedVariantId, setSelectedVariantId] = useState('');

  if (variantsQuery.isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (variantsQuery.isError) {
    return (
      <EmptyState
        icon={<HistoryIcon />}
        title="Unable to load movements"
        description="Reload the page or try again in a few seconds."
      />
    );
  }

  const variants = variantsQuery.data?.items ?? [];

  if (variants.length === 0) {
    return (
      <EmptyState
        icon={<HistoryIcon />}
        title="No movements yet"
        description="Adjust stock to see history."
      />
    );
  }

  const activeVariantId = selectedVariantId || variants[0]?.id;

  return (
    <section className="space-y-4">
      <div className="max-w-sm space-y-2">
        <Label htmlFor="movements-variant-filter">Variant</Label>
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
  );
}
