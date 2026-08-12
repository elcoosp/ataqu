import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/auth-store';

export const Route = createFileRoute('/_auth')({
  beforeLoad: async () => {
    const { token, refresh } = useAuthStore.getState();
    if (!token) {
      const refreshed = await refresh();
      if (!refreshed) {
        throw redirect({ to: '/login' });
      }
    }
  },
  component: () => {
    const [loading, setLoading] = useState(true);
    const { token, isAuthenticated } = useAuthStore();

    useEffect(() => {
      if (token) setLoading(false);
    }, [token]);

    if (loading) {
      return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    if (!isAuthenticated) {
      // Should not happen due to beforeLoad
      return <Outlet />;
    }

    return <Outlet />;
  },
});
