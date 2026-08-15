import { I18nProvider } from "@ataqu/shared-i18n";
import { OnboardTour, Shell } from "@ataqu/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { DialCommandRegistrar } from "../actions";

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
								"Welcome to DIAL. Your Support Workspace shows live tickets, channels and the linked CINQ deal context.",
						},
						{
							selector: "body",
							content:
								"Toggle Focus Mode to silence distractions while you work through tickets.",
						},
						{
							selector: "body",
							content:
								"Press ⌘K to search messages or jump to any DIAL command.",
						},
					]}
				>
					<Shell activeApp="dial">
						<DialCommandRegistrar />
						<Outlet />
					</Shell>
				</OnboardTour>
			</I18nProvider>
		</QueryClientProvider>
	),
});
export const routeTree = Route;
