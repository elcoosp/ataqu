import { shopifyAuthStart, shopifySync } from "@ataqu/api-client";
import type { UseMutationOptions } from "@tanstack/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { ShopifyIntegration, ShopifySyncLog } from "@/api/shopify-api";
import {
	disconnectShopify,
	getShopifyIntegrations,
	getShopifySyncLogs,
} from "@/api/shopify-api";

/** Polling interval: 10 seconds. Bounded and cancelled on unmount by TanStack Query. */
const SHOPIFY_POLL_INTERVAL_MS = 10_000;

export const useShopifyIntegrations = () =>
	useQuery<ShopifyIntegration[]>({
		queryKey: ["vault", "shopify", "integrations"],
		queryFn: getShopifyIntegrations,
		retry: false,
		staleTime: 5000,
		refetchInterval: SHOPIFY_POLL_INTERVAL_MS,
		refetchIntervalInBackground: false,
		refetchOnWindowFocus: true,
	});

export const useShopifySyncLogs = () =>
	useQuery<ShopifySyncLog[]>({
		queryKey: ["vault", "shopify", "sync-logs"],
		queryFn: () => getShopifySyncLogs({ limit: 20 }),
		retry: false,
		staleTime: 5000,
		refetchInterval: SHOPIFY_POLL_INTERVAL_MS,
		refetchIntervalInBackground: false,
		refetchOnWindowFocus: true,
	});

export const useShopifyAuthStart = (
	options?: UseMutationOptions<{ url: string }, Error>,
) =>
	useMutation({
		mutationFn: shopifyAuthStart,
		...options,
	});

export const useShopifySync = (options?: UseMutationOptions<void, Error>) =>
	useMutation({
		mutationFn: shopifySync,
		...options,
	});

export const useShopifyDisconnect = (
	options?: UseMutationOptions<void, Error>,
) =>
	useMutation({
		mutationFn: disconnectShopify,
		...options,
	});
