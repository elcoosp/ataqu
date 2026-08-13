import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { ChannelList } from "@/components/channel-list";
import { ContextSidebar } from "@/components/context-sidebar";
import { MessageThread } from "@/components/message-thread";
import { useDialStore } from "@/stores/dial-store";

export const Route = createFileRoute("/_auth/")({
	component: IndexComponent,
});

function IndexComponent() {
	const { activeChannelId } = useDialStore();

	useEffect(() => {
		// The channel list will set active channel on click
	}, []);

	return (
		<div className="flex h-full">
			<div className="w-64 border-r border-border flex-shrink-0">
				<ChannelList />
			</div>
			<div className="flex-1 flex">
				<div className="flex-1 flex flex-col">
					{activeChannelId ? (
						<MessageThread channelId={activeChannelId} />
					) : (
						<div className="flex items-center justify-center h-full text-muted-foreground">
							Select a channel to start messaging
						</div>
					)}
				</div>
				<div className="w-72 flex-shrink-0">
					{activeChannelId && <ContextSidebar channelId={activeChannelId} />}
				</div>
			</div>
		</div>
	);
}
