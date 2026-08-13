// apps/aegis/src/actions.ts
// apps/aegis/src/actions.ts
import { useNavigate, NavigateOptions } from '@tanstack/react-router';
import { useAuthStore } from './stores/auth-store';

export function registerAegisActions(
  openInviteModal: () => void,
  openCreateApiKeyModal: () => void,
  openCreateRoleModal: () => void,
  navigate: (opts: NavigateOptions) => void
) {
  return [
    {
      id: 'aegis-invite-user',
      label: 'Invite User',
      shortcut: ['i', 'u'],
      action: openInviteModal,
    },
    {
      id: 'aegis-go-users',
      label: 'Go to Users',
      shortcut: ['g', 'u'],
      action: () => navigate({ to: '/users' }),
    },
    {
      id: 'aegis-go-roles',
      label: 'Go to Roles',
      shortcut: ['g', 'r'],
      action: () => navigate({ to: '/roles' }),
    },
    {
      id: 'aegis-go-api-keys',
      label: 'Go to API Keys',
      shortcut: ['g', 'k'],
      action: () => navigate({ to: '/api-keys' }),
    },
    {
      id: 'aegis-create-api-key',
      label: 'Create API Key',
      shortcut: ['c', 'k'],
      action: openCreateApiKeyModal,
    },
    {
      id: 'aegis-create-role',
      label: 'Create Role',
      shortcut: ['c', 'r'],
      action: openCreateRoleModal,
    },
    {
      id: 'aegis-go-settings',
      label: 'Go to Settings',
      shortcut: ['g', 's'],
      action: () => navigate({ to: '/settings' }),
    },
    {
      id: 'aegis-go-admin-access-matrix',
      label: 'Access Matrix',
      shortcut: ['a', 'm'],
      action: () => navigate({ to: '/admin/access-matrix' }),
    },
    {
      id: 'aegis-go-admin-audit',
      label: 'Audit Log',
      shortcut: ['a', 'l'],
      action: () => navigate({ to: '/admin/audit' }),
    },
    {
      id: 'aegis-logout',
      label: 'Logout',
      shortcut: ['l', 'o'],
      action: () => {
        useAuthStore.getState().logout();
        navigate({ to: '/login' });
      },
    },
  ];
}
