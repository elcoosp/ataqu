import { UUID } from '@ataqu/types';
import { api } from './client';
import type {
  ContactResponse,
  CreateContactRequest,
  UpdateContactRequest,
  DealResponse,
  CreateDealRequest,
  UpdateDealRequest,
  PipelineStageResponse,
  CreatePipelineStageRequest,
  UpdatePipelineStageRequest,
  ActivityResponse,
  CreateActivityRequest,
  ListActivitiesParams,
  TaskResponse,
  CreateTaskRequest,
  UpdateTaskRequest,
  SearchParams,
  ImportCsvResult,
  TrackEmailRequest,
  BulkDeleteRequest,
} from './types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';

// ---- Contacts ----
export const listContacts = (params?: { limit?: number; offset?: number }) =>
  api.get<ContactResponse[]>('/cinq/contacts', { params });
export const createContact = (data: CreateContactRequest) =>
  api.post<ContactResponse>('/cinq/contacts', data);
export const getContact = (id: UUID) => api.get<ContactResponse>(`/cinq/contacts/${id}`);
export const updateContact = (id: UUID, data: UpdateContactRequest) =>
  api.put<ContactResponse>(`/cinq/contacts/${id}`, data);
export const deleteContact = (id: UUID) => api.delete<void>(`/cinq/contacts/${id}`);
export const bulkDeleteContacts = (data: BulkDeleteRequest) =>
  api.post<void>('/cinq/contacts/bulk-delete', data);

// ---- Deals ----
export const listDeals = (params?: { limit?: number; offset?: number }) =>
  api.get<DealResponse[]>('/cinq/deals', { params });
export const createDeal = (data: CreateDealRequest) =>
  api.post<DealResponse>('/cinq/deals', data);
export const getDeal = (id: UUID) => api.get<DealResponse>(`/cinq/deals/${id}`);
export const updateDeal = (id: UUID, data: UpdateDealRequest) =>
  api.put<DealResponse>(`/cinq/deals/${id}`, data);
export const deleteDeal = (id: UUID) => api.delete<void>(`/cinq/deals/${id}`);
export const bulkDeleteDeals = (data: BulkDeleteRequest) =>
  api.post<void>('/cinq/deals/bulk-delete', data);

// ---- Pipeline Stages ----
export const listPipelineStages = () =>
  api.get<PipelineStageResponse[]>('/cinq/pipeline/stages');
export const createPipelineStage = (data: CreatePipelineStageRequest) =>
  api.post<PipelineStageResponse>('/cinq/pipeline/stages', data);
export const updatePipelineStage = (id: UUID, data: UpdatePipelineStageRequest) =>
  api.put<PipelineStageResponse>(`/cinq/pipeline/stages/${id}`, data);
export const deletePipelineStage = (id: UUID) =>
  api.delete<void>(`/cinq/pipeline/stages/${id}`);

// ---- Activities ----
export const listActivities = (params?: ListActivitiesParams) =>
  api.get<ActivityResponse[]>('/cinq/activities', { params });
export const createActivity = (data: CreateActivityRequest) =>
  api.post<ActivityResponse>('/cinq/activities', data);
export const getActivity = (id: UUID) =>
  api.get<ActivityResponse>(`/cinq/activities/${id}`);

// ---- Tasks ----
export const listTasks = (params?: { limit?: number; offset?: number }) =>
  api.get<TaskResponse[]>('/cinq/tasks', { params });
export const createTask = (data: CreateTaskRequest) =>
  api.post<TaskResponse>('/cinq/tasks', data);
export const getTask = (id: UUID) => api.get<TaskResponse>(`/cinq/tasks/${id}`);
export const updateTask = (id: UUID, data: UpdateTaskRequest) =>
  api.put<TaskResponse>(`/cinq/tasks/${id}`, data);
export const deleteTask = (id: UUID) => api.delete<void>(`/cinq/tasks/${id}`);
export const bulkDeleteTasks = (data: BulkDeleteRequest) =>
  api.post<void>('/cinq/tasks/bulk-delete', data);

