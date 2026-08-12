import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import { useAuthStore } from '@ataqu/shared-stores';

export const Route = createFileRoute('/_auth')({
  beforeLoad: ({ location }) => {
    const { token } = useAuthStore.getState();
    if (!token) {
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }
  },
  component: AuthWrapper,
});

function AuthWrapper() {
  return <Outlet />;
}
