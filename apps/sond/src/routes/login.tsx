import { AuthLayout, Button, Input } from "@ataqu/ui";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
	component: () => (
		<AuthLayout>
			<div className="bg-deep-night/80 p-8 rounded border border-gray-700/40 w-96">
				<h1 className="text-2xl font-heading mb-4">Login</h1>
				<form className="space-y-4">
					<div>
						<label className="block text-sm font-medium mb-1">Email</label>
						<Input type="email" placeholder="you@example.com" />
					</div>
					<div>
						<label className="block text-sm font-medium mb-1">Password</label>
						<Input type="password" placeholder="••••••••" />
					</div>
					<Button
						type="submit"
						className="w-full bg-amber text-black hover:bg-amber/90"
					>
						Sign In
					</Button>
				</form>
			</div>
		</AuthLayout>
	),
});
