import { Shell } from '@ataqu/ui';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './routes/router';

export const App = () => (
  <Shell activeApp="vista">
    <RouterProvider router={router} />
  </Shell>
);
