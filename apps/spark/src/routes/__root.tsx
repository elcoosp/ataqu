import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { Shell } from '@ataqu/ui';
import { OnboardTour } from '@ataqu/ui';
import type { QueryClient } from '@tanstack/react-query';

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
