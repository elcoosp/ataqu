import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { FileQuestion } from "lucide-react";
import { EmptyState } from "../components/empty-state";

export const Route = createFileRoute("/$")({
	component: NotFoundPage,
});

function NotFoundPage() {
	return (
		<div className="flex items-center justify-center h-full">
			<EmptyState
				icon={FileQuestion}
				title={<Trans>Page not found</Trans>}
				description={
					<Trans>The page you are looking for does not exist.</Trans>
				}
				ctaLabel={<Trans>Go to Workflows</Trans>}
				onCtaClick={() => (window.location.href = "/")}
			/>
		</div>
	);
}
