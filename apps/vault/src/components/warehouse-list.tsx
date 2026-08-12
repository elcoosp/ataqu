import { useCreateWarehouse, useListWarehouses } from '@ataqu/api-client';
import { handleApiError } from '@ataqu/shared-utils';
import { Button, Input, Label, Skeleton } from '@ataqu/ui';
import { useQueryClient } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { EmptyState } from './empty-state';
import { WarehouseIcon } from './icons';

export function WarehouseList() {
  const queryClient = useQueryClient();
  const warehousesQuery = useListWarehouses();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createWarehouse = useCreateWarehouse({
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vault', 'warehouses'] });
      setName('');
      setLocation('');
      setError(null);
      setShowCreateForm(false);
    },
    onError: (mutationError: unknown) => {
      setError(handleApiError(mutationError));
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (name.trim().length === 0 || createWarehouse.isPending) return;
    createWarehouse.mutate({
      name: name.trim(),
      location: location.trim() === '' ? undefined : location.trim(),
    });
  };

  if (warehousesQuery.isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (warehousesQuery.isError) {
    return (
      <EmptyState
        icon={<WarehouseIcon />}
        title="Unable to load warehouses"
        description="Reload the page or try again in a few seconds."
      />
    );
  }

  const warehouses = warehousesQuery.data ?? [];

  if (warehouses.length === 0 && !showCreateForm) {
    return (
      <EmptyState
        icon={<WarehouseIcon />}
        title="No warehouses"
        description="Add your first location."
        ctaLabel="Create Warehouse"
        onCtaClick={() => setShowCreateForm(true)}
      />
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-heading text-xl font-semibold text-foreground">Warehouses</h2>
        <Button type="button" onClick={() => setShowCreateForm((current) => !current)}>
          {showCreateForm ? 'Close' : 'Create Warehouse'}
        </Button>
      </div>

      {showCreateForm ? (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-lg border border-border bg-card p-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="warehouse-name">Name</Label>
              <Input
                id="warehouse-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Main warehouse"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="warehouse-location">Location</Label>
              <Input
                id="warehouse-location"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Berlin, DE"
              />
            </div>
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={name.trim().length === 0 || createWarehouse.isPending}>
            {createWarehouse.isPending ? 'Creating...' : 'Create Warehouse'}
          </Button>
        </form>
      ) : null}

      {warehouses.length === 0 ? null : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/20 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Location</th>
              </tr>
            </thead>
            <tbody>
              {warehouses.map((warehouse) => (
                <tr key={warehouse.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3 font-medium text-foreground">{warehouse.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{warehouse.location ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
