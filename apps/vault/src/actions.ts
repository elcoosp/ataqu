export interface VaultAction {
  id: string;
  label: string;
  shortcut?: string;
  context?: string;
  url: string;
}

export interface VaultCommandItem {
  id: string;
  title: string;
  url: string;
}

// NOTE: These labels are English-only until @lingui/macro babel plugin is
// configured in the Vite build pipeline. The Frontend Development Guide
// requires Lingui macros, but the current toolchain does not transform them.
// All JSX-facing strings in components use <Trans> which works at runtime.
export const vaultActions: VaultAction[] = [
  {
    id: 'create-product',
    label: 'Create Product',
    shortcut: '⌘P',
    url: '/products?create=product',
  },
  {
    id: 'create-variant',
    label: 'Create Variant',
    context: 'product-detail',
    url: '/products?create=variant',
  },
  { id: 'go-to-products', label: 'Go to Products', url: '/products' },
  { id: 'go-to-movements', label: 'Go to Movements', url: '/movements' },
  { id: 'go-to-warehouses', label: 'Go to Warehouses', url: '/warehouses' },
  { id: 'go-to-reservations', label: 'Go to Reservations', url: '/reservations' },
  {
    id: 'search-products',
    label: 'Search Products',
    shortcut: '⌘S',
    url: '/products?focus=search',
  },
  {
    id: 'adjust-stock',
    label: 'Adjust Stock',
    context: 'product-detail',
    url: '/products?adjust=stock',
  },
  {
    id: 'set-low-stock-alert',
    label: 'Set Low Stock Alert',
    context: 'product-detail',
    url: '/products?set-low-stock-alert=true',
  },
  {
    id: 'reserve-stock-for-deal',
    label: 'Reserve Stock for Deal [ID]',
    url: '/reservations?reserve=stock',
  },
  { id: 'connect-to-cinq', label: 'Connect to CINQ', url: '/products?connect=cinq' },
  { id: 'export-products-csv', label: 'Export Products CSV', url: '/products?export=csv' },
  { id: 'sync-shopify', label: 'Sync Shopify', url: '/products?sync=shopify' },
];

export const searchVaultActions = async (query: string): Promise<VaultCommandItem[]> => {
  const normalizedQuery = query.trim().toLowerCase();

  return vaultActions
    .filter(
      (action) =>
        normalizedQuery.length === 0 || action.label.toLowerCase().includes(normalizedQuery)
    )
    .map((action) => ({
      id: action.id,
      title: action.label,
      url: action.url,
    }));
};

export const useVaultActions = (): VaultAction[] => vaultActions;
