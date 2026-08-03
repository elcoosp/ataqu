import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: () => <div>Redirecting...</div>,
  beforeLoad: ({ location }) => {
    const token = localStorage.getItem('auth-storage') ? JSON.parse(localStorage.getItem('auth-storage')!).state?.token : null;
    // Use window.location directly instead of RedirectError
    if (token) {
      window.location.href = '/dashboard';
    } else {
      window.location.href = '/login';
    }
  },
});
