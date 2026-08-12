import { Outlet, createRootRoute, useNavigate } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nProvider } from '@ataqu/shared-i18n';
import { Shell, Toaster } from '@ataqu/ui';
import { useAuthStore } from '@ataqu/shared-stores';
import { api } from '@ataqu/api-client';
import { useIdempotency } from '@ataqu/shared-hooks';
import { toast } from 'sonner';
import { Trans } from '@lingui/react/macro';

const queryClient = new QueryClient();

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const { token } = useAuthStore();
  const navigate = useNavigate();
  const { getKey } = useIdempotency();

  if (!token) {
    return <div>Redirecting to login…</div>;
  }

  // Command palette search function
  const searchFn = async (q: string) => {
    if (!q || q.length < 2) return [];
    try {
      const results = await api.get('/search', { params: { q, limit: 10 } });
      return results.map((item: any) => ({
        id: item.id,
        title: item.title || item.name,
        url: item.type === 'document' ? `/doc/${item.id}` : `/db/${item.id}`,
        type: item.type || 'document',
      }));
    } catch {
      return [];
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <Shell activeApp="pivot" searchFn={searchFn}>
          <Outlet />
        </Shell>
        <Toaster position="bottom-right" />
      </I18nProvider>
    </QueryClientProvider>
  );
}
