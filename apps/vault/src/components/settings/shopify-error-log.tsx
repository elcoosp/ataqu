import { Button, Card, CardContent, CardHeader, CardTitle } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { useState } from 'react';
import { useShopifySyncLogs } from '@/hooks/use-shopify-sync';

export function ShopifyErrorLog() {
  const { data: logs, isLoading } = useShopifySyncLogs();
  const [expanded, setExpanded] = useState(false);

  const errors = logs?.filter((log) => log.status === 'failed') ?? [];

  if (isLoading || errors.length === 0) return null;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground">
            <Trans>Sync Errors</Trans>
          </CardTitle>
          <Button type="button" variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
            {expanded ? <Trans>Collapse</Trans> : <Trans>Expand</Trans>}
          </Button>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-2">
          {errors.slice(0, 20).map((log) => (
            <div key={log.id} className="p-2 bg-destructive/5 rounded border border-destructive/20">
              <p className="text-xs text-muted-foreground">
                {new Date(log.created_at).toLocaleString()}
              </p>
              <p className="text-sm text-foreground">{log.error_message || 'Unknown error'}</p>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
