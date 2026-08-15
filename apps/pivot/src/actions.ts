import { type AppCommand, useRegisterCommands } from "@ataqu/ui";
import { useNavigate } from "@tanstack/react-router";

const dispatch = (type: string) => () =>
	window.dispatchEvent(new CustomEvent(type));

/** Builds PIVOT's command-palette entries against the live router. */
export function usePivotCommands(): AppCommand[] {
	const navigate = useNavigate();

	return [
		{
			id: "pivot-go-documents",
			title: "Go to Documents",
			shortcut: "g d",
			keywords: "docs files list",
			onSelect: () => navigate({ to: "/" }),
		},
		{
			id: "pivot-go-databases",
			title: "Go to Databases",
			shortcut: "g b",
			keywords: "db data tables",
			onSelect: () => navigate({ to: "/db" }),
		},
		{
			id: "pivot-go-templates",
			title: "Go to Templates",
			shortcut: "g t",
			keywords: "template reuse structure",
			onSelect: () => navigate({ to: "/templates" }),
		},
		{
			id: "pivot-create-doc",
			title: "Create Document",
			shortcut: "c d",
			keywords: "new doc file add",
			onSelect: dispatch("pivot:create-doc"),
		},
		{
			id: "pivot-create-db",
			title: "Create Database",
			shortcut: "c b",
			keywords: "new db add",
			onSelect: dispatch("pivot:create-db"),
		},
		{
			id: "pivot-focus-search",
			title: "Search Documents",
			shortcut: "/",
			keywords: "find filter query",
			onSelect: dispatch("pivot:focus-search"),
		},
	];
}

/** Registers PIVOT commands into the global palette for the app's lifetime. */
export const PivotCommandRegistrar: React.FC = () => {
	const commands = usePivotCommands();
	useRegisterCommands(commands);
	return null;
};
