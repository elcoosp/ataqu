import { type ChannelSummary, useListChannels } from "@ataqu/api-client";
import { requestIntent } from "@ataqu/shared-stores";
import { type AppCommand, useRegisterCommands } from "@ataqu/ui";
import { useNavigate } from "@tanstack/react-router";
import {
	type PresenceStatus,
	useDialStore,
} from "../../apps/dial/stores/dial-store";

export interface CommandAction {
	id: string;
	title: string;
	onSelect: () => void;
	icon?: React.ReactNode;
}

export function useDialActions() {
	const navigate = useNavigate();
	const { toggleFocusMode } = useDialStore();
	const setStatus = useDialStore((s) => s.setStatus);
	const { data: channels } = useListChannels();

	const setPresenceStatus = (status: PresenceStatus) => () => {
		// Presence is local state until the WS protocol grows a presence frame
		// (`dial_ws.rs` accepts subscribe/unsubscribe/message/typing only), so
		// the command mutates the persisted dial store instead of dispatching a
		// CustomEvent nobody listened for (brainstorm P2-2).
		setStatus(status);
	};

	const actions: CommandAction[] = [
		{
			id: "create-channel",
			title: "Create Channel",
			onSelect: () => requestIntent("dial", "channel.create", { public: true }),
		},
		{
			id: "create-private-channel",
			title: "Create Private Channel",
			onSelect: () =>
				requestIntent("dial", "channel.create", { public: false }),
		},
		{
			id: "go-to-threads",
			title: "Go to Threads",
			onSelect: () => navigate({ to: "/dial/dashboard" }),
		},
		{
			id: "go-to-tickets",
			title: "Go to Tickets",
			onSelect: () => navigate({ to: "/dial/tickets" }),
		},
		{
			id: "go-to-files",
			title: "Go to Files",
			onSelect: () => navigate({ to: "/dial/dashboard" }),
		},
		{
			id: "toggle-focus-mode",
			title: "Toggle Focus Mode",
			onSelect: toggleFocusMode,
		},
		{
			id: "set-status-online",
			title: "Set Status: Online",
			onSelect: setPresenceStatus("online"),
		},
		{
			id: "set-status-away",
			title: "Set Status: Away",
			onSelect: setPresenceStatus("away"),
		},
		{
			id: "set-status-offline",
			title: "Set Status: Offline",
			onSelect: setPresenceStatus("offline"),
		},
		{
			id: "connect-to-cinq",
			title: "Connect to CINQ",
			onSelect: () => navigate({ to: "/dial/dashboard" }),
		},
	];

	const channelActions: CommandAction[] = (channels?.items ?? []).map(
		(channel: ChannelSummary) => ({
			id: `go-to-channel-${channel.id}`,
			title: `Go to ${channel.name}`,
			onSelect: () =>
				navigate({ to: "/dial/channels/$id", params: { id: channel.id } }),
		}),
	);

	return [...channelActions, ...actions];
}

/** Adapts DIAL actions to the unified command-palette contract. */
export function useDialCommands(): AppCommand[] {
	const actions = useDialActions();
	return actions.map((a) => ({
		id: a.id,
		title: a.title,
		onSelect: a.onSelect,
		icon: a.icon,
		scope: "dial",
		// Cross-app Create group (F3): both dial creates are contextual to the
		// dialogs the channel list owns.
		createName:
			a.id === "create-channel"
				? "Channel"
				: a.id === "create-private-channel"
					? "Private Channel"
					: undefined,
	}));
}

/** Registers DIAL commands into the global palette for the app's lifetime. */
export const DialCommandRegistrar: React.FC = () => {
	const commands = useDialCommands();
	useRegisterCommands(commands);
	return null;
};
