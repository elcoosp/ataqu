import { createRootRoute, Outlet } from '@tanstack/react-router';
import { Shell } from '@ataqu/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nProvider } from '@ataqu/shared-i18n';
import { OnboardTour } from '@ataqu/ui';

const queryClient = new QueryClient();

export const Route = createRootRoute({
  component: () => (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <OnboardTour tourId="default" steps={[]}>
          <Shell activeApp="cinq">
            <Outlet />
          </Shell>
        </OnboardTour>
      </I18nProvider>
    </QueryClientProvider>
  ),
});
