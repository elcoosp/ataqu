import React, { useState, useEffect } from 'react';
import { CommandMenu, type CommandAction } from 'better-cmdk';
import {
  HomeIcon,
  UsersIcon,
  MessageSquareIcon,
  FileTextIcon,
  ZapIcon,
  CalendarIcon,
  FormInputIcon,
  PackageIcon,
  UserIcon,
  BarChartIcon,
  SearchIcon,
  SettingsIcon,
  LogOutIcon,
} from 'lucide-react';
import { useAuthStore } from '@ataqu/shared-stores';
import { useNavigate } from '@tanstack/react-router';

const APP_DOMAINS: Record<string, string> = {
  aegis: 'sso',
  cinq: 'crm',
  dial: 'chat',
  pivot: 'docs',
  spark: 'auto',
  tempo: 'schedule',
  sond: 'forms',
  vault: 'inv',
  pause: 'hr',
  vista: 'bi',
};

const APP_NAMES: Record<string, string> = {
  aegis: 'AEGIS',
  cinq: 'CINQ',
  dial: 'DIAL',
  pivot: 'PIVOT',
  spark: 'SPARK',
  tempo: 'TEMPO',
  sond: 'SOND',
  vault: 'VAULT',
  pause: 'PAUSE',
  vista: 'VISTA',
};

export const CommandPalette: React.FC = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Build actions for navigation to other apps
  const appActions: CommandAction[] = Object.keys(APP_DOMAINS).map((app) => ({
    name: `go-to-${app}`,
    label: APP_NAMES[app],
    description: `Open ${APP_NAMES[app]}`,
    icon: <span className="text-lg">{(() => {
      const icons: Record<string, string> = {
        aegis: '🔐',
        cinq: '📊',
        dial: '💬',
        pivot: '📝',
        spark: '⚡',
        tempo: '📅',
        sond: '📋',
        vault: '📦',
        pause: '👤',
        vista: '📈',
      };
      return icons[app] || '📄';
    })()}</span>,
    group: 'Switch App',
    execute: () => {
      window.location.href = `https://${APP_DOMAINS[app]}.ataqu.com`;
    },
  }));

  // Internal navigation actions (using TanStack Router)
  const internalActions: CommandAction[] = [
    {
      name: 'dashboard',
      label: 'Dashboard',
      description: 'Go to dashboard',
      icon: <HomeIcon className="size-4" />,
      group: 'Navigation',
      shortcut: '⌘D',
      execute: () => navigate({ to: '/dashboard' }),
    },
    {
      name: 'search',
      label: 'Global Search',
      description: 'Search across all data',
      icon: <SearchIcon className="size-4" />,
      group: 'Navigation',
      shortcut: '⌘S',
      execute: () => console.log('Search opened'),
    },
  ];

  // User actions
  const userActions: CommandAction[] = [
    {
      name: 'logout',
      label: 'Sign Out',
      description: 'Log out of your account',
      icon: <LogOutIcon className="size-4" />,
      group: 'Account',
      execute: () => logout(),
    },
  ];

  const allActions = [...appActions, ...internalActions, ...userActions];

  return (
    <CommandMenu
      open={open}
      onOpenChange={setOpen}
      actions={allActions}
      actionsPlaceholder="Search apps, navigate, or run commands..."
      groupsLabel="Categories"
      emptyMessage="No commands found."
    />
  );
};
