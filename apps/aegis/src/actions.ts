// apps/aegis/src/actions.ts
// Register AEGIS-specific actions with the global command palette.

import type { CommandAction } from '@ataqu/ui';
import { useNavigate } from '@tanstack/react-router';
import { useAuthStore } from './stores/auth-store';

export function registerAegisActions(
  openInviteModal: () => void,
  openCreateApiKeyModal: () => void,
  openCreateRoleModal: () => void
): CommandAction[] {
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
      action: () => useNavigate()({ to: '/users' }),
    },
    {
      id: 'aegis-go-roles',
      label: 'Go to Roles',
      shortcut: ['g', 'r'],
      action: () => useNavigate()({ to: '/roles' }),
    },
    {
      id: 'aegis-go-api-keys',
      label: 'Go to API Keys',
      shortcut: ['g', 'k'],
      action: () => useNavigate()({ to: '/api-keys' }),
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
      action: () => useNavigate()({ to: '/settings' }),
    },
    {
      id: 'aegis-go-admin-access-matrix',
      label: 'Access Matrix',
      shortcut: ['a', 'm'],
      action: () => useNavigate()({ to: '/admin/access-matrix' }),
    },
    {
      id: 'aegis-go-admin-audit',
      label: 'Audit Log',
      shortcut: ['a', 'l'],
      action: () => useNavigate()({ to: '/admin/audit' }),
    },
    {
      id: 'aegis-logout',
      label: 'Logout',
      shortcut: ['l', 'o'],
      action: () => {
        useAuthStore.getState().logout();
        useNavigate()({ to: '/login' });
      },
    },
  ];
}
