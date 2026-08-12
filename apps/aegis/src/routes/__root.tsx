// apps/aegis/src/routes/__root.tsx
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nProvider } from '@ataqu/shared-i18n';
import { Shell } from '@ataqu/ui';
import { useAuthStore } from '../stores/auth-store';
import { registerAegisActions } from '../actions';
import { useEffect } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

export const Route = createRootRoute({
  component: () => {
    const { user, token, logout } = useAuthStore();

    // Register command palette actions when the component mounts.
    useEffect(() => {
      // Dummy modal openers for now; these will be wired to state in the real app.
      const openInvite = () => console.log('Invite user');
      const openApiKey = () => console.log('Create API key');
      const openRole = () => console.log('Create role');
      const actions = registerAegisActions(openInvite, openApiKey, openRole);
      // The global command palette store will register these.
      // For now, we just log.
      console.log('Registered AEGIS actions', actions);
    }, []);

    return (
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <Shell activeApp="aegis">
            <Outlet />
          </Shell>
        </I18nProvider>
      </QueryClientProvider>
    );
  },
});
