import { Button, Card, CardContent, CardHeader, CardTitle } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { useShopifyAuthStart } from "@/hooks/use-shopify-sync";
import { showToast } from "../toast-store";

export function ShopifyConnect() {
	const authStart = useShopifyAuthStart({
		onSuccess: (data) => {
			window.location.href = data.url;
		},
		onError: () => {
			showToast({
				variant: "error",
				title: <Trans>Shopify connection failed.</Trans>,
				description: (
					<Trans>The OAuth flow could not be started. Please try again.</Trans>
				),
			});
		},
	});

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
				<Button
					type="button"
					onClick={() => authStart.mutate()}
					disabled={authStart.isPending}
				>
					{authStart.isPending ? (
						<Trans>Connecting...</Trans>
					) : (
						<Trans>Connect Shopify</Trans>
					)}
				</Button>
			</CardContent>
		</Card>
	);
}
