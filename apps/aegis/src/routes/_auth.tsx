import {
	useGetCurrentUser,
	useLogout,
	useRefreshToken,
} from "@ataqu/api-client";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { useEffect, useState } from "react";
import { useAuthStore } from "../stores/auth-store";

/**
 * Loads the authenticated user's profile via useGetCurrentUser and pushes it
 * into the auth store. Keeps the cached user object fresh across sessions.
 */
function SessionLoader() {
	const { data: me } = useGetCurrentUser();
	const setUser = useAuthStore((s) => s.setUser);

	useEffect(() => {
		if (me)
			setUser({
				id: me.id,
				email: me.email,
				tenantId: (me as unknown as { tenant_id?: string }).tenant_id ?? "",
				roles: me.role ? [me.role] : [],
			});
	}, [me, setUser]);

	return null;
}

/**
 * Proactively renews the access token with useRefreshToken before it expires,
 * keeping the session alive in the auth store.
 */
function TokenRefresher() {
	const refreshTokenMutation = useRefreshToken();
	const { refreshToken, token, isAuthenticated } = useAuthStore();
	const login = useAuthStore((s) => s.login);

	useEffect(() => {
		if (!isAuthenticated || !refreshToken || token) return;
		let cancelled = false;
		const interval = setInterval(
			async () => {
				if (cancelled) return;
				try {
					const res = await refreshTokenMutation.mutateAsync({
						refresh_token: refreshToken,
					});
					login(res.access_token, res.refresh_token, {
						id: res.user_id,
						email: "",
						tenantId: "",
						roles: [],
					});
				} catch {
					// Token refresh failures are surfaced by the router guard.
				}
			},
			5 * 60 * 1000,
		);
		return () => {
			cancelled = true;
			clearInterval(interval);
		};
	}, [isAuthenticated, refreshToken, token, login, refreshTokenMutation]);

	return null;
}

/** Logout button wired to useLogout. */
function LogoutButton() {
	const logout = useLogout({
		onSuccess: () => {
			useAuthStore.getState().logout();
			window.location.href = "/login";
		},
	});
	const storeLogout = useAuthStore((s) => s.logout);

	return (
		<button
			type="button"
			className="text-sm text-muted-foreground hover:text-foreground"
			onClick={() => {
				logout.mutate();
				storeLogout();
				window.location.href = "/login";
			}}
		>
			Logout
		</button>
	);
}

export const Route = createFileRoute("/_auth")({
	beforeLoad: async () => {
		const { token, refresh } = useAuthStore.getState();
		if (!token) {
			const refreshed = await refresh();
			if (!refreshed) {
				throw redirect({ to: "/login" });
			}
		}
	},
	component: () => {
		const [loading, setLoading] = useState(true);
		const { token, isAuthenticated } = useAuthStore();

		useEffect(() => {
			if (token) setLoading(false);
		}, [token]);

		if (loading) {
			return (
				<div className="flex items-center justify-center h-screen">
					Loading...
				</div>
			);
		}

		if (!isAuthenticated) {
			// Should not happen due to beforeLoad
			return <Outlet />;
		}

		return (
			<>
				<SessionLoader />
				<TokenRefresher />
				<div className="flex justify-end p-2">
					<LogoutButton />
				</div>
				<Outlet />
			</>
		);
	},
});
