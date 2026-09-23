// apps/cinq/src/actions.ts

import { requestIntent } from "@ataqu/shared-stores";
import { type AppCommand, useRegisterCommands } from "@ataqu/ui";
import { useNavigate } from "@tanstack/react-router";
import { navigate as navigateTo } from "../../lib/navigation";

/**
 * CINQ commands (brainstorm P2-2).
 *
 * Create commands navigate to the URL-driven dialog flag (`?createOpen=1`), so
 * they work from any app; export/search target the contacts surface and are
 * delivered to the component that owns it through the typed intent bus — the
 * previous `CustomEvent`s had no listener at all.
 */
export function useCinqCommands(): AppCommand[] {
	const navigate = useNavigate();

	// The literal is closed with `].map(...)` below to stamp the CINQ scope.
	return [
		{
			id: "cinq-go-contacts",
			title: "Go to Contacts",
			onSelect: () => navigate({ to: "/cinq/contacts" }),
		},
		{
			id: "cinq-go-deals",
			title: "Go to Deals",
			onSelect: () =>
				navigate({
					to: "/cinq/deals",
					search: { createOpen: false, stageOpen: false },
				}),
		},
		{
			id: "cinq-go-tasks",
			title: "Go to Tasks",
			onSelect: () =>
				navigate({ to: "/cinq/tasks", search: { createOpen: false } }),
		},
		{
			id: "cinq-go-import",
			title: "Go to Import",
			onSelect: () => navigate({ to: "/cinq/import" }),
		},
		{
			id: "cinq-create-contact",
			title: "Create Contact",
			createName: "Contact",
			onSelect: () => navigateTo("/cinq/contacts?createOpen=1"),
		},
		{
			id: "cinq-create-deal",
			title: "Create Deal",
			createName: "Deal",
			onSelect: () => navigateTo("/cinq/deals?createOpen=1"),
		},
		{
			id: "cinq-export-contacts",
			title: "Export Contacts CSV",
			onSelect: () => requestIntent("cinq", "contacts.export"),
		},
		{
			id: "cinq-search-contacts",
			title: "Search Contacts",
			onSelect: () => requestIntent("cinq", "search.focus"),
		},
		// Scope every entry to CINQ so the palette can lead with the
		// context group when the user is inside the app (P2-1).
	].map((c) => ({ ...c, scope: "cinq" }));
}

/** Registers CINQ commands into the global palette for the app's lifetime. */
export const CinqCommandRegistrar: React.FC = () => {
	const commands = useCinqCommands();
	useRegisterCommands(commands);
	return null;
};
