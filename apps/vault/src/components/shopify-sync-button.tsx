import { shopifySync } from '@ataqu/api-client';
import { handleApiError } from '@ataqu/shared-utils';
import { Button } from '@ataqu/ui';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

export function ShopifySyncButton() {
  const [message, setMessage] = useState<string | null>(null);

  const syncMutation = useMutation({
    mutationFn: async () => {
      await shopifySync();
    },
    onSuccess: () => {
      setMessage('Shopify sync started.');
    },
    onError: (error) => {
      setMessage(handleApiError(error));
    },
  });

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={() => syncMutation.mutate()}
        disabled={syncMutation.isPending}
      >
        {syncMutation.isPending ? 'Syncing...' : 'Sync Shopify'}
      </Button>
      {message ? (
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}
    </div>
  );
}
