import { createRouter } from '@tanstack/react-router';
import { Route as rootRoute } from './__root';
import { Route as indexRoute } from './index';
import { Route as loginRoute } from './login';
import { Route as authRoute } from './_auth';
import { Route as dashboardRoute } from './_auth/dashboard';

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  authRoute.addChildren([dashboardRoute]),
]);

export const router = createRouter({ routeTree });
