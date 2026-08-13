import { RegisterForm } from "@ataqu/ui";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/register")({
	component: RegisterForm,
});
