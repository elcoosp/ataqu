import { requestIntent } from "@ataqu/shared-stores";
import { type AppCommand, useRegisterCommands } from "@ataqu/ui";
import { useNavigate } from "@tanstack/react-router";

/** Builds PIVOT's command-palette entries against the live router. */
export function usePivotCommands(): AppCommand[] {
	const navigate = useNavigate();

	// The literal is closed with `].map(...)` below to stamp the PIVOT scope.
	return [
		{
			id: "pivot-go-documents",
			title: "Go to Documents",
			shortcut: "g d",
			keywords: "docs files list",
			onSelect: () => navigate({ to: "/pivot" }),
		},
		{
			id: "pivot-go-databases",
			title: "Go to Databases",
			shortcut: "g b",
			keywords: "db data tables",
			onSelect: () => navigate({ to: "/pivot/db" }),
		},
		{
			id: "pivot-go-templates",
			title: "Go to Templates",
			shortcut: "g t",
			keywords: "template reuse structure",
			onSelect: () => navigate({ to: "/pivot/templates" }),
		},
		{
			id: "pivot-create-doc",
			title: "Create Document",
			keywords: "new doc file add",
			createName: "Document",
			onSelect: () => requestIntent("pivot", "doc.create"),
		},
		{
			id: "pivot-create-db",
			title: "Create Database",
			keywords: "new db add",
			createName: "Database",
			onSelect: () => requestIntent("pivot", "db.create"),
		},
		{
			id: "pivot-focus-search",
			title: "Search Documents",
			keywords: "find filter query",
			onSelect: () => navigate({ to: "/pivot" }),
		},
		// Scope every entry to PIVOT for the palette's context group (P2-1).
	].map((c) => ({ ...c, scope: "pivot" }));
}

/** Registers PIVOT commands into the global palette for the app's lifetime. */
export const PivotCommandRegistrar: React.FC = () => {
	const commands = usePivotCommands();
	useRegisterCommands(commands);
	return null;
};
