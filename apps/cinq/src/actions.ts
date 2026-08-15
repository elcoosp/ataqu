// apps/cinq/src/actions.ts

import { type AppCommand, useRegisterCommands } from "@ataqu/ui";
import { useNavigate } from "@tanstack/react-router";

/** Builds the CINQ command set for the global command palette. */
export function useCinqCommands(): AppCommand[] {
	const navigate = useNavigate();

	const dispatch = (name: string) => () =>
		window.dispatchEvent(new CustomEvent(name));

	return [
		{
			id: "cinq-go-contacts",
			title: "Go to Contacts",
			onSelect: () => navigate({ to: "/contacts" }),
		},
		{
			id: "cinq-go-deals",
			title: "Go to Deals",
			onSelect: () => navigate({ to: "/deals" }),
		},
		{
			id: "cinq-go-tasks",
			title: "Go to Tasks",
			onSelect: () => navigate({ to: "/tasks" }),
		},
		{
			id: "cinq-go-import",
			title: "Go to Import",
			onSelect: () => navigate({ to: "/import" }),
		},
		{
			id: "cinq-create-contact",
			title: "Create Contact",
			onSelect: dispatch("cinq:create-contact"),
		},
		{
			id: "cinq-create-deal",
			title: "Create Deal",
			onSelect: dispatch("cinq:create-deal"),
		},
		{
			id: "cinq-export-contacts",
			title: "Export Contacts CSV",
			onSelect: dispatch("cinq:export-contacts"),
		},
		{
			id: "cinq-search-contacts",
			title: "Search Contacts",
			onSelect: dispatch("cinq:focus-search"),
		},
	];
}

/** Registers CINQ commands into the global palette for the app's lifetime. */
export const CinqCommandRegistrar: React.FC = () => {
	const commands = useCinqCommands();
	useRegisterCommands(commands);
	return null;
};
