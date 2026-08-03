import { api } from './client';
import type {
  DashboardResponse,
  KpiQuery,
  KpiResponse,
  ChartQuery,
  ChartResponse,
  FilterRequest,
  FilterResponse,
  ExportRequest,
  ExportResponse,
} from './types';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';

export const getDashboard = (id: string) =>
  api.get<DashboardResponse>(`/dashboards/${id}`);
export const getKpis = (params?: KpiQuery) =>
  api.get<KpiResponse[]>('/kpis', { params });
export const getChart = (id: string, params?: ChartQuery) =>
  api.get<ChartResponse>(`/charts/${id}`, { params });
export const applyFilters = (data: FilterRequest) =>
  api.post<FilterResponse>('/filters', data);
export const exportData = (data: ExportRequest) =>
  api.post<ExportResponse>('/export', data);

// SSE stream is not a REST call; handled via useSSE hook.

// ---- React Query hooks ----
export const useGetDashboard = (id: string, options?: UseQueryOptions<DashboardResponse>) =>
  useQuery({ queryKey: ['vista', 'dashboard', id], queryFn: () => getDashboard(id), ...options });
export const useGetKpis = (params?: KpiQuery, options?: UseQueryOptions<KpiResponse[]>) =>
  useQuery({
    queryKey: ['vista', 'kpis', params],
    queryFn: () => getKpis(params),
    ...options,
  });
export const useGetChart = (id: string, params?: ChartQuery, options?: UseQueryOptions<ChartResponse>) =>
  useQuery({
    queryKey: ['vista', 'chart', id, params],
    queryFn: () => getChart(id, params),
    ...options,
  });

export const useApplyFilters = (options?: UseMutationOptions<FilterResponse, Error, FilterRequest>) =>
  useMutation({ mutationFn: applyFilters, ...options });
export const useExportData = (options?: UseMutationOptions<ExportResponse, Error, ExportRequest>) =>
  useMutation({ mutationFn: exportData, ...options });
