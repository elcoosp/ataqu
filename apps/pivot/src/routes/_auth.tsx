import { Outlet, createFileRoute } from '@tanstack/react-router';
import { useAuthStore } from '@ataqu/shared-stores';
import { Navigate } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth')({
  beforeLoad: ({ location }) => {
    const { token } = useAuthStore.getState();
    if (!token) {
      throw new Navigate({ to: '/login', search: { redirect: location.href } });
    }
  },
  component: AuthWrapper,
});

function AuthWrapper() {
  return <Outlet />;
}
