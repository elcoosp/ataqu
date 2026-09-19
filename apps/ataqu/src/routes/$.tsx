import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$")({
	component: () => (
		<div className="flex h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
			<h1 className="text-2xl font-semibold tracking-tight">404</h1>
			<p className="text-sm text-muted-foreground">
				This page does not exist or has been moved.
			</p>
			<a
				href="/"
				className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
			>
				Back to dashboard
			</a>
		</div>
	),
});
