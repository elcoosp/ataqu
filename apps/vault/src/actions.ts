import { useNavigate } from '@tanstack/react-router';

export interface VaultAction {
  id: string;
  label: string;
  shortcut?: string;
  context?: string;
  handler?: () => void;
}

export const useVaultActions = () => {
  const navigate = useNavigate();

  return [
    {
      id: 'create-product',
      label: 'Create Product',
      shortcut: '⌘P',
      handler: () => navigate({ to: '/products' }),
    },
    { id: 'create-variant', label: 'Create Variant', context: 'product-detail', handler: () => {} },
    { id: 'go-to-products', label: 'Go to Products', handler: () => navigate({ to: '/products' }) },
    {
      id: 'go-to-movements',
      label: 'Go to Movements',
      handler: () => navigate({ to: '/movements' }),
    },
    {
      id: 'go-to-warehouses',
      label: 'Go to Warehouses',
      handler: () => navigate({ to: '/warehouses' }),
    },
    {
      id: 'go-to-reservations',
      label: 'Go to Reservations',
      handler: () => navigate({ to: '/reservations' }),
    },
    {
      id: 'search-products',
      label: 'Search Products',
      shortcut: '⌘S',
      handler: () => navigate({ to: '/products' }),
    },
    { id: 'adjust-stock', label: 'Adjust Stock', context: 'product-detail', handler: () => {} },
    {
      id: 'set-low-stock-alert',
      label: 'Set Low Stock Alert',
      context: 'product-detail',
      handler: () => {},
    },
    {
      id: 'reserve-stock-for-deal',
      label: 'Reserve Stock for Deal [ID]',
      handler: () => navigate({ to: '/reservations' }),
    },
    { id: 'connect-to-cinq', label: 'Connect to CINQ', handler: () => {} },
    { id: 'export-products-csv', label: 'Export Products CSV', handler: () => {} },
    { id: 'sync-shopify', label: 'Sync Shopify', handler: () => {} },
  ];
};
