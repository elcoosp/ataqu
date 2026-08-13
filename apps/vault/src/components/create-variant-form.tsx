import { useCreateVariant } from '@ataqu/api-client';
import { Button, Input, Label } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { useQueryClient } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { showToast } from './toast-store';

export function CreateVariantForm({
  productId,
  onCreated,
}: {
  productId: string;
  onCreated?: () => void;
}) {
  const queryClient = useQueryClient();
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState('0');
  const [initialStock, setInitialStock] = useState('0');

  const parsedPrice = Number(price);
  const parsedInitialStock = Number(initialStock);

  const canSubmit =
    sku.trim().length > 0 &&
    Number.isFinite(parsedPrice) &&
    parsedPrice >= 0 &&
    Number.isFinite(parsedInitialStock) &&
    parsedInitialStock >= 0;

  const createVariant = useCreateVariant({
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vault', 'variants'] });
      showToast({
        variant: 'success',
        title: <Trans>Variant added.</Trans>,
      });
      setSku('');
      setPrice('0');
      setInitialStock('0');
      onCreated?.();
    },
    onError: () => {
      showToast({
        variant: 'error',
        title: <Trans>Variant creation failed.</Trans>,
        description: <Trans>The SKU may already exist or the product was not found.</Trans>,
      });
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    createVariant.mutate({
      product_id: productId,
      sku: sku.trim(),
      price: parsedPrice,
      initial_stock: parsedInitialStock,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="create-variant-sku">
            <Trans>SKU</Trans>
          </Label>
          <Input
            id="create-variant-sku"
            value={sku}
            onChange={(event) => setSku(event.target.value)}
            placeholder={'ACM-001-BLK'}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="create-variant-price">
            <Trans>Price (cents)</Trans>
          </Label>
          <Input
            id="create-variant-price"
            type="number"
            min={0}
            value={price}
            onChange={(event) => setPrice(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="create-variant-stock">
            <Trans>Initial stock</Trans>
          </Label>
          <Input
            id="create-variant-stock"
            type="number"
            min={0}
            value={initialStock}
            onChange={(event) => setInitialStock(event.target.value)}
          />
        </div>
      </div>
      <Button type="submit" disabled={!canSubmit || createVariant.isPending}>
        {createVariant.isPending ? <Trans>Adding...</Trans> : <Trans>Add Variant</Trans>}
      </Button>
    </form>
  );
}
