import { type AppCommand, useRegisterCommands } from "@ataqu/ui";
import { t } from "@lingui/core/macro";
import { useNavigate } from "@tanstack/react-router";
import { navigate as navigateTo } from "../../lib/navigation";

export interface SondAction {
	id: string;
	label: string;
	icon?: string;
	shortcut?: string;
	context?: string;
}

export const getSondActions = (): SondAction[] => [
	{
		id: "sond:create-form",
		label: t`Create Form`,
		icon: "plus",
		shortcut: "mod+n",
	},
	{ id: "sond:go-to-forms", label: t`Go to Forms`, icon: "layout-grid" },
	{ id: "sond:go-to-submissions", label: t`Go to Submissions`, icon: "inbox" },
	{
		id: "sond:search-forms",
		label: t`Search Forms`,
		icon: "search",
		shortcut: "mod+k",
	},
	{
		id: "sond:add-question",
		label: t`Add Question`,
		icon: "plus-circle",
		context: "builder",
	},
	{
		id: "sond:add-logic",
		label: t`Add Conditional Logic`,
		icon: "git-branch",
		context: "builder",
	},
	{
		id: "sond:publish-form",
		label: t`Publish Form`,
		icon: "upload",
		context: "builder",
	},
	{
		id: "sond:export-csv",
		label: t`Export Submissions CSV`,
		icon: "download",
		context: "submissions",
	},
	{
		id: "sond:connect-spark",
		label: t`Connect to SPARK`,
		icon: "zap",
		context: "submissions",
	},
	{
		id: "sond:connect-cinq",
		label: t`Connect to CINQ`,
		icon: "users",
		context: "submissions",
	},
];

// The global registry intentionally carries only commands the shell can
// execute from anywhere (brainstorm P2-2 context scope):
//  - navigation targets,
//  - the create-form funnel,
//  - the forms-list export shortcut (navigates to the forms list).
// Form-local actions (add question / conditional logic / publish / per-form
// integrations) are registered by the builder and submissions screens with
// the viewed form in context, where they can actually run.
const SOND_NAV: Record<string, string> = {
	"sond:go-to-forms": "/sond",
	"sond:go-to-submissions": "/sond",
	"sond:go-to-builder": "/sond/builder",
};

const GLOBAL_SOND_IDS = new Set([
	"sond:create-form",
	"sond:go-to-forms",
	"sond:go-to-submissions",
	"sond:export-csv",
]);

/** Adapts SOND actions to the unified command-palette contract. */
export function useSondCommands(): AppCommand[] {
	const navigate = useNavigate();
	// The submissions export is context-scoped: it exports the form being
	// viewed. When the palette is opened somewhere else there is no form in
	// view, so the command navigates to the forms list — where the user picks
	// a form and the per-form "exports" command becomes available.
	return getSondActions()
		.filter((a) => GLOBAL_SOND_IDS.has(a.id))
		.map((a) => {
			if (a.id === "sond:create-form") {
				return {
					id: a.id,
					title: typeof a.label === "string" ? a.label : String(a.label ?? a.id),
					onSelect: () => navigateTo("/sond/builder/new"),
				};
			}
			if (a.id === "sond:export-csv") {
				return {
					id: a.id,
					title: typeof a.label === "string" ? a.label : String(a.label ?? a.id),
					onSelect: () => navigateTo("/sond"),
				};
			}
			const to = SOND_NAV[a.id];
			return {
				id: a.id,
				title: typeof a.label === "string" ? a.label : String(a.label ?? a.id),
				onSelect: to ? () => navigate({ to }) : () => navigateTo("/sond"),
			};
		});
}

/** Registers SOND commands into the global palette for the app's lifetime. */
export const SondCommandRegistrar: React.FC = () => {
	const commands = useSondCommands();
	useRegisterCommands(commands);
	return null;
};
