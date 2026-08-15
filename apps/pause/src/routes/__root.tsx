import { I18nProvider } from "@ataqu/shared-i18n";
import { OnboardTour, Shell } from "@ataqu/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { PauseCommandRegistrar } from "../actions";

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
								"Welcome to PAUSE. Manage your team directory, leave requests and onboarding.",
						},
						{
							selector: "body",
							content: "Request leave or review team reports from the sidebar.",
						},
						{
							selector: "body",
							content: "Press ⌘K to jump to PAUSE commands.",
						},
					]}
				>
					<Shell activeApp="pause">
						<PauseCommandRegistrar />
						<Outlet />
					</Shell>
				</OnboardTour>
			</I18nProvider>
		</QueryClientProvider>
	),
});
