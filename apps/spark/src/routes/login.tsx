import { api } from "@ataqu/api-client";
import { useAuthStore } from "@ataqu/shared-stores";
import { AuthLayout, Button, Input } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import {
	createFileRoute,
	useNavigate,
	useSearch,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
	component: () => {
		const navigate = useNavigate();
		const search = useSearch({ from: "/login" }) as {
			token?: string;
			refreshToken?: string;
			user_id?: string;
		};
		const { login, token } = useAuthStore();
		const [email, setEmail] = useState("");
		const [password, setPassword] = useState("");
		const [loading, setLoading] = useState(false);

		useEffect(() => {
			if (search.token && search.refreshToken && search.user_id) {
				const user = { id: search.user_id, email: "", tenantId: "", roles: [] };
				login(search.token, user);
				navigate({ to: "/dashboard" });
			}
		}, [search]);

		const handleSSO = async (provider: "google" | "microsoft") => {
			try {
				const res = await api.post<{ url: string }>("/aegis/sso/login", {
					provider,
				});
				window.location.href = res.url;
			} catch {
				toast.error("SSO login failed");
			}
		};

		const handlePasswordLogin = async (e: React.FormEvent) => {
			e.preventDefault();
			setLoading(true);
			try {
				const res = await api.post<{
					access_token: string;
					refresh_token: string;
					user_id: string;
				}>("/aegis/login", { email, password });
				login(res.access_token, {
					id: res.user_id,
					email,
					tenantId: "",
					roles: [],
				});
				navigate({ to: "/dashboard" });
			} catch {
				toast.error("Invalid credentials");
			} finally {
				setLoading(false);
			}
		};

		if (token) {
			navigate({ to: "/dashboard" });
			return null;
		}

		return (
			<AuthLayout>
				<div className="bg-deep-night/80 p-8 rounded border border-gray-700/40 w-96 space-y-6">
					<h1 className="text-2xl font-heading text-center">
						<Trans>Sign in to Ataqu</Trans>
					</h1>
					<div className="space-y-3">
						<Button
							onClick={() => handleSSO("google")}
							className="w-full bg-white text-black hover:bg-gray-100 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
						>
							<Trans>Continue with Google</Trans>
						</Button>
						<Button
							onClick={() => handleSSO("microsoft")}
							className="w-full bg-[#2f2f2f] text-white hover:bg-[#3f3f3f]"
						>
							<Trans>Continue with Microsoft</Trans>
						</Button>
					</div>
					<div className="relative">
						<div className="absolute inset-0 flex items-center">
							<span className="w-full border-t border-gray-700/40" />
						</div>
						<div className="relative flex justify-center text-xs uppercase">
							<span className="bg-deep-night/80 px-2 text-gray-400">
								<Trans>Or</Trans>
							</span>
						</div>
					</div>
					<form onSubmit={handlePasswordLogin} className="space-y-4">
						<div>
							<label className="block text-sm font-medium mb-1">
								<Trans>Email</Trans>
							</label>
							<Input
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="you@example.com"
								required
							/>
						</div>
						<div>
							<label className="block text-sm font-medium mb-1">
								<Trans>Password</Trans>
							</label>
							<Input
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="••••••••"
								required
							/>
						</div>
						<Button
							type="submit"
							disabled={loading}
							className="w-full bg-amber text-black hover:bg-amber/90"
						>
							{loading ? <Trans>Signing in...</Trans> : <Trans>Sign In</Trans>}
						</Button>
					</form>
				</div>
			</AuthLayout>
		);
	},
});
