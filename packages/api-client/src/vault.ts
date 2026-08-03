import { api } from './client';
import type { VaultProduct, VaultVariant } from './types';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';

// ---- Products ----
export const listProducts = () => api.get<VaultProduct[]>('/products');
export const createProduct = (data: VaultProduct) => api.post<VaultProduct>('/products', data);
export const getProduct = (id: string) => api.get<VaultProduct>(`/products/${id}`);
export const updateProduct = (id: string, data: VaultProduct) =>
  api.put<VaultProduct>(`/products/${id}`, data);

// ---- Variants ----
export const listVariants = () => api.get<VaultVariant[]>('/variants');
export const createVariant = (data: VaultVariant) => api.post<VaultVariant>('/variants', data);
export const getVariant = (id: string) => api.get<VaultVariant>(`/variants/${id}`);
export const updateVariant = (id: string, data: VaultVariant) =>
  api.put<VaultVariant>(`/variants/${id}`, data);

// ---- Stock ----
export const getStock = (params?: { productId?: string }) =>
  api.get<Record<string, number>>('/stock', { params });
export const updateStock = (data: { variantId: string; delta: number }) =>
  api.put<void>('/stock', data);

// ---- Movements ----
export const listMovements = () => api.get<unknown[]>('/movements');
export const recordMovement = (data: unknown) => api.post<unknown>('/movements', data);

// ---- Alerts ----
export const listAlerts = () => api.get<unknown[]>('/alerts');

// ---- React Query hooks ----
export const useListProducts = (options?: UseQueryOptions<VaultProduct[]>) =>
  useQuery({ queryKey: ['vault', 'products'], queryFn: listProducts, ...options });
export const useGetProduct = (id: string, options?: UseQueryOptions<VaultProduct>) =>
  useQuery({ queryKey: ['vault', 'product', id], queryFn: () => getProduct(id), ...options });
export const useListVariants = (options?: UseQueryOptions<VaultVariant[]>) =>
  useQuery({ queryKey: ['vault', 'variants'], queryFn: listVariants, ...options });
export const useGetVariant = (id: string, options?: UseQueryOptions<VaultVariant>) =>
  useQuery({ queryKey: ['vault', 'variant', id], queryFn: () => getVariant(id), ...options });
export const useGetStock = (params?: { productId?: string }, options?: UseQueryOptions<Record<string, number>>) =>
  useQuery({
    queryKey: ['vault', 'stock', params],
    queryFn: () => getStock(params),
    ...options,
  });
export const useListMovements = (options?: UseQueryOptions<unknown[]>) =>
  useQuery({ queryKey: ['vault', 'movements'], queryFn: listMovements, ...options });
export const useListAlerts = (options?: UseQueryOptions<unknown[]>) =>
  useQuery({ queryKey: ['vault', 'alerts'], queryFn: listAlerts, ...options });

export const useCreateProduct = (options?: UseMutationOptions<VaultProduct, Error, VaultProduct>) =>
  useMutation({ mutationFn: createProduct, ...options });
export const useUpdateProduct = (options?: UseMutationOptions<VaultProduct, Error, { id: string; data: VaultProduct }>) =>
  useMutation({
    mutationFn: ({ id, data }) => updateProduct(id, data),
    ...options,
  });
export const useCreateVariant = (options?: UseMutationOptions<VaultVariant, Error, VaultVariant>) =>
  useMutation({ mutationFn: createVariant, ...options });
export const useUpdateVariant = (options?: UseMutationOptions<VaultVariant, Error, { id: string; data: VaultVariant }>) =>
  useMutation({
    mutationFn: ({ id, data }) => updateVariant(id, data),
    ...options,
  });
export const useUpdateStock = (options?: UseMutationOptions<void, Error, { variantId: string; delta: number }>) =>
  useMutation({ mutationFn: updateStock, ...options });
export const useRecordMovement = (options?: UseMutationOptions<unknown, Error, unknown>) =>
  useMutation({ mutationFn: recordMovement, ...options });
