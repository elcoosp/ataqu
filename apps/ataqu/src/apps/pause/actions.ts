export interface CommandAction {
	id: string;
	label: string;
	shortcut?: string;
	run: () => void;
}

import { type AppCommand, useRegisterCommands } from "@ataqu/ui";
import { navigate } from "../../lib/navigation";

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
			run: () => callbacks?.onAddEmployee?.() ?? navigate("/pause/directory"),
		},
		{
			id: "go-directory",
			label: "Go to Directory",
			run: () => navigate("/pause/directory"),
		},
		{
			id: "go-leave",
			label: "Go to Leave",
			run: () => navigate("/pause/leave"),
		},
		{
			id: "go-onboarding",
			label: "Go to Onboarding",
			run: () => navigate("/pause/onboarding"),
		},
		{
			id: "go-reports",
			label: "Go to Reports",
			run: () => navigate("/pause/reports"),
		},
		{
			id: "search-employees",
			label: "Search Employees",
			run: () =>
				callbacks?.onSearchEmployees?.() ?? navigate("/pause/directory"),
		},
		{
			id: "request-leave",
			label: "Request Leave",
			run: () => callbacks?.onRequestLeave?.() ?? navigate("/pause/leave"),
		},
		{
			id: "approve-leave",
			label: "Approve Leave",
			run: () => callbacks?.onApproveLeave?.() ?? navigate("/pause/leave"),
		},
		{
			id: "reject-leave",
			label: "Reject Leave",
			run: () => callbacks?.onRejectLeave?.() ?? navigate("/pause/leave"),
		},
		{
			id: "upload-document",
			label: "Upload Document",
			run: () =>
				callbacks?.onUploadDocument?.() ?? navigate("/pause/directory"),
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
