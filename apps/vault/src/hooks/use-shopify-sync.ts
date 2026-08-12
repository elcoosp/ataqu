import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getShopifyIntegrations,
  getShopifySyncLogs,
  shopifyAuthStart,
  shopifyDisconnect,
  shopifySync,
} from '@/api/shopify-api';
import { useShopifyStore } from '@/stores/shopify-store';

export const useShopifyIntegrations = () => {
  return useQuery({
    queryKey: ['vault', 'shopify', 'integrations'],
    queryFn: getShopifyIntegrations,
  });
};

export const useShopifySyncLogs = () => {
  return useQuery({
    queryKey: ['vault', 'shopify', 'sync-logs'],
    queryFn: () => getShopifySyncLogs({ limit: 20 }),
  });
};

export const useShopifyAuthStart = () => {
  return useMutation({
    mutationFn: shopifyAuthStart,
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });
};

export const useShopifySync = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: shopifySync,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vault', 'shopify'] });
    },
  });
};

export const useShopifyDisconnect = () => {
  const queryClient = useQueryClient();
  const { setConnection } = useShopifyStore();
  return useMutation({
    mutationFn: shopifyDisconnect,
    onSuccess: () => {
      setConnection(false, null);
      queryClient.invalidateQueries({ queryKey: ['vault', 'shopify'] });
    },
  });
};
