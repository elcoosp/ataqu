import { I18nProvider } from "@ataqu/shared-i18n";
import { OnboardTour, Shell } from "@ataqu/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, Outlet } from "@tanstack/react-router";

const queryClient = new QueryClient();

export const Route = createRootRoute({
	component: () => (
		<QueryClientProvider client={queryClient}>
			<I18nProvider>
				<OnboardTour
					tourId="default"
					steps={[
						{
							selector: "body",
							content:
								"Welcome to VISTA. Explore your data with SQL, build cross-app dashboards, and combine sources.",
						},
						{
							selector: "body",
							content:
								"Open the Explore view to write queries, or a dashboard to see live widgets.",
						},
						{
							selector: "body",
							content: "Press ⌘K to jump to VISTA commands.",
						},
					]}
				>
					<Shell activeApp="vista">
						<Outlet />
					</Shell>
				</OnboardTour>
			</I18nProvider>
		</QueryClientProvider>
	),
});
