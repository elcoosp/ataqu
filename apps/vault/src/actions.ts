import { i18n } from '@lingui/core';
import { useNavigate } from '@tanstack/react-router';

/**
 * Safely translates a message using Lingui.
 * Falls back to the default message if no locale is activated
 * (e.g., in test environments or before I18nProvider mounts).
 */
const translate = (id: string, defaultMessage: string): string => {
  try {
    return i18n._({ id, message: defaultMessage });
  } catch {
    // Locale not activated — return the default message as fallback.
    // In production, I18nProvider activates the locale before any
    // component renders, so this path is only hit in tests.
    return defaultMessage;
  }
};

export interface VaultAction {
  id: string;
  label: string;
  shortcut?: string;
  context?: string;
  url: string;
  handler?: () => void;
}

export interface VaultCommandItem {
  id: string;
  title: string;
  url: string;
}

/**
 * All 13 command palette actions for VAULT.
 * Labels use Lingui for internationalization with safe fallback.
 */
export const getVaultActions = (): VaultAction[] => [
  {
    id: 'create-product',
    label: translate('vault.action.createProduct', 'Create Product'),
    shortcut: '⌘P',
    url: '/products?create=product',
  },
  {
    id: 'create-variant',
    label: translate('vault.action.createVariant', 'Create Variant'),
    context: 'product-detail',
    url: '/products?create=variant',
  },
  {
    id: 'go-to-products',
    label: translate('vault.action.goToProducts', 'Go to Products'),
    url: '/products',
  },
  {
    id: 'go-to-movements',
    label: translate('vault.action.goToMovements', 'Go to Movements'),
    url: '/movements',
  },
  {
    id: 'go-to-warehouses',
    label: translate('vault.action.goToWarehouses', 'Go to Warehouses'),
    url: '/warehouses',
  },
  {
    id: 'go-to-reservations',
    label: translate('vault.action.goToReservations', 'Go to Reservations'),
    url: '/reservations',
  },
  {
    id: 'search-products',
    label: translate('vault.action.searchProducts', 'Search Products'),
    shortcut: '⌘S',
    url: '/products?focus=search',
  },
  {
    id: 'adjust-stock',
    label: translate('vault.action.adjustStock', 'Adjust Stock'),
    context: 'product-detail',
    url: '/products?adjust=stock',
  },
  {
    id: 'set-low-stock-alert',
    label: translate('vault.action.setLowStockAlert', 'Set Low Stock Alert'),
    context: 'product-detail',
    url: '/products?set-low-stock-alert=true',
  },
  {
    id: 'reserve-stock-for-deal',
    label: translate('vault.action.reserveStockForDeal', 'Reserve Stock for Deal [ID]'),
    url: '/reservations?reserve=stock',
  },
  {
    id: 'connect-to-cinq',
    label: translate('vault.action.connectToCinq', 'Connect to CINQ'),
    url: '/products?connect=cinq',
  },
  {
    id: 'export-products-csv',
    label: translate('vault.action.exportProductsCsv', 'Export Products CSV'),
    url: '/products?export=csv',
  },
  {
    id: 'sync-shopify',
    label: translate('vault.action.syncShopify', 'Sync Shopify'),
    url: '/products?sync=shopify',
  },
];

/**
 * Search function for the CommandPalette.
 * Filters vault actions by query and returns items the palette can navigate to.
 */
export const searchVaultActions = async (query: string): Promise<VaultCommandItem[]> => {
  const normalizedQuery = query.trim().toLowerCase();
  const actions = getVaultActions();

  return actions
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

/**
 * Hook that returns vault actions with navigation handlers wired.
 * Use this in components that need to trigger actions programmatically.
 */
export const useVaultActions = () => {
  const navigate = useNavigate();
  const actions = getVaultActions();

  return actions.map((action) => ({
    ...action,
    handler: () => navigate({ to: action.url }),
  }));
};
