import { useAuthStore } from "@ataqu/shared-stores";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/_auth")({
	component: AuthLayout,
});

function AuthLayout() {
	const navigate = useNavigate();
	const token = useAuthStore((s) => s.token);

	useEffect(() => {
		if (!token) {
			navigate({ to: "/login" });
		}
	}, [token, navigate]);

	if (!token) return null;

	return <Outlet />;
}
