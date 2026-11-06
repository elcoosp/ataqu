import { api, useLogin, useSignup } from "@ataqu/api-client";
import { useAuthStore } from "@ataqu/shared-stores";
import {
	AuthLayout,
	Button,
	FloatingLabelInput,
	LoadingButton,
	PasswordStrength,
	SegmentedControl,
} from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { consumeSsoFragment } from "../lib/sso";

export const Route = createFileRoute("/login")({
	component: () => {
		const navigate = useNavigate();
		const { login, token } = useAuthStore();
		const [email, setEmail] = useState("");
		const [password, setPassword] = useState("");
		const [name, setName] = useState("");
		const [mode, setMode] = useState<"login" | "signup">("login");

		const loginMutation = useLogin({
			onSuccess: (res) => {
				login(res.access_token, res.refresh_token, {
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

		// SSO callback: the backend redirects back to /login with the tokens in
		// the URL *fragment* (#token=…). Parse it once, validate it, and strip
		// it from history immediately. Tokens are deliberately NOT accepted
		// from the query string — query parameters leak via Referer headers,
		// proxy/CDN logs and browser history (see lib/sso.ts).
		useEffect(() => {
			const payload = consumeSsoFragment();
			if (payload) {
				const user = {
					id: payload.userId,
					email: "",
					tenantId: "",
					roles: [],
				};
				login(payload.token, payload.refreshToken, user);
				navigate({ to: "/dashboard" });
			}
		}, [login, navigate]);

		const handleSSO = async (provider: "google" | "microsoft") => {
			try {
				const res = await api.post<{ url: string }>("/aegis/sso/login", {
					provider,
					return_to: `${window.location.origin}/login`,
				});
				window.location.href = res.url;
			} catch {
				toast.error("SSO login failed");
			}
		};

		const _fillDemoCredentials = () => {
			setMode("login");
			setEmail("demo@ataqu.com");
			setPassword("demo1234");
		};

		const handlePasswordLogin = (e: React.FormEvent) => {
			e.preventDefault();
			if (mode === "signup") {
				signupMutation.mutate({ email, password, name: name || undefined });
				return;
			}
			loginMutation.mutate({ email, password });
		};

		useEffect(() => {
			if (token) void navigate({ to: "/dashboard" });
		}, [token, navigate]);

		return (
			<AuthLayout>
				<div className="plate shadow-md w-full p-8">
					<div className="mb-6 flex items-start justify-between gap-4 border-b border-border pb-5">
						<div>
							<p className="meta text-muted-foreground">
								Access control · SHT A-00
							</p>
							<h1 className="font-heading mt-2 text-2xl leading-tight">
								{mode === "signup" ? (
									<Trans>Create your account</Trans>
								) : (
									<Trans>Sign in to Ataqu</Trans>
								)}
							</h1>
						</div>
						<svg
							aria-hidden="true"
							viewBox="0 0 16 16"
							fill="none"
							className="mt-1 h-4 w-4 flex-shrink-0 text-primary"
						>
							<circle
								cx="8"
								cy="8"
								r="5"
								stroke="currentColor"
								strokeWidth="1.25"
							/>
							<path
								d="M8 0.5V4M8 12V15.5M0.5 8H4M12 8H15.5"
								stroke="currentColor"
								strokeWidth="1.25"
							/>
							<circle cx="8" cy="8" r="1.4" fill="currentColor" />
						</svg>
					</div>

					<div className="space-y-6">
						<SegmentedControl
							label="Authentication mode"
							options={[
								{ value: "login", label: "Sign in" },
								{ value: "signup", label: "Sign up" },
							]}
							value={mode}
							onValueChange={(v) => setMode(v as "login" | "signup")}
						/>

						<div className="space-y-2.5">
							<Button
								onClick={() => handleSSO("google")}
								variant="outline"
								className="w-full justify-start"
							>
								<span
									aria-hidden="true"
									className="meta mr-1 text-muted-foreground"
								>
									G
								</span>
								<Trans>Continue with Google</Trans>
							</Button>
							<Button
								onClick={() => handleSSO("microsoft")}
								variant="outline"
								className="w-full justify-start"
							>
								<span
									aria-hidden="true"
									className="meta mr-1 text-muted-foreground"
								>
									M
								</span>
								<Trans>Continue with Microsoft</Trans>
							</Button>
						</div>
						<div className="relative">
							<div className="absolute inset-0 flex items-center">
								<span className="w-full border-t border-border" />
							</div>
							<div className="relative flex justify-center">
								<span className="bg-card px-2 meta text-muted-foreground">
									<Trans>Or</Trans>
								</span>
							</div>
						</div>
						<form onSubmit={handlePasswordLogin} className="space-y-4">
							{mode === "signup" && (
								<FloatingLabelInput
									label="Name"
									value={name}
									onChange={setName}
								/>
							)}
							<div className="space-y-1">
								<FloatingLabelInput
									label="Email"
									type="email"
									value={email}
									onChange={setEmail}
									required
								/>
							</div>
							<div className="space-y-1">
								<FloatingLabelInput
									label="Password"
									type="password"
									value={password}
									onChange={setPassword}
									required
								/>
								{mode === "signup" && password.length > 0 && (
									<PasswordStrength value={password} />
								)}
							</div>
							<LoadingButton
								onAction={async () => {
									if (mode === "signup") {
										await new Promise<void>((resolve, reject) => {
											signupMutation.mutate(
												{ email, password, name: name || undefined },
												{ onSuccess: () => resolve(), onError: () => reject() },
											);
										});
									} else {
										await new Promise<void>((resolve, reject) => {
											loginMutation.mutate(
												{ email, password },
												{ onSuccess: () => resolve(), onError: () => reject() },
											);
										});
									}
								}}
								disabled={loginMutation.isPending || signupMutation.isPending}
								className="w-full"
							>
								{mode === "signup" ? "Sign Up" : "Sign In"}
							</LoadingButton>
							<button
								type="button"
								className="w-full text-xs text-muted-foreground transition-colors hover:text-primary"
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
				</div>
			</AuthLayout>
		);
	},
});
