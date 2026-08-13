import { OnboardTour, Shell } from "@ataqu/ui";
import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";

interface RouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
	component: RootLayout,
});

function RootLayout() {
	return (
		<OnboardTour tourId="spark-global" steps={[]}>
			<Shell activeApp="spark">
				<Outlet />
			</Shell>
		</OnboardTour>
	);
}
