import { requestIntent } from "@ataqu/shared-stores";
import { type AppCommand, useRegisterCommands } from "@ataqu/ui";
import { navigate } from "../../lib/navigation";

export interface TempoAction {
	id: string;
	label: string;
	shortcut?: string;
	action: () => void;
}

/**
 * TEMPO actions (brainstorm P2-2 — "make every command real").
 *
 * Previously half of this list was `action: () => {}` (silent no-op) and the
 * rest dispatched `CustomEvent`s nobody listened for. Every entry below now
 * either navigates to a route that exists or raises an intent the owning
 * screen consumes.
 */
export const tempoActions: TempoAction[] = [
	{
		id: "create-event-type",
		label: "Create Event Type",
		action: () => requestIntent("tempo", "event-type.create"),
	},
	{
		id: "go-event-types",
		label: "Go to Event Types",
		action: () => navigate("/tempo/dashboard"),
	},
	{
		id: "go-availability",
		label: "Manage Availability",
		action: () => navigate("/tempo/availability"),
	},
	{
		id: "go-meetings",
		label: "Go to Meetings",
		action: () => navigate("/tempo/dashboard"),
	},
	{
		id: "go-calendar-settings",
		label: "Go to Calendar Settings",
		action: () => navigate("/tempo/calendar-settings"),
	},
	{
		id: "connect-google",
		label: "Connect Google Calendar",
		action: () => {
			// OAuth consent must be a full document navigation: the provider
			// redirects back to the API and the session cookie is set there.
			window.location.href = "/api/v1/tempo/oauth/google";
		},
	},
	{
		id: "connect-outlook",
		label: "Connect Outlook Calendar",
		action: () => {
			window.location.href = "/api/v1/tempo/oauth/outlook";
		},
	},
];

/** Adapts TEMPO actions to the unified command-palette contract. */
export function useTempoCommands(): AppCommand[] {
	return tempoActions.map((a) => ({
		id: a.id,
		title: a.label,
		shortcut: a.shortcut,
		onSelect: a.action,
		scope: "tempo",
		createName: a.id === "create-event-type" ? "Event Type" : undefined,
	}));
}

/** Registers TEMPO commands into the global palette for the app's lifetime. */
export const TempoCommandRegistrar: React.FC = () => {
	const commands = useTempoCommands();
	useRegisterCommands(commands);
	return null;
};
