import { Trans } from "@lingui/react/macro";

export function SseIndicator({
	isConnected,
}: {
	isConnected: boolean;
	viewers?: { id: string; name: string }[];
	typists?: string[];
}) {
	return (
		<div
			role="status"
			className="text-sm text-muted-foreground"
			data-tour="sse-indicator"
		>
			{isConnected ? (
				<Trans>Auto-refresh every 30 seconds</Trans>
			) : (
				<Trans>Waiting for data — retrying every 30 seconds</Trans>
			)}
		</div>
	);
}
