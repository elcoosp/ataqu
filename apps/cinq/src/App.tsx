import { Outlet, useNavigate } from '@tanstack/react-router';
import { Shell } from '@ataqu/ui';
import { api } from '@ataqu/api-client';

export function App() {
  const navigate = useNavigate();

  // Define actions directly inside the component so we have navigate
  const searchFn = async (query: string) => {
    // Build action items
    const actions = [
      {
        id: 'cinq-create-contact',
        title: 'Create Contact',
        shortcut: 'C',
        action: () => navigate({ to: '/contacts' }),
      },
      {
        id: 'cinq-create-deal',
        title: 'Create Deal',
        shortcut: 'D',
        action: () => navigate({ to: '/deals' }),
      },
      {
        id: 'cinq-go-contacts',
        title: 'Go to Contacts',
        action: () => navigate({ to: '/contacts' }),
      },
      {
        id: 'cinq-go-deals',
        title: 'Go to Deals',
        action: () => navigate({ to: '/deals' }),
      },
      {
        id: 'cinq-go-tasks',
        title: 'Go to Tasks',
        action: () => navigate({ to: '/tasks' }),
      },
      {
        id: 'cinq-go-import',
        title: 'Go to Import',
        action: () => navigate({ to: '/import' }),
      },
      {
        id: 'cinq-import-csv',
        title: 'Import CSV',
        action: () => navigate({ to: '/import' }),
      },
      {
        id: 'cinq-search-contacts',
        title: 'Search Contacts',
        shortcut: 'F',
        action: () => navigate({ to: '/contacts' }),
      },
      {
        id: 'cinq-search-deals',
        title: 'Search Deals',
        action: () => navigate({ to: '/deals' }),
      },
      {
        id: 'cinq-export-contacts',
        title: 'Export Contacts CSV',
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
        title: 'Export Deals CSV',
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

    // Filter by query and return as search results
    const filtered = actions.filter((a) =>
      a.title.toLowerCase().includes(query.toLowerCase())
    );
    return filtered.map((a) => ({
      id: a.id,
      title: a.title,
      url: '', // not used for actions
      action: a.action,
    }));
  };

  return (
    <Shell activeApp="cinq" searchFn={searchFn}>
      <Outlet />
    </Shell>
  );
}
