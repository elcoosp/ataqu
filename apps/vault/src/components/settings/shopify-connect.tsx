import { Button, Card, CardContent, CardHeader, CardTitle } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { useShopifyAuthStart } from '@/hooks/use-shopify-sync';

export function ShopifyConnect() {
  const authStart = useShopifyAuthStart();

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">
          <Trans>Connect Shopify</Trans>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          <Trans>Sync your Shopify products and inventory with VAULT.</Trans>
        </p>
        <Button type="button" onClick={() => authStart.mutate()} disabled={authStart.isPending}>
          {authStart.isPending ? <Trans>Connecting...</Trans> : <Trans>Connect Shopify</Trans>}
        </Button>
      </CardContent>
    </Card>
  );
}
