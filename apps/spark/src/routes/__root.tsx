import { OnboardTour, Shell } from "@ataqu/ui";
import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { SparkCommandRegistrar } from "../actions";

interface RouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
	component: RootLayout,
});

function RootLayout() {
	return (
		<OnboardTour
			tourId="spark-global"
			steps={[
				{
					selector: "body",
					content:
						"Welcome to SPARK. Build automations by connecting triggers to actions across your apps.",
				},
				{
					selector: "body",
					content:
						"Monitor workflow runs and inspect the dead-letter queue for failed executions.",
				},
				{
					selector: "body",
					content: "Press ⌘K to jump to SPARK commands.",
				},
			]}
		>
			<Shell activeApp="spark">
				<SparkCommandRegistrar />
				<Outlet />
			</Shell>
		</OnboardTour>
	);
}
