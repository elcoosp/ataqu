import { createRootRoute, Outlet } from '@tanstack/react-router';
import { Shell } from '@ataqu/ui';

export const Route = createRootRoute({
  component: () => (
    <Shell activeApp="vault">
      <Outlet />
    </Shell>
  ),
});
