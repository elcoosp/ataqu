import type { TenantId, User } from "@ataqu/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
	token: string | null;
	refreshToken: string | null;
	user: User | null;
	tenantId: TenantId | null;
	isAuthenticated: boolean;
	login: ((token: string, user: User) => void) &
		((token: string, refreshToken: string, user: User) => void);
	logout: () => void;
	refresh: () => Promise<boolean>;
	setUser: (user: User) => void;
}
export const useAuthStore = create<AuthState>()(
	persist(
		(set, get) => ({
			token: null,
			refreshToken: null,
			user: null,
			tenantId: null,
			isAuthenticated: false,
			login: (
				token: string,
				refreshOrUser: string | User,
				maybeUser?: User,
			) => {
				const refreshToken =
					typeof refreshOrUser === "string" ? refreshOrUser : null;
				const user = (
					typeof refreshOrUser === "string" ? maybeUser : refreshOrUser
				) as User;
				set({
					token,
					refreshToken,
					user,
					tenantId: (user?.tenantId ?? null) as TenantId | null,
					isAuthenticated: true,
				});
			},
			logout: () =>
				set({
					token: null,
					refreshToken: null,
					user: null,
					tenantId: null,
					isAuthenticated: false,
				}),
			refresh: async () => {
				const { refreshToken } = get();
				if (!refreshToken) return false;
				try {
					// Raw fetch (not @ataqu/api-client): api-client imports
					// this store for its auth header, so importing it back
					// would create a dependency cycle.
					const resp = await fetch("/api/aegis/refresh", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ refresh_token: refreshToken }),
					});
					if (!resp.ok) throw new Error("refresh failed");
					const response = (await resp.json()) as {
						access_token: string;
						refresh_token: string;
						user_id: string;
					};
					set({
						token: response.access_token,
						refreshToken: response.refresh_token,
						isAuthenticated: true,
					});
					return true;
				} catch {
					set({
						token: null,
						refreshToken: null,
						user: null,
						tenantId: null,
						isAuthenticated: false,
					});
					return false;
				}
			},
			setUser: (user) =>
				set({ user, tenantId: (user?.tenantId ?? null) as TenantId | null }),
		}),
		{
			name: "ataqu-auth",
			partialize: (state) => ({
				token: state.token,
				refreshToken: state.refreshToken,
				user: state.user,
				tenantId: state.tenantId,
				isAuthenticated: state.isAuthenticated,
			}),
		},
	),
);
