export interface ActivationTask {
	id: string;
	label: string;
	/** Deep link the user can open to complete the task */
	href?: string;
}

/**
 * Static navigation hints for the activation checklist. The authoritative
 * completion state lives in the backend (`OnboardingStatus.tasks`), surfaced via
 * `useOnboardingStatus()`; these entries provide labels and deep links.
 */
export const ACTIVATION_TASKS: ActivationTask[] = [
	{ id: "import-contacts", label: "Import 10 contacts", href: "/cinq/contacts" },
	{ id: "connect-cinq-dial", label: "Connect CINQ to DIAL", href: "/dial" },
	{
		id: "create-workflow",
		label: "Create your first SPARK workflow",
		href: "/spark/workflows",
	},
	{ id: "invite-team", label: "Invite 2 team members", href: "/users" },
	{
		id: "create-dashboard",
		label: "Create a VISTA dashboard",
		href: "/vista",
	},
];

export const activationTaskHref = (id: string): string | undefined =>
	ACTIVATION_TASKS.find((t) => t.id === id)?.href;
