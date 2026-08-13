import { useAuthStore } from "@ataqu/shared-stores";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth")({
	beforeLoad: () => {
		const token = useAuthStore.getState().token;
		if (!token) {
			throw redirect({ to: "/login" });
		}
	},
	component: AuthLayout,
});

function AuthLayout() {
	return <Outlet />;
}