export const listContactTasks = (contactId: UUID, params?: { limit?: number; offset?: number }) =>
  api.get<TaskResponse[]>(`/cinq/contacts/${contactId}/tasks`, { params });

// ---- Search ----
export const searchContacts = (params: SearchParams) =>
  api.get<ContactResponse[]>('/cinq/search', { params });
export const searchByCustomField = (field: string, value: string) =>
  api.get<ContactResponse[]>('/cinq/search/custom', { params: { field, value } });
export const searchCustomFieldsCross = (params: { q: string; limit?: number }) =>
  api.get<ContactResponse[]>('/cinq/search/custom/cross', { params });

// ---- CSV Import/Export ----
export const importCsv = (formData: FormData) =>
  api.post<ImportCsvResult>('/cinq/csv/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const exportCsv = () =>
  api.get<Blob>('/cinq/csv/export', { responseType: 'blob' });

// ---- Email Tracking ----
export const trackEmail = (data: TrackEmailRequest) =>
  api.post<void>('/cinq/email/track', data);
export const getContactTracking = (contactId: UUID, params?: { limit?: number; offset?: number }) =>
  api.get<{ items: any[]; total: number }>(`/cinq/contacts/${contactId}/tracking`, { params });

// ---- React Query hooks ----
export const useListContacts = (params?: { limit?: number; offset?: number }, options?: UseQueryOptions<ContactResponse[]>) =>
  useQuery({ queryKey: ['cinq', 'contacts', params], queryFn: () => listContacts(params), ...options });
export const useGetContact = (id: UUID, options?: UseQueryOptions<ContactResponse>) =>
  useQuery({ queryKey: ['cinq', 'contact', id], queryFn: () => getContact(id), ...options });
export const useListDeals = (params?: { limit?: number; offset?: number }, options?: UseQueryOptions<DealResponse[]>) =>
  useQuery({ queryKey: ['cinq', 'deals', params], queryFn: () => listDeals(params), ...options });
export const useGetDeal = (id: UUID, options?: UseQueryOptions<DealResponse>) =>
  useQuery({ queryKey: ['cinq', 'deal', id], queryFn: () => getDeal(id), ...options });
export const useListPipelineStages = (options?: UseQueryOptions<PipelineStageResponse[]>) =>
  useQuery({ queryKey: ['cinq', 'pipeline'], queryFn: listPipelineStages, ...options });
export const useListActivities = (params?: ListActivitiesParams, options?: UseQueryOptions<ActivityResponse[]>) =>
  useQuery({ queryKey: ['cinq', 'activities', params], queryFn: () => listActivities(params), ...options });
export const useGetActivity = (id: UUID, options?: UseQueryOptions<ActivityResponse>) =>
  useQuery({ queryKey: ['cinq', 'activity', id], queryFn: () => getActivity(id), ...options });
export const useListTasks = (params?: { limit?: number; offset?: number }, options?: UseQueryOptions<TaskResponse[]>) =>
  useQuery({ queryKey: ['cinq', 'tasks', params], queryFn: () => listTasks(params), ...options });
export const useGetTask = (id: UUID, options?: UseQueryOptions<TaskResponse>) =>
  useQuery({ queryKey: ['cinq', 'task', id], queryFn: () => getTask(id), ...options });
export const useListContactTasks = (contactId: UUID, params?: { limit?: number; offset?: number }, options?: UseQueryOptions<TaskResponse[]>) =>
  useQuery({
    queryKey: ['cinq', 'contact-tasks', contactId, params],
    queryFn: () => listContactTasks(contactId, params),
    ...options,
  });
export const useSearchContacts = (params: SearchParams, options?: UseQueryOptions<ContactResponse[]>) =>
  useQuery({
    queryKey: ['cinq', 'search', params],
    queryFn: () => searchContacts(params),
    ...options,
  });
export const useSearchByCustomField = (field: string, value: string, options?: UseQueryOptions<ContactResponse[]>) =>
  useQuery({
    queryKey: ['cinq', 'search-custom', field, value],
    queryFn: () => searchByCustomField(field, value),
    ...options,
  });
export const useSearchCustomFieldsCross = (params: { q: string; limit?: number }, options?: UseQueryOptions<ContactResponse[]>) =>
  useQuery({
    queryKey: ['cinq', 'search-cross', params],
    queryFn: () => searchCustomFieldsCross(params),
    ...options,
  });

export const useCreateContact = (options?: UseMutationOptions<ContactResponse, Error, CreateContactRequest>) =>
  useMutation({ mutationFn: createContact, ...options });
export const useUpdateContact = (options?: UseMutationOptions<ContactResponse, Error, { id: UUID; data: UpdateContactRequest }>) =>
  useMutation({
    mutationFn: ({ id, data }) => updateContact(id, data),
    ...options,
  });
export const useDeleteContact = (options?: UseMutationOptions<void, Error, UUID>) =>
  useMutation({ mutationFn: deleteContact, ...options });
export const useBulkDeleteContacts = (options?: UseMutationOptions<void, Error, BulkDeleteRequest>) =>
  useMutation({ mutationFn: bulkDeleteContacts, ...options });

export const useCreateDeal = (options?: UseMutationOptions<DealResponse, Error, CreateDealRequest>) =>
  useMutation({ mutationFn: createDeal, ...options });
export const useUpdateDeal = (options?: UseMutationOptions<DealResponse, Error, { id: UUID; data: UpdateDealRequest }>) =>
  useMutation({
    mutationFn: ({ id, data }) => updateDeal(id, data),
    ...options,
  });
export const useDeleteDeal = (options?: UseMutationOptions<void, Error, UUID>) =>
  useMutation({ mutationFn: deleteDeal, ...options });
export const useBulkDeleteDeals = (options?: UseMutationOptions<void, Error, BulkDeleteRequest>) =>
  useMutation({ mutationFn: bulkDeleteDeals, ...options });

export const useCreatePipelineStage = (options?: UseMutationOptions<PipelineStageResponse, Error, CreatePipelineStageRequest>) =>
  useMutation({ mutationFn: createPipelineStage, ...options });
export const useUpdatePipelineStage = (options?: UseMutationOptions<PipelineStageResponse, Error, { id: UUID; data: UpdatePipelineStageRequest }>) =>
  useMutation({
    mutationFn: ({ id, data }) => updatePipelineStage(id, data),
    ...options,
  });
export const useDeletePipelineStage = (options?: UseMutationOptions<void, Error, UUID>) =>
  useMutation({ mutationFn: deletePipelineStage, ...options });

export const useCreateActivity = (options?: UseMutationOptions<ActivityResponse, Error, CreateActivityRequest>) =>
  useMutation({ mutationFn: createActivity, ...options });

export const useCreateTask = (options?: UseMutationOptions<TaskResponse, Error, CreateTaskRequest>) =>
  useMutation({ mutationFn: createTask, ...options });
export const useUpdateTask = (options?: UseMutationOptions<TaskResponse, Error, { id: UUID; data: UpdateTaskRequest }>) =>
  useMutation({
    mutationFn: ({ id, data }) => updateTask(id, data),
    ...options,
  });
export const useDeleteTask = (options?: UseMutationOptions<void, Error, UUID>) =>
  useMutation({ mutationFn: deleteTask, ...options });
export const useBulkDeleteTasks = (options?: UseMutationOptions<void, Error, BulkDeleteRequest>) =>
  useMutation({ mutationFn: bulkDeleteTasks, ...options });

export const useImportCsv = (options?: UseMutationOptions<ImportCsvResult, Error, FormData>) =>
  useMutation({ mutationFn: importCsv, ...options });
export const useExportCsv = (options?: UseMutationOptions<Blob, Error>) =>
  useMutation({ mutationFn: exportCsv, ...options });

export const useTrackEmail = (options?: UseMutationOptions<void, Error, TrackEmailRequest>) =>
  useMutation({ mutationFn: trackEmail, ...options });
export const useGetContactTracking = (contactId: UUID, params?: { limit?: number; offset?: number }, options?: UseQueryOptions<{ items: any[]; total: number }>) =>
  useQuery({
    queryKey: ['cinq', 'tracking', contactId, params],
    queryFn: () => getContactTracking(contactId, params),
    ...options,
  });
