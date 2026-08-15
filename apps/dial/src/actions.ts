import { type ChannelSummary, useListChannels } from "@ataqu/api-client";
import { type AppCommand, useRegisterCommands } from "@ataqu/ui";
import { useNavigate } from "@tanstack/react-router";
import { useDialStore } from "@/stores/dial-store";

export interface CommandAction {
	id: string;
	title: string;
	onSelect: () => void;
	icon?: React.ReactNode;
}

export function useDialActions() {
	const navigate = useNavigate();
	const { toggleFocusMode } = useDialStore();
	const { data: channels } = useListChannels();

	const actions: CommandAction[] = [
		{
			id: "create-channel",
			title: "Create Channel",
			onSelect: () => {
				window.dispatchEvent(new CustomEvent("openCreateChannelDialog"));
			},
		},
		{
			id: "create-private-channel",
			title: "Create Private Channel",
			onSelect: () => {
				window.dispatchEvent(new CustomEvent("openCreatePrivateChannelDialog"));
			},
		},
		{
			id: "go-to-threads",
			title: "Go to Threads",
			onSelect: () => navigate({ to: "/dashboard" }),
		},
		{
			id: "go-to-tickets",
			title: "Go to Tickets",
			onSelect: () => navigate({ to: "/tickets" }),
		},
		{
			id: "go-to-files",
			title: "Go to Files",
			onSelect: () => navigate({ to: "/dashboard" }),
		},
		{
			id: "search-messages",
			title: "Search Messages",
			onSelect: () => {
				// Focus search input
			},
		},
		{
			id: "toggle-focus-mode",
			title: "Toggle Focus Mode",
			onSelect: toggleFocusMode,
		},
		{
			id: "mark-all-read",
			title: "Mark All Read",
			onSelect: () => {
				// Call API to mark all read, optimistic update
				console.log("Mark all read");
			},
		},
		{
			id: "set-status-online",
			title: "Set Status: Online",
			onSelect: () => {
				// Update presence via WebSocket – we'll dispatch an event and let the WebSocket hook handle it
				window.dispatchEvent(
					new CustomEvent("setPresence", { detail: { status: "online" } }),
				);
			},
		},
		{
			id: "set-status-away",
			title: "Set Status: Away",
			onSelect: () => {
				window.dispatchEvent(
					new CustomEvent("setPresence", { detail: { status: "away" } }),
				);
			},
		},
		{
			id: "set-status-offline",
			title: "Set Status: Offline",
			onSelect: () => {
				window.dispatchEvent(
					new CustomEvent("setPresence", { detail: { status: "offline" } }),
				);
			},
		},
		{
			id: "connect-to-cinq",
			title: "Connect to CINQ",
			onSelect: () => {
				navigate({ to: "/dashboard" });
			},
		},
	];

	const channelActions: CommandAction[] = (channels ?? []).map(
		(channel: ChannelSummary) => ({
			id: `go-to-channel-${channel.id}`,
			title: `Go to ${channel.name}`,
			onSelect: () =>
				navigate({ to: "/channels/$id", params: { id: channel.id } }),
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
	}));
}

/** Registers DIAL commands into the global palette for the app's lifetime. */
export const DialCommandRegistrar: React.FC = () => {
	const commands = useDialCommands();
	useRegisterCommands(commands);
	return null;
};
