export interface CommandAction {
	id: string;
	label: string;
	shortcut?: string;
	run: () => void;
}

import { type AppCommand, useRegisterCommands } from "@ataqu/ui";

export const usePauseCommandActions = (callbacks?: {
	onAddEmployee?: () => void;
	onSearchEmployees?: () => void;
	onRequestLeave?: () => void;
	onApproveLeave?: () => void;
	onRejectLeave?: () => void;
	onUploadDocument?: () => void;
}) => {
	const actions: CommandAction[] = [
		{
			id: "add-employee",
			label: "Add Employee",
			run: () =>
				callbacks?.onAddEmployee?.() ?? window.location.assign("/directory"),
		},
		{
			id: "go-directory",
			label: "Go to Directory",
			run: () => window.location.assign("/directory"),
		},
		{
			id: "go-leave",
			label: "Go to Leave",
			run: () => window.location.assign("/leave"),
		},
		{
			id: "go-onboarding",
			label: "Go to Onboarding",
			run: () => window.location.assign("/onboarding"),
		},
		{
			id: "go-reports",
			label: "Go to Reports",
			run: () => window.location.assign("/reports"),
		},
		{
			id: "search-employees",
			label: "Search Employees",
			run: () =>
				callbacks?.onSearchEmployees?.() ??
				window.location.assign("/directory"),
		},
		{
			id: "request-leave",
			label: "Request Leave",
			run: () =>
				callbacks?.onRequestLeave?.() ?? window.location.assign("/leave"),
		},
		{
			id: "approve-leave",
			label: "Approve Leave",
			run: () =>
				callbacks?.onApproveLeave?.() ?? window.location.assign("/leave"),
		},
		{
			id: "reject-leave",
			label: "Reject Leave",
			run: () =>
				callbacks?.onRejectLeave?.() ?? window.location.assign("/leave"),
		},
		{
			id: "upload-document",
			label: "Upload Document",
			run: () =>
				callbacks?.onUploadDocument?.() ?? window.location.assign("/directory"),
		},
	];

	return actions;
};

/** Adapts PAUSE actions to the unified command-palette contract. */
export function usePauseCommands(): AppCommand[] {
	const actions = usePauseCommandActions();
	return actions.map((a) => ({
		id: a.id,
		title: a.label,
		shortcut: a.shortcut,
		onSelect: a.run,
	}));
}

/** Registers PAUSE commands into the global palette for the app's lifetime. */
export const PauseCommandRegistrar: React.FC = () => {
	const commands = usePauseCommands();
	useRegisterCommands(commands);
	return null;
};
