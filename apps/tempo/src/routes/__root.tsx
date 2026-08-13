import { I18nProvider } from '@ataqu/shared-i18n';
import { OnboardTour, Shell } from '@ataqu/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRootRoute, Outlet } from '@tanstack/react-router';

const queryClient = new QueryClient();

export const Route = createRootRoute({
  component: () => (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <OnboardTour tourId="default" steps={[]}>
          <Shell activeApp="tempo">
            <Outlet />
          </Shell>
        </OnboardTour>
      </I18nProvider>
    </QueryClientProvider>
  ),
});
