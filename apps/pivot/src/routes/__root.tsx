import { Outlet, createRootRoute } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nProvider } from '@ataqu/shared-i18n';
import { Shell, Toaster } from '@ataqu/ui';
import { useAuthStore } from '@ataqu/shared-stores';

const queryClient = new QueryClient();

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const { token } = useAuthStore();
  if (!token) {
    return <div>Redirecting to login…</div>;
  }
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <Shell activeApp="pivot">
          <Outlet />
        </Shell>
        <Toaster position="bottom-right" />
      </I18nProvider>
    </QueryClientProvider>
  );
}
