import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ActivationTask {
	id: string;
	label: string;
	/** Deep link the user can open to complete the task */
	href?: string;
}

export const ACTIVATION_TASKS: ActivationTask[] = [
	{ id: "import-contacts", label: "Import 10 contacts", href: "/contacts" },
	{ id: "connect-cinq-dial", label: "Connect CINQ to DIAL", href: "/channels" },
	{
		id: "create-workflow",
		label: "Create your first SPARK workflow",
		href: "/workflows",
	},
	{ id: "invite-team", label: "Invite 2 team members", href: "/users" },
	{
		id: "create-dashboard",
		label: "Create a VISTA dashboard",
		href: "/dashboards",
	},
];

interface ActivationState {
	completed: Record<string, boolean>;
	complete: (id: string) => void;
	reset: (id: string) => void;
	isComplete: (id: string) => boolean;
	completedCount: () => number;
	total: number;
	progress: () => number;
}

export const useActivationStore = create<ActivationState>()(
	persist(
		(set, get) => ({
			completed: {},
			complete: (id) =>
				set((s) => ({ completed: { ...s.completed, [id]: true } })),
			reset: (id) =>
				set((s) => {
					const next = { ...s.completed };
					delete next[id];
					return { completed: next };
				}),
			isComplete: (id) => !!get().completed[id],
			completedCount: () =>
				ACTIVATION_TASKS.filter((t) => get().completed[t.id]).length,
			total: ACTIVATION_TASKS.length,
			progress: () =>
				Math.round(
					(ACTIVATION_TASKS.filter((t) => get().completed[t.id]).length /
						ACTIVATION_TASKS.length) *
						100,
				),
		}),
		{ name: "activation-storage" },
	),
);
