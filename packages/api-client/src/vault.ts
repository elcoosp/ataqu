import type { UUID } from "@ataqu/types";
import type {
	UseMutationOptions,
	UseQueryOptions,
} from "@tanstack/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "./client";
import type {
	BulkDeleteRequest,
	BulkStockAdjustRequest,
	CreateProductRequest,
	CreateVariantRequest,
	CreateWarehouseRequest,
	LowStockParams,
	Product,
	ReserveStockRequest,
	StockMovement,
	UpdateProductRequest,
	UpdateStockRequest,
	UpdateVariantRequest,
	UpdateWarehouseRequest,
	Variant,
	Warehouse,
} from "./types";

// ---- Products ----
export const listProducts = (params?: { limit?: number; offset?: number }) =>
	api.get<{ items: Product[]; total: number; limit: number; offset: number }>(
		"/vault/products",
		{ params },
	);
export const searchProducts = (q: string, limit = 10) =>
	api.get<Product[]>("/vault/products", { params: { q, limit } });
export const createProduct = (data: CreateProductRequest) =>
	api.post<Product>("/vault/products", data);
export const getProduct = (id: UUID) =>
	api.get<Product>(`/vault/products/${id}`);
export const updateProduct = (
	id: UUID,
	data: UpdateProductRequest,
	version: number,
) =>
	api.put<Product>(`/vault/products/${id}`, data, {
		headers: { "If-Match": String(version) },
	});
export const deleteProduct = (id: UUID) =>
	api.delete<void>(`/vault/products/${id}`);
export const bulkDeleteProducts = (data: BulkDeleteRequest) =>
	api.post<void>("/vault/products/bulk-delete", data);

// ---- Variants ----
export const listVariants = (params?: { limit?: number; offset?: number }) =>
	api.get<{ items: Variant[]; total: number; limit: number; offset: number }>(
		"/vault/variants",
		{ params },
	);
export const createVariant = (data: CreateVariantRequest) =>
	api.post<Variant>("/vault/variants", data);
export const getVariant = (id: UUID) =>
	api.get<Variant>(`/vault/variants/${id}`);
export const updateVariant = (
	id: UUID,
	data: UpdateVariantRequest,
	version: number,
) =>
	api.put<Variant>(`/vault/variants/${id}`, data, {
		headers: { "If-Match": String(version) },
	});
export const deleteVariant = (id: UUID) =>
	api.delete<void>(`/vault/variants/${id}`);
export const bulkDeleteVariants = (data: BulkDeleteRequest) =>
	api.post<void>("/vault/variants/bulk-delete", data);

// ---- Stock ----
export const updateStock = (
	variantId: UUID,
	data: UpdateStockRequest,
	version: number,
) =>
	api.put<Variant>(`/vault/variants/${variantId}/stock`, data, {
		headers: { "If-Match": String(version) },
	});
export const reserveStock = (
	variantId: UUID,
	data: ReserveStockRequest,
	version: number,
) =>
	api.post<{ variant: Variant; reservation_id: UUID }>(
		`/vault/variants/${variantId}/reserve`,
		data,
		{ headers: { "If-Match": String(version) } },
	);
export const bulkAdjustStock = (data: BulkStockAdjustRequest) =>
	api.post<Variant[]>("/vault/variants/bulk-stock-adjust", data);

// ---- Movements ----
export const listMovements = (
	variantId: UUID,
	params?: { limit?: number; offset?: number },
) =>
	api.get<StockMovement[]>(`/vault/variants/${variantId}/movements`, {
		params,
	});

// ---- Alerts ----
export const getLowStockAlerts = (params?: LowStockParams) =>
	api.get<Variant[]>("/vault/alerts/low-stock", { params });

// ---- Warehouses ----
export const listWarehouses = () => api.get<Warehouse[]>("/vault/warehouses");
export const createWarehouse = (data: CreateWarehouseRequest) =>
	api.post<Warehouse>("/vault/warehouses", data);
export const getWarehouse = (id: UUID) =>
	api.get<Warehouse>(`/vault/warehouses/${id}`);
export const updateWarehouse = (
	id: UUID,
	data: UpdateWarehouseRequest,
	version: number,
) =>
	api.put<Warehouse>(`/vault/warehouses/${id}`, data, {
		headers: { "If-Match": String(version) },
	});
export const deleteWarehouse = (id: UUID) =>
	api.delete<void>(`/vault/warehouses/${id}`);

// ---- Shopify ----
export const shopifyAuthStart = () =>
	api.get<{ url: string }>("/vault/shopify/auth");
export const shopifySync = () => api.post<void>("/vault/shopify/sync");

// ---- React Query hooks ----
export const useListProducts = (
	params?: { limit?: number; offset?: number },
	options?: UseQueryOptions<{
		items: Product[];
		total: number;
		limit: number;
		offset: number;
	}>,
) =>
	useQuery({
		queryKey: ["vault", "products", params],
		queryFn: () => listProducts(params),
		...options,
	});
