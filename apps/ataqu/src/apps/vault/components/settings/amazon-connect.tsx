import { useAmazonStatus, useConnectAmazon } from "@ataqu/api-client";
import {
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Input,
} from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { useState } from "react";
import { showToast } from "../toast-store";

/** Connect an Amazon Seller Central account via SP-API LWA credentials. */
export function AmazonConnect() {
	const { data: status } = useAmazonStatus();
	const connect = useConnectAmazon({
		onSuccess: () => {
			showToast({
				variant: "success",
				title: <Trans>Amazon connected.</Trans>,
			});
		},
		onError: () => {
			showToast({
				variant: "error",
				title: <Trans>Amazon connection failed.</Trans>,
				description: <Trans>Check the credentials and try again.</Trans>,
			});
		},
	});

	const [marketplaceId, setMarketplaceId] = useState("ATVPDKIKX0DER");
	const [sellerId, setSellerId] = useState("");
	const [refreshToken, setRefreshToken] = useState("");

	if (status?.connected) return null;

	return (
		<Card className="bg-card border-border">
			<CardHeader>
				<CardTitle className="text-foreground">
					<Trans>Connect Amazon</Trans>
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<p className="text-sm text-muted-foreground">
					<Trans>
						Sync your Amazon Seller Central inventory with VAULT by SKU.
					</Trans>
				</p>
				<div className="space-y-2">
					<label className="text-xs text-muted-foreground">
						<Trans>Marketplace ID</Trans>
					</label>
					<Input
						value={marketplaceId}
						onChange={(e) => setMarketplaceId(e.target.value)}
						placeholder="ATVPDKIKX0DER"
					/>
				</div>
				<div className="space-y-2">
					<label className="text-xs text-muted-foreground">
						<Trans>Seller ID</Trans>
					</label>
					<Input
						value={sellerId}
						onChange={(e) => setSellerId(e.target.value)}
						placeholder="AXXXXXXXXXXXXX"
					/>
				</div>
				<div className="space-y-2">
					<label className="text-xs text-muted-foreground">
						<Trans>LWA Refresh Token</Trans>
					</label>
					<Input
						type="password"
						value={refreshToken}
						onChange={(e) => setRefreshToken(e.target.value)}
						placeholder="••••••••"
					/>
				</div>
				<Button
					type="button"
					onClick={() =>
						connect.mutate({
							marketplace_id: marketplaceId,
							seller_id: sellerId,
							refresh_token: refreshToken,
						})
					}
					disabled={connect.isPending || !sellerId || !refreshToken}
				>
					{connect.isPending ? (
						<Trans>Connecting…</Trans>
					) : (
						<Trans>Connect Amazon</Trans>
					)}
				</Button>
			</CardContent>
		</Card>
	);
}
