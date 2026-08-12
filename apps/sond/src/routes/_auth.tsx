import { useAuthStore } from "@ataqu/shared-stores";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/_auth")({
	beforeLoad: () => {
		const raw = localStorage.getItem("auth-storage");
		if (!raw) return { token: null };
		try {
			const parsed = JSON.parse(raw) as { state?: { token?: string } };
			return { token: parsed.state?.token ?? null };
		} catch {
			return { token: null };
		}
	},
	component: AuthLayout,
});

function AuthLayout() {
	const navigate = useNavigate();
	const { token } = useAuthStore();

	useEffect(() => {
		if (!token) {
			navigate({ to: "/login" });
		}
	}, [token, navigate]);

	if (!token) return null;

	return <Outlet />;
}
