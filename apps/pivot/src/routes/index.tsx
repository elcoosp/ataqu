import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: () => <div>Redirecting...</div>,
  beforeLoad: ({ location }) => {
    const token = localStorage.getItem('auth-storage') ? JSON.parse(localStorage.getItem('auth-storage')!).state?.token : null;
    throw new (window as any).RedirectError?.({ to: token ? '/dashboard' : '/login' });
  },
});
