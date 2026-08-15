import {
	type Dashboard,
	useCreateDashboard,
	useListDashboards,
} from "@ataqu/api-client";
import { type AppCommand, useRegisterCommands } from "@ataqu/ui";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

interface VistaAction {
	id: string;
	label: string;
	keywords: string;
	action: () => void | Promise<void>;
}

export const useVistaActions = () => {
	const navigate = useNavigate();
	const { data: dashboards } = useListDashboards();
	const createDashboardMutation = useCreateDashboard();

	const actions: VistaAction[] = [
		{
			id: "create-dashboard",
			label: "Create Dashboard",
			keywords: "create new dashboard",
			action: async () => {
				try {
					const newDash = await createDashboardMutation.mutateAsync({
						name: `Dashboard ${Date.now()}`,
						config: { widgets: [] },
					});
					toast.success("Dashboard created.");
					navigate({ to: "/dashboard/$id", params: { id: newDash.id } });
				} catch {
					toast.error("Failed to create dashboard.");
				}
			},
		},
		{
			id: "go-to-explore",
			label: "Go to Explore",
			keywords: "explore sql query",
			action: () => navigate({ to: "/explore" }),
		},
	];

	const dashboardActions: VistaAction[] = (dashboards || []).map(
		(d: Dashboard) => ({
			id: `go-to-${d.id}`,
			label: `Go to Dashboard: ${d.name}`,
			keywords: `dashboard ${d.name}`,
			action: () => navigate({ to: "/dashboard/$id", params: { id: d.id } }),
		}),
	);

	return [...actions, ...dashboardActions];
};

/** Adapts VISTA actions to the unified command-palette contract. */
export function useVistaCommands(): AppCommand[] {
	const actions = useVistaActions();
	return actions.map((a) => ({
		id: a.id,
		title: a.label,
		keywords: a.keywords,
		onSelect: () => {
			void a.action();
		},
	}));
}

/** Registers VISTA commands into the global palette for the app's lifetime. */
export const VistaCommandRegistrar: React.FC = () => {
	const commands = useVistaCommands();
	useRegisterCommands(commands);
	return null;
};
