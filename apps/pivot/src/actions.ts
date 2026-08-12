import { registerActions } from '@ataqu/ui'; // hypothetical; in practice we'd use a shared registry
import { navigate } from '@tanstack/react-router';
import { api } from '@ataqu/api-client';
import { toast } from 'sonner';

export function registerPivotActions() {
  // In a real implementation, we'd use a command registry.
  // For now, we'll define them as a list for the Shell to consume.
  // The Shell expects a searchFn prop that can be passed.
  // We'll export an action list for the command palette.
  return [
    {
      id: 'create-document',
      label: 'Create Document',
      shortcut: '⌘N',
      action: () => {
        api.post('/docs', { title: 'Untitled', content: '' }).then((doc) => {
          toast.success('Document created.');
          navigate({ to: '/doc/$id', params: { id: doc.id } });
        });
      },
    },
    {
      id: 'create-database',
      label: 'Create Database',
      shortcut: '⌘D',
      action: () => {
        api.post('/databases', { name: 'New Database' }).then((db) => {
          toast.success('Database created.');
          navigate({ to: '/db/$id', params: { id: db.id } });
        });
      },
    },
    {
      id: 'go-templates',
      label: 'Go to Templates',
      shortcut: '⌘T',
      action: () => navigate({ to: '/templates' }),
    },
    {
      id: 'search-documents',
      label: 'Search Documents',
      shortcut: '⌘K',
      action: () => document.querySelector<HTMLInputElement>('input[placeholder*="Search"]')?.focus(),
    },
    // Additional actions would be dynamically added based on current route.
  ];
}
