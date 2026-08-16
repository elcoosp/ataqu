import { api, useLogin, useSignup } from "@ataqu/api-client";
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
		const [name, setName] = useState("");
		const [mode, setMode] = useState<"login" | "signup">("login");

		const loginMutation = useLogin({
			onSuccess: (res) => {
				login(res.access_token, {
					id: res.user_id,
					email,
					tenantId: "",
					roles: [],
				});
				navigate({ to: "/dashboard" });
			},
			onError: () => toast.error("Invalid credentials"),
		});
		const signupMutation = useSignup({
			onSuccess: () => {
				toast.success("Account created. Check your email to verify.");
				setMode("login");
			},
			onError: () => toast.error("Signup failed"),
		});

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

		const handlePasswordLogin = (e: React.FormEvent) => {
			e.preventDefault();
			if (mode === "signup") {
				signupMutation.mutate({ email, password, name: name || undefined });
				return;
			}
			loginMutation.mutate({ email, password });
		};

		if (token) {
			navigate({ to: "/dashboard" });
			return null;
		}

		return (
			<AuthLayout>
				<div className="bg-deep-night/80 p-8 rounded border border-gray-700/40 w-96 space-y-6">
					<h1 className="text-2xl font-heading text-center">
						{mode === "signup" ? (
							<Trans>Create your account</Trans>
						) : (
							<Trans>Sign in to Ataqu</Trans>
						)}
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
						{mode === "signup" && (
							<div>
								<label className="block text-sm font-medium mb-1">
									<Trans>Name</Trans>
								</label>
								<Input
									type="text"
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder="Jane Doe"
								/>
							</div>
						)}
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
							disabled={loginMutation.isPending || signupMutation.isPending}
							className="w-full bg-amber text-black hover:bg-amber/90"
						>
							{mode === "signup" ? (
								<Trans>Sign Up</Trans>
							) : (
								<Trans>Sign In</Trans>
							)}
						</Button>
						<button
							type="button"
							className="text-xs text-muted-foreground hover:text-foreground w-full"
							onClick={() =>
								setMode((m) => (m === "login" ? "signup" : "login"))
							}
						>
							{mode === "signup" ? (
								<Trans>Already have an account? Sign in</Trans>
							) : (
								<Trans>Need an account? Sign up</Trans>
							)}
						</button>
					</form>
				</div>
			</AuthLayout>
		);
	},
});
