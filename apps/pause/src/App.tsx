import { Shell } from '@ataqu/ui';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './routes';

export const App = () => (
  <Shell activeApp="pause">
    <RouterProvider router={router} />
  </Shell>
);
