import { api } from '@ataqu/api-client';
import type { UUID } from '@ataqu/types';
import { Button, Input, Label } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export function LowStockAlertForm({ productId }: { productId: UUID }) {
  const queryClient = useQueryClient();
  const [threshold, setThreshold] = useState('5');
  const [status, setStatus] = useState<string | null>(null);

  const setAlert = useMutation({
    mutationFn: (val: number) =>
      api.patch<void>(`/vault/products/${productId}/alerts`, { threshold: val }),
    onSuccess: () => {
      setStatus('Low stock alert set.');
      queryClient.invalidateQueries({ queryKey: ['vault', 'product', productId] });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to set alert.';
      setStatus(message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(threshold);
    if (Number.isFinite(value) && value >= 0) {
      setAlert.mutate(value);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-4">
      <div className="space-y-2">
        <Label htmlFor="low-stock-threshold">
          <Trans>Low Stock Threshold</Trans>
        </Label>
        <Input
          id="low-stock-threshold"
          type="number"
          min="0"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          className="w-32"
        />
      </div>
      <Button type="submit" disabled={setAlert.isPending}>
        {setAlert.isPending ? <Trans>Setting...</Trans> : <Trans>Set Low Stock Alert</Trans>}
      </Button>
      {status && <p className="text-sm text-muted-foreground">{status}</p>}
    </form>
  );
}
