import { I18nProvider } from "@ataqu/shared-i18n";
import { OnboardTour, Shell } from "@ataqu/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { SondCommandRegistrar } from "../actions";

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
								"Welcome to SOND. Build forms, add conditional logic, and publish conversational surveys.",
						},
						{
							selector: "body",
							content:
								"Use the builder to add questions, then wire branching logic between them.",
						},
						{
							selector: "body",
							content: "Press ⌘K to search forms or run SOND commands.",
						},
					]}
				>
					<Shell activeApp="sond">
						<SondCommandRegistrar />
						<Outlet />
					</Shell>
				</OnboardTour>
			</I18nProvider>
		</QueryClientProvider>
	),
});
