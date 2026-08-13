import { useAuthStore } from "@ataqu/shared-stores";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth")({
	beforeLoad: () => {
		const { token } = useAuthStore.getState();
		if (!token) {
			throw redirect({ to: "/login" });
		}
	},
	component: () => <Outlet />,
});
