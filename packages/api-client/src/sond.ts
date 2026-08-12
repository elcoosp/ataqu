import { UUID } from '@ataqu/types';
import { api } from './client';
import type {
  Form,
  CreateFormRequest,
  UpdateFormRequest,
  Submission,
  SubmitFormRequest,
  ConversationalStepRequest,
  ConversationalStepResponse,
  BulkDeleteRequest,
} from './types';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';

// ---- Forms ----
export const listForms = (params?: { limit?: number; offset?: number }) =>
  api.get<Form[]>('/sond/forms', { params });
export const createForm = (data: CreateFormRequest) =>
  api.post<Form>('/sond/forms', data);
export const getForm = (id: UUID) => api.get<Form>(`/sond/forms/${id}`);
export const updateForm = (id: UUID, data: UpdateFormRequest) =>
  api.put<Form>(`/sond/forms/${id}`, data);
export const deleteForm = (id: UUID) => api.delete<void>(`/sond/forms/${id}`);

// ---- Submissions ----
export const listSubmissions = (formId: UUID, params?: { limit?: number; offset?: number }) =>
  api.get<Submission[]>(`/sond/forms/${formId}/submissions`, { params });
export const submitForm = (formId: UUID, data: SubmitFormRequest) =>
  api.post<Submission>(`/sond/forms/${formId}/submissions`, data);
export const submitConversationalStep = (formId: UUID, data: ConversationalStepRequest) =>
  api.post<ConversationalStepResponse>(`/sond/forms/${formId}/submit/step`, data);
export const exportFormSubmissions = (formId: UUID) =>
  api.get<Blob>(`/sond/forms/${formId}/export`, { responseType: 'blob' });
export const bulkDeleteSubmissions = (data: BulkDeleteRequest) =>
  api.post<void>('/sond/submissions/bulk-delete', data);

// ---- React Query hooks ----
export const useListForms = (params?: { limit?: number; offset?: number }, options?: UseQueryOptions<Form[]>) =>
  useQuery({ queryKey: ['sond', 'forms', params], queryFn: () => listForms(params), ...options });
export const useGetForm = (id: UUID, options?: UseQueryOptions<Form>) =>
  useQuery({ queryKey: ['sond', 'form', id], queryFn: () => getForm(id), ...options });
export const useListSubmissions = (formId: UUID, params?: { limit?: number; offset?: number }, options?: UseQueryOptions<Submission[]>) =>
  useQuery({
    queryKey: ['sond', 'submissions', formId, params],
    queryFn: () => listSubmissions(formId, params),
    ...options,
  });

export const useCreateForm = (options?: UseMutationOptions<Form, Error, CreateFormRequest>) =>
  useMutation({ mutationFn: createForm, ...options });
export const useUpdateForm = (options?: UseMutationOptions<Form, Error, { id: UUID; data: UpdateFormRequest }>) =>
  useMutation({
    mutationFn: ({ id, data }) => updateForm(id, data),
    ...options,
  });
export const useDeleteForm = (options?: UseMutationOptions<void, Error, UUID>) =>
  useMutation({ mutationFn: deleteForm, ...options });

export const useSubmitForm = (options?: UseMutationOptions<Submission, Error, { formId: UUID; data: SubmitFormRequest }>) =>
  useMutation({
    mutationFn: ({ formId, data }) => submitForm(formId, data),
    ...options,
  });
export const useSubmitConversationalStep = (options?: UseMutationOptions<ConversationalStepResponse, Error, { formId: UUID; data: ConversationalStepRequest }>) =>
  useMutation({
    mutationFn: ({ formId, data }) => submitConversationalStep(formId, data),
    ...options,
  });
export const useBulkDeleteSubmissions = (options?: UseMutationOptions<void, Error, BulkDeleteRequest>) =>
  useMutation({ mutationFn: bulkDeleteSubmissions, ...options });
