import { useCreateProduct } from '@ataqu/api-client';
import { handleApiError } from '@ataqu/shared-utils';
import { Button, Input, Label } from '@ataqu/ui';
import { useQueryClient } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { useState } from 'react';

export function CreateProductForm({ onCreated }: { onCreated?: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createProduct = useCreateProduct({
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vault', 'products'] });
      setName('');
      setSku('');
      setDescription('');
      setError(null);
      onCreated?.();
    },
    onError: (mutationError: unknown) => {
      setError(handleApiError(mutationError));
    },
  });

  const canSubmit = name.trim().length > 0 && sku.trim().length > 0 && !createProduct.isPending;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    createProduct.mutate({ name: name.trim(), sku: sku.trim(), description: description.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="create-product-name">Name</Label>
          <Input
            id="create-product-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Acme widget"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="create-product-sku">SKU</Label>
          <Input
            id="create-product-sku"
            value={sku}
            onChange={(event) => setSku(event.target.value)}
            placeholder="ACM-001"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="create-product-description">Description</Label>
          <Input
            id="create-product-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Short product description"
          />
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={!canSubmit}>
        {createProduct.isPending ? 'Creating...' : 'Create Product'}
      </Button>
    </form>
  );
}
