import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth')({
  beforeLoad: () => {
    const token = localStorage.getItem('auth-storage')
      ? JSON.parse(localStorage.getItem('auth-storage')!).state?.token
      : null;
    if (!token) {
      throw redirect({ to: '/login' });
    }
  },
  component: () => <Outlet />,
});
