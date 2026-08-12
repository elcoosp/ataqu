import { api } from '@ataqu/api-client';
import type { NavigateFunction } from '@tanstack/react-router';

export interface CinqAction {
  id: string;
  name: string;
  shortcut?: string;
  action: () => void;
}

export function getCinqActions(navigate: NavigateFunction): CinqAction[] {
  return [
    {
      id: 'cinq-create-contact',
      name: 'Create Contact',
      shortcut: 'C',
      action: () => navigate({ to: '/contacts' }),
    },
    {
      id: 'cinq-create-deal',
      name: 'Create Deal',
      shortcut: 'D',
      action: () => navigate({ to: '/deals' }),
    },
    {
      id: 'cinq-go-contacts',
      name: 'Go to Contacts',
      action: () => navigate({ to: '/contacts' }),
    },
    {
      id: 'cinq-go-deals',
      name: 'Go to Deals',
      action: () => navigate({ to: '/deals' }),
    },
    {
      id: 'cinq-go-tasks',
      name: 'Go to Tasks',
      action: () => navigate({ to: '/tasks' }),
    },
    {
      id: 'cinq-go-import',
      name: 'Go to Import',
      action: () => navigate({ to: '/import' }),
    },
    {
      id: 'cinq-import-csv',
      name: 'Import CSV',
      action: () => navigate({ to: '/import' }),
    },
    {
      id: 'cinq-search-contacts',
      name: 'Search Contacts',
      shortcut: 'F',
      action: () => navigate({ to: '/contacts' }),
    },
    {
      id: 'cinq-search-deals',
      name: 'Search Deals',
      action: () => navigate({ to: '/deals' }),
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
