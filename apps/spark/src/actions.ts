import type { UUID } from "@ataqu/types";
import { type AppCommand, useRegisterCommands } from "@ataqu/ui";
import { useNavigate } from "@tanstack/react-router";

export interface SparkCommandAction {
	id: string;
	label: string;
	shortcut?: string;
	when?: "always" | "workflow-view" | "workflow-edit";
	perform: () => void;
}

export function getSparkActions(opts: {
	currentWorkflowId?: UUID;
	isEditing?: boolean;
	navigate: (path: string) => void;
	onTestRun?: () => void;
	onEnable?: () => void;
	onDisable?: () => void;
	onDuplicate?: () => void;
	onAddTrigger?: () => void;
	onAddAction?: () => void;
	onAddCondition?: () => void;
}): SparkCommandAction[] {
	const {
		currentWorkflowId,
		isEditing,
		navigate,
		onTestRun,
		onEnable,
		onDisable,
		onDuplicate,
		onAddTrigger,
		onAddAction,
		onAddCondition,
	} = opts;

	const actions: SparkCommandAction[] = [
		{
			id: "spark-create",
			label: "Create Workflow",
			shortcut: "N",
			when: "always",
			perform: () => navigate("/workflows/new"),
		},
		{
			id: "spark-list",
			label: "Go to Workflows",
			when: "always",
			perform: () => navigate("/"),
		},
		{
			id: "spark-runs",
			label: "Go to Runs",
			when: "always",
			perform: () => navigate("/runs"),
		},
		{
			id: "spark-search",
			label: "Search Workflows",
			shortcut: "/",
			when: "always",
			perform: () => {},
		},
		{
			id: "spark-dlq",
			label: "View DLQ",
			when: "always",
			perform: () => navigate("/dlq"),
		},
	];

	if (currentWorkflowId) {
		actions.push(
			{
				id: "spark-run",
				label: "Run Workflow",
				when: "workflow-view",
				perform: () => onTestRun?.(),
			},
			{
				id: "spark-duplicate",
				label: "Duplicate Workflow",
				when: "workflow-view",
				perform: () => onDuplicate?.(),
			},
			{
				id: "spark-enable",
				label: "Enable Workflow",
				when: "workflow-view",
				perform: () => onEnable?.(),
			},
			{
				id: "spark-disable",
				label: "Disable Workflow",
				when: "workflow-view",
				perform: () => onDisable?.(),
			},
		);
	}

	if (isEditing) {
		actions.push(
			{
				id: "spark-add-trigger",
				label: "Add Trigger",
				when: "workflow-edit",
				perform: () => onAddTrigger?.(),
			},
			{
				id: "spark-add-action",
				label: "Add Action",
				when: "workflow-edit",
				perform: () => onAddAction?.(),
			},
			{
				id: "spark-add-condition",
				label: "Add Condition",
				when: "workflow-edit",
				perform: () => onAddCondition?.(),
			},
			{
				id: "spark-test",
				label: "Test Run",
				shortcut: "T",
				when: "workflow-edit",
				perform: () => onTestRun?.(),
			},
		);
	}

	return actions;
}

/** Adapts SPARK actions to the unified command-palette contract. */
export function useSparkCommands(): AppCommand[] {
	const routerNavigate = useNavigate();
	const nav = (path: string) => {
		const to =
			path === "/"
				? "/_auth/"
				: path.startsWith("/")
					? `/_auth${path}`
					: "/_auth/";
		routerNavigate({ to });
	};
	const actions = getSparkActions({ navigate: nav });
	return actions
		.filter((a) => a.when === "always" || a.when === undefined)
		.map((a) => ({
			id: a.id,
			title: a.label,
			shortcut: a.shortcut,
			onSelect: a.perform,
		}));
}

/** Registers SPARK commands into the global palette for the app's lifetime. */
export const SparkCommandRegistrar: React.FC = () => {
	const commands = useSparkCommands();
	useRegisterCommands(commands);
	return null;
};
