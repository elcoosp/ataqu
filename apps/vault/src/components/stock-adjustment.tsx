import type { Variant } from '@ataqu/api-client';
import { useUpdateStock } from '@ataqu/api-client';
import { handleApiError } from '@ataqu/shared-utils';
import { Button, Input, Label } from '@ataqu/ui';
import { useQueryClient } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { useState } from 'react';

export function StockAdjustment({ variant }: { variant: Variant }) {
  const queryClient = useQueryClient();
  const [delta, setDelta] = useState('0');
  const [reason, setReason] = useState('adjustment');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const parsedDelta = Number(delta);
  const canSubmit = Number.isFinite(parsedDelta) && parsedDelta !== 0;

  const updateStock = useUpdateStock({
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['vault', 'variants'] });
      setStatus({ type: 'success', message: 'Stock adjusted.' });
      return variables;
    },
    onError: (error) => {
      setStatus({ type: 'error', message: handleApiError(error) });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['vault', 'variants'] });
      void queryClient.invalidateQueries({ queryKey: ['vault', 'movements'] });
      void queryClient.invalidateQueries({ queryKey: ['vault', 'low-stock'] });
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
          <Label htmlFor="stock-adjustment-delta">Change amount</Label>
          <Input
            id="stock-adjustment-delta"
            type="number"
            value={delta}
            onChange={(event) => setDelta(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="stock-adjustment-reason">Reason</Label>
          <select
            id="stock-adjustment-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="sale">Sale</option>
            <option value="restock">Restock</option>
            <option value="adjustment">Adjustment</option>
            <option value="damage">Damage</option>
          </select>
        </div>
        <div className="flex items-end">
          <Button
            type="submit"
            data-tour="adjust-stock"
            disabled={!canSubmit || updateStock.isPending}
            className="w-full md:w-auto"
          >
            {updateStock.isPending ? 'Adjusting...' : 'Adjust Stock'}
          </Button>
        </div>
      </div>
      {status ? (
        <p
          role={status.type === 'error' ? 'alert' : 'status'}
          className={status.type === 'error' ? 'text-sm text-destructive' : 'text-sm text-success'}
        >
          {status.message}
        </p>
      ) : null}
    </form>
  );
}
