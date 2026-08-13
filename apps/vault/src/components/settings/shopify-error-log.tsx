import { formatDate } from '@ataqu/shared-utils';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { useState } from 'react';
import { useShopifySyncLogs } from '@/hooks/use-shopify-sync';
import { useShopifyStore } from '@/stores/shopify-store';

export function ShopifyErrorLog() {
  const { data: logs } = useShopifySyncLogs();
  const storeErrors = useShopifyStore((state) => state.errorLog);
  const [expanded, setExpanded] = useState(false);

  const apiErrors = (logs ?? [])
    .filter((log) => log.status === 'failed')
    .map((log) => ({
      id: log.id,
      timestamp: log.created_at,
      name: log.product_id ?? log.shopify_id?.toString() ?? '—',
      error: log.error_message ?? 'Unknown error',
    }));

  const errors = [...apiErrors, ...storeErrors];

  if (errors.length === 0) return null;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground">
            <Trans>Sync Errors</Trans>
          </CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? <Trans>Collapse</Trans> : <Trans>Expand</Trans>}
          </Button>
        </div>
      </CardHeader>
      {expanded ? (
        <CardContent className="space-y-2">
          {errors.slice(0, 20).map((log) => (
            <div key={log.id} className="rounded border border-destructive/20 bg-destructive/5 p-2">
              <p className="text-xs text-muted-foreground">{formatDate(log.timestamp)}</p>
              <p className="text-sm text-foreground">{log.name}</p>
              <p className="text-xs text-muted-foreground">{log.error}</p>
            </div>
          ))}
        </CardContent>
      ) : null}
    </Card>
  );
}
