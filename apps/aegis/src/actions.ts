// apps/aegis/src/actions.ts

import { type AppCommand, useRegisterCommands } from "@ataqu/ui";
import type { NavigateOptions } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useAuthStore } from "./stores/auth-store";

export function registerAegisActions(
	openInviteModal: () => void,
	openCreateApiKeyModal: () => void,
	openCreateRoleModal: () => void,
	navigate: (opts: NavigateOptions) => void,
) {
	return [
		{
			id: "aegis-invite-user",
			label: "Invite User",
			shortcut: ["i", "u"],
			action: openInviteModal,
		},
		{
			id: "aegis-go-users",
			label: "Go to Users",
			shortcut: ["g", "u"],
			action: () => navigate({ to: "/users" }),
		},
		{
			id: "aegis-go-roles",
			label: "Go to Roles",
			shortcut: ["g", "r"],
			action: () => navigate({ to: "/roles" }),
		},
		{
			id: "aegis-go-api-keys",
			label: "Go to API Keys",
			shortcut: ["g", "k"],
			action: () => navigate({ to: "/api-keys" }),
		},
		{
			id: "aegis-create-api-key",
			label: "Create API Key",
			shortcut: ["c", "k"],
			action: openCreateApiKeyModal,
		},
		{
			id: "aegis-create-role",
			label: "Create Role",
			shortcut: ["c", "r"],
			action: openCreateRoleModal,
		},
		{
			id: "aegis-go-settings",
			label: "Go to Settings",
			shortcut: ["g", "s"],
			action: () => navigate({ to: "/settings" }),
		},
		{
			id: "aegis-go-admin-access-matrix",
			label: "Access Matrix",
			shortcut: ["a", "m"],
			action: () => navigate({ to: "/admin/access-matrix" }),
		},
		{
			id: "aegis-go-admin-audit",
			label: "Audit Log",
			shortcut: ["a", "l"],
			action: () => navigate({ to: "/admin/audit" }),
		},
		{
			id: "aegis-logout",
			label: "Logout",
			shortcut: ["l", "o"],
			action: () => {
				useAuthStore.getState().logout();
				navigate({ to: "/login" });
			},
		},
	];
}

/** Adapts AEGIS actions to the unified command-palette contract. */
export function useAegisCommands(): AppCommand[] {
	const navigate = useNavigate();
	const actions = registerAegisActions(
		() => window.dispatchEvent(new CustomEvent("aegis:open-invite")),
		() => window.dispatchEvent(new CustomEvent("aegis:open-api-key")),
		() => window.dispatchEvent(new CustomEvent("aegis:open-role")),
		(o) => navigate(o),
	);
	return actions.map((a) => ({
		id: a.id,
		title: a.label,
		shortcut: Array.isArray(a.shortcut) ? a.shortcut.join(" ") : a.shortcut,
		onSelect: a.action,
	}));
}

/** Registers AEGIS commands into the global palette for the app's lifetime. */
export const AegisCommandRegistrar: React.FC = () => {
	const commands = useAegisCommands();
	useRegisterCommands(commands);
	return null;
};
