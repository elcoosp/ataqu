import { Button } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { useShopifySync } from '@/hooks/use-shopify-sync';
import { showToast } from './toast-store';

export function ShopifySyncButton() {
  const syncMutation = useShopifySync({
    onSuccess: () => {
      showToast({
        variant: 'success',
        title: <Trans>Shopify sync started.</Trans>,
      });
    },
    onError: () => {
      showToast({
        variant: 'error',
        title: <Trans>Shopify sync failed.</Trans>,
        description: <Trans>The sync request was not accepted. Please try again.</Trans>,
      });
    },
  });

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => syncMutation.mutate()}
      disabled={syncMutation.isPending}
    >
      {syncMutation.isPending ? <Trans>Syncing...</Trans> : <Trans>Sync Shopify</Trans>}
    </Button>
  );
}
