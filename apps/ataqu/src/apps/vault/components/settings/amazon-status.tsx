import {
	useAmazonStatus,
	useDisconnectAmazon,
	useSyncAmazon,
} from "@ataqu/api-client";
import {
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { useState } from "react";
import { showToast } from "../toast-store";

/** Amazon Seller Central connection status, manual sync and disconnect. */
export function AmazonStatus() {
	const { data: status, refetch } = useAmazonStatus();
	const sync = useSyncAmazon({
		onSuccess: () => {
			showToast({
				variant: "success",
				title: <Trans>Amazon sync started.</Trans>,
			});
		},
		onError: () => {
			showToast({
				variant: "error",
				title: <Trans>Amazon sync failed.</Trans>,
				description: <Trans>The sync request was not accepted.</Trans>,
			});
		},
	});
	const disconnect = useDisconnectAmazon({
		onSuccess: () => {
			showToast({
				variant: "success",
				title: <Trans>Amazon disconnected.</Trans>,
			});
			refetch();
		},
		onError: () => {
			showToast({
				variant: "error",
				title: <Trans>Amazon disconnect failed.</Trans>,
			});
		},
	});

	const [confirmDisconnect, setConfirmDisconnect] = useState(false);

	if (!status?.connected) return null;

	return (
		<Card className="bg-card border-border">
			<CardHeader>
				<CardTitle className="text-foreground flex items-center gap-2">
					<Trans>Amazon Seller Central</Trans>
					<Badge variant="outline" className="text-emerald-400">
						<Trans>Connected</Trans>
					</Badge>
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<dl className="text-sm text-muted-foreground">
					<div className="flex justify-between">
						<dt>
							<Trans>Marketplace</Trans>
						</dt>
						<dd className="text-foreground">{status.marketplace_id}</dd>
					</div>
					<div className="flex justify-between">
						<dt>
							<Trans>Seller</Trans>
						</dt>
						<dd className="text-foreground">{status.seller_id}</dd>
					</div>
					<div className="flex justify-between">
						<dt>
							<Trans>Last synced</Trans>
						</dt>
						<dd className="text-foreground">
							{status.last_synced_at
								? new Date(status.last_synced_at).toLocaleString()
								: "—"}
						</dd>
					</div>
				</dl>
				<div className="flex gap-2">
					<Button
						type="button"
						onClick={() => sync.mutate()}
						disabled={sync.isPending}
					>
						{sync.isPending ? <Trans>Syncing…</Trans> : <Trans>Sync now</Trans>}
					</Button>
					{confirmDisconnect ? (
						<Button
							type="button"
							variant="destructive"
							onClick={() => disconnect.mutate()}
							disabled={disconnect.isPending}
						>
							<Trans>Confirm disconnect</Trans>
						</Button>
					) : (
						<Button
							type="button"
							variant="outline"
							onClick={() => setConfirmDisconnect(true)}
						>
							<Trans>Disconnect</Trans>
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
