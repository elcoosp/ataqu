import { Button } from "@ataqu/ui";
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';

import { useEffect } from 'react';
import { api } from '@ataqu/api-client';
import { useAuthStore } from '../stores/auth-store';
import { Trans } from '@lingui/react/macro';

export const Route = createFileRoute('/login')({
  component: () => {
    const navigate = useNavigate();
    const search = useSearch({ from: "/login" }) as { token?: string; refreshToken?: string; user_id?: string };
    const { login, isAuthenticated } = useAuthStore();

    useEffect(() => {
      if (search.token && search.refreshToken && search.user_id) {
        // We have tokens from SSO callback; we need to fetch the user profile.
        // For now, we'll store tokens and navigate to dashboard; _auth will fetch user.
        // We'll create a minimal user object with the id; the dashboard will fetch full profile.
        const user = { id: search.user_id, email: '', tenantId: '', roles: [] };
        login(search.token, search.refreshToken, user);
        navigate({ to: '/dashboard' });
      }
    }, [search]);

    const handleGoogle = async () => {
      try {
        const res = await api.post<{ url: string }>('/aegis/sso/login', { provider: 'google' });
        window.location.href = res.url;
      } catch (e) {
        console.error('SSO login error', e);
      }
    };

    const handleMicrosoft = async () => {
      try {
        const res = await api.post<{ url: string }>('/aegis/sso/login', { provider: 'microsoft' });
        window.location.href = res.url;
      } catch (e) {
        console.error('SSO login error', e);
      }
    };

    if (isAuthenticated) {
      navigate({ to: '/dashboard' });
      return null;
    }

    return (
      <AuthLayout>
        <div className="bg-deep-night/80 p-8 rounded border border-gray-700/40 w-96 space-y-6">
          <h1 className="text-2xl font-heading text-center">
            <Trans>Sign in to Ataqu</Trans>
          </h1>
          <div className="space-y-3">
            <Button
              onClick={handleGoogle}
              className="w-full bg-white text-black hover:bg-gray-100 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
            >
              <img src="/google.svg" alt="Google" className="w-5 h-5 mr-2" />
              <Trans>Continue with Google</Trans>
            </Button>
            <Button
              onClick={handleMicrosoft}
              className="w-full bg-[#2f2f2f] text-white hover:bg-[#3f3f3f]"
            >
              <img src="/microsoft.svg" alt="Microsoft" className="w-5 h-5 mr-2" />
              <Trans>Continue with Microsoft</Trans>
            </Button>
          </div>
          <div className="text-center text-sm text-gray-400">
            <Trans>No password needed. SSO only.</Trans>
          </div>
        </div>
      </AuthLayout>
    );
  },
});
