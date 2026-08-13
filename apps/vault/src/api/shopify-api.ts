import { api } from "@ataqu/api-client";
import type { UUID } from "@ataqu/types";

export interface ShopifyIntegration {
	id: UUID;
	shop_domain: string;
	status: "active" | "error" | "disconnected";
	last_synced_at?: string;
	product_count?: number;
	created_at: string;
}

export interface ShopifySyncLog {
	id: UUID;
	sync_type: string;
	status: string;
	product_id?: UUID;
	shopify_id?: number;
	error_message?: string;
	created_at: string;
}

export const getShopifyIntegrations = () =>
	api.get<ShopifyIntegration[]>("/vault/shopify/integrations");

export const getShopifySyncLogs = (params?: { limit?: number }) =>
	api.get<ShopifySyncLog[]>("/vault/shopify/sync-logs", { params });

export const disconnectShopify = () =>
	api.delete<void>("/vault/shopify/disconnect");
