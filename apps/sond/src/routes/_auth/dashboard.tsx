import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/_auth/dashboard")({
	component: DashboardRedirect,
});

function DashboardRedirect() {
	const navigate = useNavigate();
	useEffect(() => {
		navigate({ to: "/", replace: true });
	}, [navigate]);
	return null;
}
