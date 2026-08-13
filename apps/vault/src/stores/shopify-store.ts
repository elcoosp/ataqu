import { create } from 'zustand';

interface ShopifyState {
  isConnected: boolean;
  shopDomain: string | null;
  lastSyncedAt: string | null;
  productCount: number;
  errorLog: Array<{
    id: string;
    timestamp: string;
    name: string;
    error: string;
  }>;
  setConnection: (connected: boolean, shopDomain: string | null) => void;
  setSyncStatus: (lastSyncedAt: string, productCount: number) => void;
  setErrorLog: (errors: ShopifyState['errorLog']) => void;
}

export const useShopifyStore = create<ShopifyState>((set) => ({
  isConnected: false,
  shopDomain: null,
  lastSyncedAt: null,
  productCount: 0,
  errorLog: [],
  setConnection: (isConnected, shopDomain) => set({ isConnected, shopDomain }),
  setSyncStatus: (lastSyncedAt, productCount) => set({ lastSyncedAt, productCount }),
  setErrorLog: (errorLog) => set({ errorLog }),
}));