export const useGetProduct = (id: UUID, options?: UseQueryOptions<Product>) =>
	useQuery({
		queryKey: ["vault", "product", id],
		queryFn: () => getProduct(id),
		...options,
	});
export const useListVariants = (
	params?: { limit?: number; offset?: number },
	options?: UseQueryOptions<{
		items: Variant[];
		total: number;
		limit: number;
		offset: number;
	}>,
) =>
	useQuery({
		queryKey: ["vault", "variants", params],
		queryFn: () => listVariants(params),
		...options,
	});
export const useGetVariant = (id: UUID, options?: UseQueryOptions<Variant>) =>
	useQuery({
		queryKey: ["vault", "variant", id],
		queryFn: () => getVariant(id),
		...options,
	});
export const useListMovements = (
	variantId: UUID,
	params?: { limit?: number; offset?: number },
	options?: UseQueryOptions<StockMovement[]>,
) =>
	useQuery({
		queryKey: ["vault", "movements", variantId, params],
		queryFn: () => listMovements(variantId, params),
		...options,
	});
export const useGetLowStockAlerts = (
	params?: LowStockParams,
	options?: UseQueryOptions<Variant[]>,
) =>
	useQuery({
		queryKey: ["vault", "low-stock", params],
		queryFn: () => getLowStockAlerts(params),
		...options,
	});
export const useListWarehouses = (options?: UseQueryOptions<Warehouse[]>) =>
	useQuery({
		queryKey: ["vault", "warehouses"],
		queryFn: listWarehouses,
		...options,
	});
export const useGetWarehouse = (
	id: UUID,
	options?: UseQueryOptions<Warehouse>,
) =>
	useQuery({
		queryKey: ["vault", "warehouse", id],
		queryFn: () => getWarehouse(id),
		...options,
	});

export const useCreateProduct = (
	options?: UseMutationOptions<Product, Error, CreateProductRequest>,
) => useMutation({ mutationFn: createProduct, ...options });
export const useUpdateProduct = (
	options?: UseMutationOptions<
		Product,
		Error,
		{ id: UUID; data: UpdateProductRequest; version: number }
	>,
) =>
	useMutation({
		mutationFn: ({ id, data, version }) => updateProduct(id, data, version),
		...options,
	});
export const useDeleteProduct = (
	options?: UseMutationOptions<void, Error, UUID>,
) => useMutation({ mutationFn: deleteProduct, ...options });
export const useBulkDeleteProducts = (
	options?: UseMutationOptions<void, Error, BulkDeleteRequest>,
) => useMutation({ mutationFn: bulkDeleteProducts, ...options });

export const useCreateVariant = (
	options?: UseMutationOptions<Variant, Error, CreateVariantRequest>,
) => useMutation({ mutationFn: createVariant, ...options });
export const useUpdateVariant = (
	options?: UseMutationOptions<
		Variant,
		Error,
		{ id: UUID; data: UpdateVariantRequest; version: number }
	>,
) =>
	useMutation({
		mutationFn: ({ id, data, version }) => updateVariant(id, data, version),
		...options,
	});
export const useDeleteVariant = (
	options?: UseMutationOptions<void, Error, UUID>,
) => useMutation({ mutationFn: deleteVariant, ...options });
export const useBulkDeleteVariants = (
	options?: UseMutationOptions<void, Error, BulkDeleteRequest>,
) => useMutation({ mutationFn: bulkDeleteVariants, ...options });

export const useUpdateStock = (
	options?: UseMutationOptions<
		Variant,
		Error,
		{ variantId: UUID; data: UpdateStockRequest; version: number }
	>,
) =>
	useMutation({
		mutationFn: ({ variantId, data, version }) =>
			updateStock(variantId, data, version),
		...options,
	});
export const useReserveStock = (
	options?: UseMutationOptions<
		{ variant: Variant; reservation_id: UUID },
		Error,
		{ variantId: UUID; data: ReserveStockRequest; version: number }
	>,
) =>
	useMutation({
		mutationFn: ({ variantId, data, version }) =>
			reserveStock(variantId, data, version),
		...options,
	});
export const useBulkAdjustStock = (
	options?: UseMutationOptions<Variant[], Error, BulkStockAdjustRequest>,
) => useMutation({ mutationFn: bulkAdjustStock, ...options });

export const useCreateWarehouse = (
	options?: UseMutationOptions<Warehouse, Error, CreateWarehouseRequest>,
) => useMutation({ mutationFn: createWarehouse, ...options });
export const useUpdateWarehouse = (
	options?: UseMutationOptions<
		Warehouse,
		Error,
		{ id: UUID; data: UpdateWarehouseRequest; version: number }
	>,
) =>
	useMutation({
		mutationFn: ({ id, data, version }) => updateWarehouse(id, data, version),
		...options,
	});
export const useDeleteWarehouse = (
	options?: UseMutationOptions<void, Error, UUID>,
) => useMutation({ mutationFn: deleteWarehouse, ...options });
