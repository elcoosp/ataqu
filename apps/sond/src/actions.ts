import { t } from '@lingui/core/macro';

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
