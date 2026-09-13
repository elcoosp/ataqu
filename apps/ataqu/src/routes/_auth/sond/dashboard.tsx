import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/_auth/sond/dashboard")({
	component: DashboardRedirect,
});

function DashboardRedirect() {
	const navigate = useNavigate();
	useEffect(() => {
		navigate({ to: "/sond", replace: true });
	}, [navigate]);
	return null;
}
