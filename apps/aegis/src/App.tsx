import { Shell } from '@ataqu/ui';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './routes/router';

export const App = () => (
  <Shell activeApp="aegis">
    <RouterProvider router={router} />
  </Shell>
);
