import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";
import { api } from "./client";

export interface AmazonStatus {
	connected: boolean;
	marketplace_id?: string;
	seller_id?: string;
	last_synced_at?: string;
}

export interface AmazonConnectRequest {
	marketplace_id: string;
	seller_id: string;
	refresh_token: string;
}

/** Fetch the tenant's Amazon Seller Central connection status (spec 9 / P1). */
export const getAmazonStatus = async (): Promise<AmazonStatus> => {
	return api.get<AmazonStatus>("/vault/amazon/status");
};

/** Connect an Amazon Seller Central account via LWA credentials. */
export const connectAmazon = async (data: AmazonConnectRequest): Promise<void> => {
	await api.post<void>("/vault/amazon/connect", data);
};

/** Disconnect the Amazon Seller Central account. */
export const disconnectAmazon = async (): Promise<void> => {
	await api.post<void>("/vault/amazon/disconnect");
};

/** Trigger a manual inventory sync. */
export const syncAmazon = async (): Promise<void> => {
	await api.post<void>("/vault/amazon/sync");
};

export const useAmazonStatus = () =>
	useQuery({
		queryKey: ["amazon-status"],
		queryFn: getAmazonStatus,
		staleTime: 15_000,
	});

export const useConnectAmazon = (
	options?: UseMutationOptions<void, Error, AmazonConnectRequest>,
) => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: AmazonConnectRequest) => connectAmazon(data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["amazon-status"] });
		},
		...options,
	});
};

export const useDisconnectAmazon = (
	options?: UseMutationOptions<void, Error>,
) => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: () => disconnectAmazon(),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["amazon-status"] });
		},
		...options,
	});
};

export const useSyncAmazon = (options?: UseMutationOptions<void, Error>) => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: () => syncAmazon(),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["amazon-status"] });
		},
		...options,
	});
};
