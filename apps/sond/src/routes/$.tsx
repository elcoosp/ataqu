import { Button, Shell } from "@ataqu/ui";
import { Trans } from "@lingui/macro";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FileQuestion } from "lucide-react";

export const Route = createFileRoute("/$")({
	component: NotFoundRoute,
});

function NotFoundRoute() {
	return (
		<Shell activeApp="sond">
			<div className="flex flex-col items-center justify-center py-16 text-center">
				<div className="mb-4 rounded-full bg-muted p-4">
					<FileQuestion className="h-8 w-8 text-muted-foreground" />
				</div>
				<h1 className="text-2xl font-bold mb-2">
					<Trans>Page not found</Trans>
				</h1>
				<p className="text-sm text-muted-foreground mb-6">
					<Trans>The page you are looking for does not exist.</Trans>
				</p>
				<Button asChild>
					<Link to="/">
						<Trans>Go to Forms</Trans>
					</Link>
				</Button>
			</div>
		</Shell>
	);
}
