import type { Variant } from '@ataqu/api-client';
import { useUpdateStock } from '@ataqu/api-client';
import { Button, Input, Label } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { useQueryClient } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { useState } from 'react';

interface PaginatedVariants {
  items: Variant[];
  total: number;
  limit: number;
  offset: number;
}

export function StockAdjustment({ variant }: { variant: Variant }) {
  const queryClient = useQueryClient();
  const [delta, setDelta] = useState('0');
  const [reason, setReason] = useState('adjustment');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const parsedDelta = Number(delta);
  const canSubmit = Number.isFinite(parsedDelta) && parsedDelta !== 0;

  const updateStock = useUpdateStock({
    onMutate: async ({ variantId, data }) => {
      await queryClient.cancelQueries({ queryKey: ['vault', 'variants'] });
      const queryKey = ['vault', 'variants', { limit: 100, offset: 0 }];
      const previousData = queryClient.getQueryData<PaginatedVariants>(queryKey);
      if (previousData) {
        queryClient.setQueryData(queryKey, {
          ...previousData,
          items: previousData.items.map((v) =>
            v.id === variantId
              ? { ...v, stock_quantity: v.stock_quantity + data.delta, version: v.version + 1 }
              : v
          ),
        });
      }
      return { previousData };
    },
    onError: (err, _variables, context: unknown) => {
      const ctx = context as { previousData?: PaginatedVariants } | undefined;
      if (ctx?.previousData) {
        queryClient.setQueryData(
          ['vault', 'variants', { limit: 100, offset: 0 }],
          ctx.previousData
        );
      }
      setStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to adjust stock',
      });
    },
    onSuccess: () => {
      setStatus({ type: 'success', message: 'Stock adjusted.' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['vault', 'variants'] });
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    updateStock.mutate({
      variantId: variant.id,
      data: { delta: parsedDelta, reason },
    });
    setDelta('0');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="stock-adjustment-delta">
            <Trans>Change amount</Trans>
          </Label>
          <Input
            id="stock-adjustment-delta"
            type="number"
            value={delta}
            onChange={(event) => setDelta(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="stock-adjustment-reason">
            <Trans>Reason</Trans>
          </Label>
          <select
            id="stock-adjustment-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="sale">
              <Trans>Sale</Trans>
            </option>
            <option value="restock">
              <Trans>Restock</Trans>
            </option>
            <option value="adjustment">
              <Trans>Adjustment</Trans>
            </option>
            <option value="damage">
              <Trans>Damage</Trans>
            </option>
          </select>
        </div>
        <div className="flex items-end">
          <Button
            type="submit"
            data-tour="adjust-stock"
            disabled={!canSubmit || updateStock.isPending}
            className="w-full md:w-auto"
          >
            {updateStock.isPending ? <Trans>Adjusting...</Trans> : <Trans>Adjust Stock</Trans>}
          </Button>
        </div>
      </div>
      {status && (
        <p
          role={status.type === 'error' ? 'alert' : 'status'}
          className={status.type === 'error' ? 'text-sm text-destructive' : 'text-sm text-success'}
        >
          {status.message}
        </p>
      )}
    </form>
  );
}
