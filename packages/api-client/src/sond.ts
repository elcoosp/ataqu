import { api } from './client';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';

// Placeholder types
export interface Form {
  id: string;
  title: string;
  description?: string;
  // ...
}
export interface Submission {
  id: string;
  form_id: string;
  data: Record<string, unknown>;
}

export const listForms = () => api.get<Form[]>('/forms');
export const createForm = (data: Form) => api.post<Form>('/forms', data);
export const getForm = (id: string) => api.get<Form>(`/forms/${id}`);
export const submitForm = (formId: string, data: unknown) =>
  api.post<Submission>(`/forms/${formId}/submissions`, data);
export const listSubmissions = (formId: string) =>
  api.get<Submission[]>(`/forms/${formId}/submissions`);
export const exportForm = (formId: string) =>
  api.get<Blob>(`/forms/${formId}/export`, { responseType: 'blob' });

// ---- React Query hooks ----
export const useListForms = (options?: UseQueryOptions<Form[]>) =>
  useQuery({ queryKey: ['sond', 'forms'], queryFn: listForms, ...options });
export const useGetForm = (id: string, options?: UseQueryOptions<Form>) =>
  useQuery({ queryKey: ['sond', 'form', id], queryFn: () => getForm(id), ...options });

export const useCreateForm = (options?: UseMutationOptions<Form, Error, Form>) =>
  useMutation({ mutationFn: createForm, ...options });
export const useSubmitForm = (options?: UseMutationOptions<Submission, Error, { formId: string; data: unknown }>) =>
  useMutation({
    mutationFn: ({ formId, data }) => submitForm(formId, data),
    ...options,
  });
