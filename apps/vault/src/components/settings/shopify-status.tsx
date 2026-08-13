import { formatDate } from '@ataqu/shared-utils';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { useState } from 'react';
import {
  useShopifyDisconnect,
  useShopifyIntegrations,
  useShopifySync,
} from '@/hooks/use-shopify-sync';
import { useShopifyStore } from '@/stores/shopify-store';
import { showToast } from '../toast-store';

export function ShopifyStatus() {
  const { data: integrations } = useShopifyIntegrations();
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

  const disconnectMutation = useShopifyDisconnect({
    onSuccess: () => {
      useShopifyStore.getState().setConnection(false, null);
      showToast({
        variant: 'success',
        title: <Trans>Shopify disconnected.</Trans>,
      });
    },
    onError: () => {
      showToast({
        variant: 'error',
        title: <Trans>Shopify disconnect failed.</Trans>,
        description: <Trans>The connection was not removed. Please try again.</Trans>,
      });
    },
  });

  const [showDisconnect, setShowDisconnect] = useState(false);

  const integration = integrations?.[0];
  const store = useShopifyStore();
  const isConnected = Boolean(integration) || store.isConnected;

  if (!isConnected) return null;

  const shopDomain = integration?.shop_domain ?? store.shopDomain ?? '—';
  const lastSyncedAt = integration?.last_synced_at ?? store.lastSyncedAt;
  const productCount = integration?.product_count ?? store.productCount;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground">
            <Trans>Shopify Connection</Trans>
          </CardTitle>
          <Badge variant={integration?.status === 'error' ? 'destructive' : 'default'}>
            {integration?.status === 'error' ? <Trans>Error</Trans> : <Trans>Connected</Trans>}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            <Trans>Shop:</Trans> <span className="text-foreground">{shopDomain}</span>
          </p>
          <p className="text-muted-foreground">
            <Trans>Last sync:</Trans>{' '}
            <span className="text-foreground">
              {lastSyncedAt ? formatDate(lastSyncedAt) : <Trans>Never</Trans>}
            </span>
          </p>
          <p className="text-muted-foreground">
            <Trans>Products synced:</Trans> <span className="text-foreground">{productCount}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? <Trans>Syncing...</Trans> : <Trans>Sync now</Trans>}
          </Button>
          <Button type="button" variant="destructive" onClick={() => setShowDisconnect(true)}>
            <Trans>Disconnect</Trans>
          </Button>
        </div>

        {showDisconnect ? (
          <div className="mt-4 rounded-lg bg-destructive/10 p-4">
            <p className="mb-2 text-sm text-foreground">
              <Trans>Are you sure you want to disconnect Shopify?</Trans>
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  disconnectMutation.mutate();
                  setShowDisconnect(false);
                }}
              >
                <Trans>Yes, disconnect</Trans>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDisconnect(false)}
              >
                <Trans>Cancel</Trans>
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
