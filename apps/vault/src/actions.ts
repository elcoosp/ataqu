export interface VaultAction {
  id: string;
  label: string;
  shortcut?: string;
  context?: string;
}

export const vaultActions: VaultAction[] = [
  { id: 'create-product', label: 'Create Product', shortcut: '⌘P' },
  { id: 'create-variant', label: 'Create Variant', context: 'product-detail' },
  { id: 'go-to-products', label: 'Go to Products' },
  { id: 'go-to-movements', label: 'Go to Movements' },
  { id: 'go-to-warehouses', label: 'Go to Warehouses' },
  { id: 'go-to-reservations', label: 'Go to Reservations' },
  { id: 'search-products', label: 'Search Products', shortcut: '⌘S' },
  { id: 'adjust-stock', label: 'Adjust Stock', context: 'product-detail' },
  { id: 'set-low-stock-alert', label: 'Set Low Stock Alert', context: 'product-detail' },
  { id: 'reserve-stock-for-deal', label: 'Reserve Stock for Deal [ID]' },
  { id: 'connect-to-cinq', label: 'Connect to CINQ' },
  { id: 'export-products-csv', label: 'Export Products CSV' },
  { id: 'sync-shopify', label: 'Sync Shopify' },
];
