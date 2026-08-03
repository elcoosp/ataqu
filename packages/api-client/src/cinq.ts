import { api } from './client';
import type {
  ContactResponse,
  DealResponse,
  PipelineStageResponse,
  ActivityResponse,
  CreateContactRequest,
  UpdateContactRequest,
  CreateDealRequest,
  UpdateDealRequest,
  CreatePipelineStageRequest,
  UpdatePipelineStageRequest,
  CreateActivityRequest,
  ListActivitiesParams,
  SearchParams,
  ImportCsvResult,
  TrackEmailRequest,
} from './types';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';

// ---- Contacts ----
export const createContact = (data: CreateContactRequest) =>
  api.post<ContactResponse>('/contacts', data);
export const listContacts = () =>
  api.get<ContactResponse[]>('/contacts');
export const getContact = (id: string) =>
  api.get<ContactResponse>(`/contacts/${id}`);
export const updateContact = (id: string, data: UpdateContactRequest) =>
  api.put<ContactResponse>(`/contacts/${id}`, data);
export const deleteContact = (id: string) =>
  api.delete<void>(`/contacts/${id}`);

// ---- Deals ----
export const createDeal = (data: CreateDealRequest) =>
  api.post<DealResponse>('/deals', data);
export const listDeals = () =>
  api.get<DealResponse[]>('/deals');
export const getDeal = (id: string) =>
  api.get<DealResponse>(`/deals/${id}`);
export const updateDeal = (id: string, data: UpdateDealRequest) =>
  api.put<DealResponse>(`/deals/${id}`, data);
export const deleteDeal = (id: string) =>
  api.delete<void>(`/deals/${id}`);

// ---- Pipeline Stages ----
export const listPipelineStages = () =>
  api.get<PipelineStageResponse[]>('/pipeline/stages');
export const createPipelineStage = (data: CreatePipelineStageRequest) =>
  api.post<PipelineStageResponse>('/pipeline/stages', data);
export const updatePipelineStage = (id: string, data: UpdatePipelineStageRequest) =>
  api.put<PipelineStageResponse>(`/pipeline/stages/${id}`, data);
export const deletePipelineStage = (id: string) =>
  api.delete<void>(`/pipeline/stages/${id}`);

// ---- Activities ----
export const createActivity = (data: CreateActivityRequest) =>
  api.post<ActivityResponse>('/activities', data);
export const listActivities = (params?: ListActivitiesParams) =>
  api.get<ActivityResponse[]>('/activities', { params });
export const getActivity = (id: string) =>
  api.get<ActivityResponse>(`/activities/${id}`);

// ---- Search ----
export const searchContacts = (params: SearchParams) =>
  api.get<ContactResponse[]>('/search', { params });

// ---- CSV ----
export const importCsv = (formData: FormData) =>
  api.post<ImportCsvResult>('/csv/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const exportCsv = () =>
  api.get<Blob>('/csv/export', { responseType: 'blob' });

// ---- Email Tracking ----
export const trackEmail = (data: TrackEmailRequest) =>
  api.post<void>('/email/track', data);

// ---- React Query hooks ----
export const useListContacts = (options?: UseQueryOptions<ContactResponse[]>) =>
  useQuery({ queryKey: ['cinq', 'contacts'], queryFn: listContacts, ...options });
export const useGetContact = (id: string, options?: UseQueryOptions<ContactResponse>) =>
  useQuery({ queryKey: ['cinq', 'contact', id], queryFn: () => getContact(id), ...options });
export const useListDeals = (options?: UseQueryOptions<DealResponse[]>) =>
  useQuery({ queryKey: ['cinq', 'deals'], queryFn: listDeals, ...options });
export const useListPipelineStages = (options?: UseQueryOptions<PipelineStageResponse[]>) =>
  useQuery({ queryKey: ['cinq', 'pipeline'], queryFn: listPipelineStages, ...options });
export const useSearchContacts = (params: SearchParams, options?: UseQueryOptions<ContactResponse[]>) =>
  useQuery({
    queryKey: ['cinq', 'search', params],
    queryFn: () => searchContacts(params),
    ...options,
  });

export const useCreateContact = (options?: UseMutationOptions<ContactResponse, Error, CreateContactRequest>) =>
  useMutation({ mutationFn: createContact, ...options });
export const useUpdateContact = (options?: UseMutationOptions<ContactResponse, Error, { id: string; data: UpdateContactRequest }>) =>
  useMutation({
    mutationFn: ({ id, data }) => updateContact(id, data),
    ...options,
  });
export const useDeleteContact = (options?: UseMutationOptions<void, Error, string>) =>
  useMutation({
    mutationFn: deleteContact,
    ...options,
  });
export const useCreateDeal = (options?: UseMutationOptions<DealResponse, Error, CreateDealRequest>) =>
  useMutation({ mutationFn: createDeal, ...options });
export const useUpdateDeal = (options?: UseMutationOptions<DealResponse, Error, { id: string; data: UpdateDealRequest }>) =>
  useMutation({
    mutationFn: ({ id, data }) => updateDeal(id, data),
    ...options,
  });
export const useDeleteDeal = (options?: UseMutationOptions<void, Error, string>) =>
  useMutation({ mutationFn: deleteDeal, ...options });
export const useCreatePipelineStage = (options?: UseMutationOptions<PipelineStageResponse, Error, CreatePipelineStageRequest>) =>
  useMutation({ mutationFn: createPipelineStage, ...options });
export const useCreateActivity = (options?: UseMutationOptions<ActivityResponse, Error, CreateActivityRequest>) =>
  useMutation({ mutationFn: createActivity, ...options });
export const useImportCsv = (options?: UseMutationOptions<ImportCsvResult, Error, FormData>) =>
  useMutation({ mutationFn: importCsv, ...options });
export const useTrackEmail = (options?: UseMutationOptions<void, Error, TrackEmailRequest>) =>
  useMutation({ mutationFn: trackEmail, ...options });
