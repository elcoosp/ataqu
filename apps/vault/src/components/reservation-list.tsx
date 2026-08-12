import { useListVariants, useReserveStock } from '@ataqu/api-client';
import { handleApiError } from '@ataqu/shared-utils';
import { Button, Input, Label, Skeleton } from '@ataqu/ui';
import { useQueryClient } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { EmptyState } from './empty-state';
import { BookmarkIcon } from './icons';

interface LocalReservation {
  id: string;
  variantId: string;
  sku: string;
  quantity: number;
  dealId: string;
  createdAt: string;
}

export function ReservationList() {
  const queryClient = useQueryClient();
  const variantsQuery = useListVariants({ limit: 100, offset: 0 });
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [dealId, setDealId] = useState('');
  const [reservations, setReservations] = useState<LocalReservation[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const variants = variantsQuery.data?.items ?? [];
  const selectedVariant =
    variants.find((variant) => variant.id === selectedVariantId) ?? variants[0];
  const parsedQuantity = Number(quantity);
  const canSubmit =
    Boolean(selectedVariant) &&
    Number.isInteger(parsedQuantity) &&
    parsedQuantity > 0 &&
    parsedQuantity <= (selectedVariant?.stock_quantity ?? 0);

  const reserveStock = useReserveStock({
    onSuccess: (response, variables) => {
      const variant = variants.find((item) => item.id === variables.variantId);
      setReservations((current) => [
        {
          id: response.reservation_id,
          variantId: variables.variantId,
          sku: variant?.sku ?? '',
          quantity: variables.data.quantity,
          dealId: dealId.trim(),
          createdAt: new Date().toISOString(),
        },
        ...current,
      ]);
      setQuantity('1');
      setDealId('');
      setStatus('Reservation created.');
      void queryClient.invalidateQueries({ queryKey: ['vault', 'variants'] });
    },
    onError: (error) => {
      setStatus(handleApiError(error));
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedVariant || !canSubmit) return;
    reserveStock.mutate({
      variantId: selectedVariant.id,
      data: { quantity: parsedQuantity },
    });
  };

  if (variantsQuery.isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (variantsQuery.isError) {
    return (
      <EmptyState
        icon={<BookmarkIcon />}
        title="Unable to load reservations"
        description="Reload the page or try again in a few seconds."
      />
    );
  }

  if (variants.length === 0) {
    return (
      <EmptyState
        icon={<BookmarkIcon />}
        title="No reservations"
        description="When CINQ deals are won, stock is reserved automatically."
      />
    );
  }

  return (
    <section className="space-y-4">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-border bg-card p-4"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="reservation-variant">Variant</Label>
            <select
              id="reservation-variant"
              value={selectedVariant?.id ?? ''}
              onChange={(event) => setSelectedVariantId(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.sku} — {variant.stock_quantity} in stock
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reservation-quantity">Quantity</Label>
            <Input
              id="reservation-quantity"
              type="number"
              min={1}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reservation-deal">CINQ deal ID</Label>
            <Input
              id="reservation-deal"
              value={dealId}
              onChange={(event) => setDealId(event.target.value)}
              placeholder="Optional deal UUID"
            />
          </div>
        </div>
        {status ? (
          <p role="status" className="text-sm text-muted-foreground">
            {status}
          </p>
        ) : null}
        <Button type="submit" disabled={!canSubmit || reserveStock.isPending}>
          {reserveStock.isPending ? 'Reserving...' : 'Reserve Stock'}
        </Button>
      </form>

      {reservations.length === 0 ? (
        <EmptyState
          icon={<BookmarkIcon />}
          title="No reservations"
          description="When CINQ deals are won, stock is reserved automatically."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/20 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Variant</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">CINQ deal</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((reservation) => (
                <tr key={reservation.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3 font-mono text-xs">{reservation.sku}</td>
                  <td className="px-4 py-3 font-mono">{reservation.quantity}</td>
                  <td className="px-4 py-3">
                    {reservation.dealId ? (
                      <a
                        href={`https://crm.ataqu.com/deals/${reservation.dealId}`}
                        className="text-primary hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {reservation.dealId}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{reservation.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
