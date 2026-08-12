import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { useAuthStore } from '@ataqu/shared-stores';
import { Shell } from '@ataqu/ui';
import { useDialActions } from '@/actions';
import { useDialWebSocket } from '@/hooks/use-dial-websocket';

export const Route = createFileRoute('/_auth')({
  beforeLoad: () => {
    const { token } = useAuthStore.getState();
    if (!token) {
      throw redirect({ to: '/login' });
    }
  },
  component: AuthLayout,
});

function AuthLayout() {
  // Initialize WebSocket
  useDialWebSocket();

  // Get actions for command palette search
  const actions = useDialActions();
  const searchFn = async (query: string) => {
    const lower = query.toLowerCase();
    return actions
      .filter((a) => a.title.toLowerCase().includes(lower))
      .map((a) => ({
        id: a.id,
        title: a.title,
        url: '#',
        onSelect: a.onSelect,
      }));
  };

  return <Shell activeApp="dial" searchFn={searchFn}><Outlet /></Shell>;
}
