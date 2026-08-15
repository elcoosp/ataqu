import { I18nProvider } from "@ataqu/shared-i18n";
import { OnboardTour, Shell } from "@ataqu/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TempoCommandRegistrar } from "../actions";

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
								"Welcome to TEMPO. Create event types and share your public booking link with clients.",
						},
						{
							selector: "body",
							content:
								"Track no-shows and reschedule meetings directly from your calendar.",
						},
						{
							selector: "body",
							content: "Press ⌘K to jump to TEMPO commands.",
						},
					]}
				>
					<Shell activeApp="tempo">
						<TempoCommandRegistrar />
						<Outlet />
					</Shell>
				</OnboardTour>
			</I18nProvider>
		</QueryClientProvider>
	),
});
