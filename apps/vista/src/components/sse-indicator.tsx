import {
	LiveActivity,
	PresenceAvatars,
	TypingIndicator,
} from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import type React from "react";

interface SseIndicatorProps {
	isConnected: boolean;
	viewers?: { id: string; name: string }[];
	typists?: string[];
}

export const SseIndicator: React.FC<SseIndicatorProps> = ({
	isConnected,
	viewers = [],
	typists = [],
}) => {
	return (
		<div
			className="flex items-center gap-3"
			data-tour="sse-indicator"
		>
			<LiveActivity
				activity={
					isConnected
						? {
								id: "conn",
								title: "Live dashboard",
								detail: "Connected to realtime stream",
								phase: "running",
							}
						: {
								id: "disc",
								title: "Disconnected",
								detail: "Reconnecting to stream…",
								phase: "running",
							}
				}
			/>
			{viewers.length > 0 && (
				<PresenceAvatars people={viewers} max={4} />
			)}
			{typists.length > 0 && <TypingIndicator typists={typists} />}
			{!isConnected && <Trans>Disconnected</Trans>}
		</div>
	);
};
