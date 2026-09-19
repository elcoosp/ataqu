import { Button } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { toast } from "sonner";
import { useShopifySync } from "../../../apps/vault/hooks/use-shopify-sync";

export function ShopifySyncButton() {
	const syncMutation = useShopifySync({
		onSuccess: () => {
			toast.success(<Trans>Shopify sync started.</Trans>);
		},
		onError: () => {
			toast.error(<Trans>Shopify sync failed.</Trans>, {
				description: (
					<Trans>The sync request was not accepted. Please try again.</Trans>
				),
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
			{syncMutation.isPending ? (
				<Trans>Syncing...</Trans>
			) : (
				<Trans>Sync Shopify</Trans>
			)}
		</Button>
	);
}
