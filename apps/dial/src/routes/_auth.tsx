import { createFileRoute } from '@tanstack/react-router';
import { Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth')({
  component: () => <Outlet />,
  beforeLoad: () => {
    const token = localStorage.getItem('auth-storage') ? JSON.parse(localStorage.getItem('auth-storage')!).state?.token : null;
    if (!token) throw new (window as any).RedirectError?.({ to: '/login' });
  },
});
