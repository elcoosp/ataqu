import { useNavigate } from '@tanstack/react-router';
import { api } from '@ataqu/api-client';
import type { UUID } from '@ataqu/types';

export interface CinqAction {
  id: string;
  name: string;
  shortcut?: string;
  action: () => void;
}

export function getCinqActions(): CinqAction[] {
  // We cannot use hooks outside of React, so we need to return a factory
  // that takes the navigate function.
  // We'll return an array of action definitions that can be used by the command palette.
  // The actual registration will happen in the Shell via a prop.
  // For now, we'll define the actions as plain objects.
  return [
    {
      id: 'cinq-create-contact',
      name: 'Create Contact',
      shortcut: 'C',
      action: () => {}, // placeholder, will be overridden
    },
    {
      id: 'cinq-create-deal',
      name: 'Create Deal',
      shortcut: 'D',
      action: () => {},
    },
    {
      id: 'cinq-go-contacts',
      name: 'Go to Contacts',
      action: () => {},
    },
    {
      id: 'cinq-go-deals',
      name: 'Go to Deals',
      action: () => {},
    },
    {
      id: 'cinq-go-tasks',
      name: 'Go to Tasks',
      action: () => {},
    },
    {
      id: 'cinq-go-import',
      name: 'Go to Import',
      action: () => {},
    },
    {
      id: 'cinq-import-csv',
      name: 'Import CSV',
      action: () => {},
    },
    {
      id: 'cinq-search-contacts',
      name: 'Search Contacts',
      shortcut: 'F',
      action: () => {},
    },
    {
      id: 'cinq-search-deals',
      name: 'Search Deals',
      action: () => {},
    },
    {
      id: 'cinq-export-contacts',
      name: 'Export Contacts CSV',
      action: () => {
        api.get('/cinq/csv/export', { responseType: 'blob' }).then((blob) => {
          const url = URL.createObjectURL(blob as Blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'contacts.csv';
          a.click();
          URL.revokeObjectURL(url);
        });
      },
    },
    {
      id: 'cinq-export-deals',
      name: 'Export Deals CSV',
      action: () => {
        api.get('/cinq/deals/export', { responseType: 'blob' }).then((blob) => {
          const url = URL.createObjectURL(blob as Blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'deals.csv';
          a.click();
          URL.revokeObjectURL(url);
        });
      },
    },
  ];
}

// We'll expose a registration function that takes a navigate function and registers actions.
// The Shell component will call this with navigate.
import { registerActions } from '@ataqu/ui/command-palette';

export function registerCinqActions(navigate: ReturnType<typeof useNavigate>) {
  const actions = getCinqActions();
  // Override the placeholder actions with real navigation
  const actionMap: Record<string, () => void> = {
    'cinq-create-contact': () => navigate({ to: '/contacts' }),
    'cinq-create-deal': () => navigate({ to: '/deals' }),
    'cinq-go-contacts': () => navigate({ to: '/contacts' }),
    'cinq-go-deals': () => navigate({ to: '/deals' }),
    'cinq-go-tasks': () => navigate({ to: '/tasks' }),
    'cinq-go-import': () => navigate({ to: '/import' }),
    'cinq-import-csv': () => navigate({ to: '/import' }),
    'cinq-search-contacts': () => navigate({ to: '/contacts' }),
    'cinq-search-deals': () => navigate({ to: '/deals' }),
  };

  const registered = actions.map((action) => ({
    ...action,
    action: actionMap[action.id] || action.action,
  }));

  registerActions(registered);
}
