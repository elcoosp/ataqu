import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	beforeLoad: () => {
		const token = localStorage.getItem("auth-storage")
			? JSON.parse(localStorage.getItem("auth-storage")!).state?.token
			: null;
		throw redirect({
			to: token ? "/dashboard" : "/login",
		});
	},
});
