import type { Variant } from '@ataqu/api-client';
import { reserveStock, useListVariants } from '@ataqu/api-client';
import { formatDate } from '@ataqu/shared-utils';
import { Button, Input, Label, Skeleton } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { EmptyState } from './empty-state';
import { BookmarkIcon } from './icons';
import { showToast } from './toast-store';

interface LocalReservation {
  id: string;
  variantId: string;
  sku: string;
  quantity: number;
  dealId: string;
  status: 'active';
  createdAt: string;
}

interface ReserveVariables {
  variantId: string;
  quantity: number;
  dealId: string;
  tempId: string;
}

interface ReserveResponse {
  variant: Variant;
  reservation_id: string;
}

interface ReserveContext {
  previousReservations: LocalReservation[];
}

export function ReservationList() {
  const queryClient = useQueryClient();
  const variantsQuery = useListVariants({ limit: 100, offset: 0 });
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [dealId, setDealId] = useState('');
  const [reservations, setReservations] = useState<LocalReservation[]>([]);

  const variants = variantsQuery.data?.items ?? [];
  const selectedVariant =
    variants.find((variant) => variant.id === selectedVariantId) ?? variants[0];

  const parsedQuantity = Number(quantity);
  const canSubmit =
    Boolean(selectedVariant) &&
    Number.isInteger(parsedQuantity) &&
    parsedQuantity > 0 &&
    parsedQuantity <= (selectedVariant?.stock_quantity ?? 0);

  const reserveMutation = useMutation<ReserveResponse, Error, ReserveVariables, ReserveContext>({
    mutationFn: ({ variantId, quantity: quantityToReserve }) =>
      reserveStock(variantId, { quantity: quantityToReserve }),
    onMutate: async (variables) => {
      const previousReservations = reservations;

      setReservations((current) => [
        {
          id: variables.tempId,
          variantId: variables.variantId,
          sku: selectedVariant?.sku ?? '',
          quantity: variables.quantity,
          dealId: variables.dealId,
          status: 'active',
          createdAt: new Date().toISOString(),
        },
        ...current,
      ]);

      return { previousReservations };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        setReservations(context.previousReservations);
      }

      showToast({
        variant: 'error',
        title: <Trans>Reservation failed.</Trans>,
        description: <Trans>Stock was not reserved. Please try again.</Trans>,
      });
    },
    onSuccess: (response, variables) => {
      setReservations((current) =>
        current.map((reservation) =>
          reservation.id === variables.tempId
            ? { ...reservation, id: response.reservation_id }
            : reservation
        )
      );

      void queryClient.invalidateQueries({ queryKey: ['vault', 'variants'] });
      setQuantity('1');
      setDealId('');

      showToast({
        variant: 'success',
        title: <Trans>Reservation created.</Trans>,
      });
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedVariant || !canSubmit) return;

    reserveMutation.mutate({
      variantId: selectedVariant.id,
      quantity: parsedQuantity,
      dealId: dealId.trim(),
      tempId: crypto.randomUUID(),
    });
  };

  if (variantsQuery.isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (variantsQuery.isError) {
    return (
      <EmptyState
        icon={<BookmarkIcon />}
        title={<Trans>Unable to load reservations</Trans>}
        description={<Trans>Reload the page or try again in a few seconds.</Trans>}
      />
    );
  }

  if (variants.length === 0) {
    return (
      <EmptyState
        icon={<BookmarkIcon />}
        title={<Trans>No reservations</Trans>}
        description={<Trans>When CINQ deals are won, stock is reserved automatically.</Trans>}
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
            <Label htmlFor="reservation-variant">
              <Trans>Variant</Trans>
            </Label>
            <select
              id="reservation-variant"
              value={selectedVariant?.id ?? ''}
              onChange={(event) => setSelectedVariantId(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.sku} — {variant.stock_quantity}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reservation-quantity">
              <Trans>Quantity</Trans>
            </Label>
            <Input
              id="reservation-quantity"
              type="number"
              min={1}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reservation-deal">
              <Trans>CINQ deal ID</Trans>
            </Label>
            <Input
              id="reservation-deal"
              value={dealId}
              onChange={(event) => setDealId(event.target.value)}
              placeholder={'Optional deal UUID'}
            />
          </div>
        </div>
        <Button type="submit" disabled={!canSubmit || reserveMutation.isPending}>
          {reserveMutation.isPending ? <Trans>Reserving...</Trans> : <Trans>Reserve Stock</Trans>}
        </Button>
      </form>

      {reservations.length === 0 ? (
        <EmptyState
          icon={<BookmarkIcon />}
          title={<Trans>No reservations</Trans>}
          description={<Trans>When CINQ deals are won, stock is reserved automatically.</Trans>}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/20 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">
                  <Trans>Variant</Trans>
                </th>
                <th className="px-4 py-3">
                  <Trans>Quantity</Trans>
                </th>
                <th className="px-4 py-3">
                  <Trans>CINQ deal</Trans>
                </th>
                <th className="px-4 py-3">
                  <Trans>Status</Trans>
                </th>
                <th className="px-4 py-3">
                  <Trans>Created</Trans>
                </th>
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
                        rel="noreferrer noopener"
                      >
                        {reservation.dealId}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Trans>Active</Trans>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(reservation.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
