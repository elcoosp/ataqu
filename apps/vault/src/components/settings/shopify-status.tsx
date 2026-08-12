import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { useState } from 'react';
import {
  useShopifyDisconnect,
  useShopifyIntegrations,
  useShopifySync,
} from '@/hooks/use-shopify-sync';

export function ShopifyStatus() {
  const { data: integrations, isLoading } = useShopifyIntegrations();
  const sync = useShopifySync();
  const disconnect = useShopifyDisconnect();
  const [showDisconnect, setShowDisconnect] = useState(false);

  const integration = integrations?.[0];

  if (isLoading) return null;

  if (!integration) return null;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground">
            <Trans>Shopify Connection</Trans>
          </CardTitle>
          <Badge variant={integration.status === 'active' ? 'default' : 'destructive'}>
            {integration.status === 'active' ? <Trans>Connected</Trans> : <Trans>Error</Trans>}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            <Trans>Shop:</Trans> <span className="text-foreground">{integration.shop_domain}</span>
          </p>
          <p className="text-muted-foreground">
            <Trans>Last sync:</Trans>{' '}
            <span className="text-foreground">
              {integration.last_synced_at
                ? new Date(integration.last_synced_at).toLocaleString()
                : 'Never'}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => sync.mutate()}
            disabled={sync.isPending}
          >
            {sync.isPending ? <Trans>Syncing...</Trans> : <Trans>Sync now</Trans>}
          </Button>
          <Button type="button" variant="destructive" onClick={() => setShowDisconnect(true)}>
            <Trans>Disconnect</Trans>
          </Button>
        </div>
        {showDisconnect && (
          <div className="mt-4 p-4 bg-destructive/10 rounded-lg">
            <p className="text-sm text-foreground mb-2">
              <Trans>Are you sure you want to disconnect Shopify?</Trans>
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  disconnect.mutate();
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
        )}
      </CardContent>
    </Card>
  );
}
