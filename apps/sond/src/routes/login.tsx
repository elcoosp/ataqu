import { useLogin } from "@ataqu/api-client";
import { useAuthStore } from "@ataqu/shared-stores";
import { handleApiError } from "@ataqu/shared-utils";
import { AuthLayout, Button, Card, Input } from "@ataqu/ui";
import { Trans, t } from "@lingui/macro";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useId, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
	component: LoginRoute,
});

function LoginRoute() {
	const navigate = useNavigate();
	const login = useAuthStore((s) => s.login);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const emailId = useId();
	const passwordId = useId();

	const loginMutation = useLogin({
		onSuccess: (data) => {
			login(data.access_token, {
				id: data.user_id,
				email,
				tenantId: data.user_id,
				roles: ["admin"],
			});
			toast.success(t`Welcome back`);
			navigate({ to: "/" });
		},
		onError: (err) => toast.error(handleApiError(err)),
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		loginMutation.mutate({ email, password });
	};

	return (
		<AuthLayout>
			<Card className="w-full max-w-md p-8">
				<h1 className="text-2xl font-bold mb-6">
					<Trans>Sign in to Ataqu</Trans>
				</h1>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label htmlFor={emailId} className="block text-sm font-medium mb-1">
							<Trans>Email</Trans>
						</label>
						<Input
							id={emailId}
							type="email"
							placeholder={t`you@example.com`}
							value={email}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
							required
						/>
					</div>
					<div>
						<label
							htmlFor={passwordId}
							className="block text-sm font-medium mb-1"
						>
							<Trans>Password</Trans>
						</label>
						<Input
							id={passwordId}
							type="password"
							placeholder="••••••••"
							value={password}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
							required
						/>
					</div>
					<Button
						type="submit"
						className="w-full"
						disabled={loginMutation.isPending}
					>
						{loginMutation.isPending ? (
							t`Signing in...`
						) : (
							<Trans>Sign In</Trans>
						)}
					</Button>
				</form>
			</Card>
		</AuthLayout>
	);
}
