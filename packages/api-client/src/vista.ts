import { UUID } from '@ataqu/types';
import { api } from './client';
import type {
  Dashboard,
  CreateDashboardRequest,
  UpdateDashboardRequest,
  KpiSummary,
  DataPoint,
  DrillDownRequest,
  CombineDataRequest,
  CrossAppQuery,
} from './types';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';

// ---- Dashboards ----
export const listDashboards = () =>
  api.get<Dashboard[]>('/vista/dashboards');
export const createDashboard = (data: CreateDashboardRequest) =>
  api.post<Dashboard>('/vista/dashboards', data);
export const getDashboard = (id: UUID) =>
  api.get<Dashboard>(`/vista/dashboards/${id}`);
export const updateDashboard = (id: UUID, data: UpdateDashboardRequest) =>
  api.put<Dashboard>(`/vista/dashboards/${id}`, data);
export const deleteDashboard = (id: UUID) =>
  api.delete<void>(`/vista/dashboards/${id}`);

// ---- KPIs ----
export const getKpis = () => api.get<KpiSummary>('/vista/kpis');

// ---- Data Points ----
export const getDataPoints = (metric: string, params?: { limit?: number }) =>
  api.get<DataPoint[]>(`/vista/data-points/${metric}`, { params });

// ---- Drill-down ----
export const drillDown = (data: DrillDownRequest) =>
  api.post<Record<string, unknown>[]>('/vista/drill-down', data);

// ---- Cross-app ----
export const getCrossAppView = (params: CrossAppQuery) =>
  api.get<Record<string, unknown>[]>('/vista/cross-app', { params });

// ---- Combine ----
export const combineData = (data: CombineDataRequest) =>
  api.post<Record<string, unknown>[]>('/vista/combine', data);

// ---- React Query hooks ----
export const useListDashboards = (options?: UseQueryOptions<Dashboard[]>) =>
  useQuery({ queryKey: ['vista', 'dashboards'], queryFn: listDashboards, ...options });
export const useGetDashboard = (id: UUID, options?: UseQueryOptions<Dashboard>) =>
  useQuery({ queryKey: ['vista', 'dashboard', id], queryFn: () => getDashboard(id), ...options });
export const useGetKpis = (options?: UseQueryOptions<KpiSummary>) =>
  useQuery({ queryKey: ['vista', 'kpis'], queryFn: getKpis, ...options });
export const useGetDataPoints = (metric: string, params?: { limit?: number }, options?: UseQueryOptions<DataPoint[]>) =>
  useQuery({
    queryKey: ['vista', 'data-points', metric, params],
    queryFn: () => getDataPoints(metric, params),
    ...options,
  });
export const useGetCrossAppView = (params: CrossAppQuery, options?: UseQueryOptions<Record<string, unknown>[]>) =>
  useQuery({
    queryKey: ['vista', 'cross-app', params],
    queryFn: () => getCrossAppView(params),
    ...options,
  });

export const useCreateDashboard = (options?: UseMutationOptions<Dashboard, Error, CreateDashboardRequest>) =>
  useMutation({ mutationFn: createDashboard, ...options });
export const useUpdateDashboard = (options?: UseMutationOptions<Dashboard, Error, { id: UUID; data: UpdateDashboardRequest }>) =>
  useMutation({
    mutationFn: ({ id, data }) => updateDashboard(id, data),
    ...options,
  });
export const useDeleteDashboard = (options?: UseMutationOptions<void, Error, UUID>) =>
  useMutation({ mutationFn: deleteDashboard, ...options });
export const useDrillDown = (options?: UseMutationOptions<Record<string, unknown>[], Error, DrillDownRequest>) =>
  useMutation({ mutationFn: drillDown, ...options });
export const useCombineData = (options?: UseMutationOptions<Record<string, unknown>[], Error, CombineDataRequest>) =>
  useMutation({ mutationFn: combineData, ...options });
