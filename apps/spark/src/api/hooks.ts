import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@ataqu/api-client';
import type {
  Workflow,
  WorkflowRun,
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  TriggerWorkflowRequest,
  WorkflowListParams,
} from '@ataqu/api-client';

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface DLQEntry {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  error: string;
  attempts: number;
  created_at: string;
}

export const useListWorkflows = (params?: WorkflowListParams) =>
  useQuery({
    queryKey: ['spark', 'workflows', params],
    queryFn: () => api.get<PaginatedResponse<Workflow>>('/workflows', { params }),
  });

export const useGetWorkflow = (id: string) =>
  useQuery({
    queryKey: ['spark', 'workflows', id],
    queryFn: () => api.get<Workflow>(`/workflows/${id}`),
    enabled: !!id && id !== 'new',
  });

export const useCreateWorkflow = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateWorkflowRequest) => api.post<Workflow>('/workflows', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['spark', 'workflows'] }),
  });
};

export const useUpdateWorkflow = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data, version }: { id: string; data: UpdateWorkflowRequest; version: number }) =>
      api.put<Workflow>(`/workflows/${id}`, data, {
        headers: { 'If-Match': `"${version}"` },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['spark', 'workflows'] }),
  });
};

export const useDeleteWorkflow = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/workflows/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['spark', 'workflows'] }),
  });
};

export const useToggleWorkflow = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_active, version }: { id: string; is_active: boolean; version: number }) =>
      api.put<Workflow>(`/workflows/${id}`, { is_active }, {
        headers: { 'If-Match': `"${version}"` },
      }),
    onMutate: async ({ id, is_active }) => {
      await qc.cancelQueries({ queryKey: ['spark', 'workflows'] });
      const prev = qc.getQueryData<PaginatedResponse<Workflow>>(['spark', 'workflows']);
      qc.setQueryData<PaginatedResponse<Workflow>>(['spark', 'workflows'], (old) => {
        if (!old) return old;
        return { ...old, items: old.items.map((w) => (w.id === id ? { ...w, is_active } : w)) };
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['spark', 'workflows'], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['spark', 'workflows'] }),
  });
};

export const useExecuteWorkflow = () =>
  useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      api.post<void>(`/workflows/${id}/execute`, { payload }),
  });

export const useListWorkflowRuns = (params?: { limit?: number; offset?: number }) =>
  useQuery({
    queryKey: ['spark', 'runs', params],
    queryFn: () => api.get<PaginatedResponse<WorkflowRun>>('/workflows/runs', { params }),
  });

export const useListDLQ = (params?: { limit?: number; offset?: number }) =>
  useQuery({
    queryKey: ['spark', 'dlq', params],
    queryFn: () => api.get<PaginatedResponse<DLQEntry>>('/dlq', { params }),
  });

export const useReplayDLQ = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<void>(`/dlq/${id}/replay`),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['spark', 'dlq'] });
      const prev = qc.getQueryData<PaginatedResponse<DLQEntry>>(['spark', 'dlq']);
      qc.setQueryData<PaginatedResponse<DLQEntry>>(['spark', 'dlq'], (old) => {
        if (!old) return old;
        return { ...old, items: old.items.filter((e) => e.id !== id) };
      });
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(['spark', 'dlq'], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['spark', 'dlq'] }),
  });
};

export const useDeleteDLQ = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/dlq/${id}`),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['spark', 'dlq'] });
      const prev = qc.getQueryData<PaginatedResponse<DLQEntry>>(['spark', 'dlq']);
      qc.setQueryData<PaginatedResponse<DLQEntry>>(['spark', 'dlq'], (old) => {
        if (!old) return old;
        return { ...old, items: old.items.filter((e) => e.id !== id) };
      });
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(['spark', 'dlq'], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['spark', 'dlq'] }),
  });
};

export const useApproveRun = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (runId: string) => api.post<void>(`/workflows/runs/${runId}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['spark', 'runs'] }),
  });
};
