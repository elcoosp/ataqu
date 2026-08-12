import { api } from '@ataqu/api-client';
import type {
  Workflow,
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  WorkflowRun,
  TriggerWorkflowRequest,
  WorkflowListParams,
  UUID,
} from '@ataqu/api-client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';

// ============================================================================
// Paginated response shape (matches backend PaginatedResponse<T>)
// ============================================================================
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

// ============================================================================
// DLQ types (backend-managed, frontend consumes)
// ============================================================================
export interface DLQEntry {
  id: UUID;
  event_type: string;
  payload: Record<string, unknown>;
  error: string;
  attempts: number;
  created_at: string;
  schema: string;
}

// ============================================================================
// Raw API functions — uses the shared api client from @ataqu/api-client
// ============================================================================

// ---- Workflows CRUD ----
export const listWorkflows = (params?: WorkflowListParams) =>
  api.get<PaginatedResponse<Workflow>>('/workflows', { params });

export const createWorkflow = (data: CreateWorkflowRequest) =>
  api.post<Workflow>('/workflows', data);

export const getWorkflow = (id: UUID) =>
  api.get<Workflow>(`/workflows/${id}`);

export const updateWorkflow = (id: UUID, data: UpdateWorkflowRequest, version: number) =>
  api.put<Workflow>(`/workflows/${id}`, data, {
    headers: { 'If-Match': `"${version}"` },
  });

export const deleteWorkflow = (id: UUID) =>
  api.delete<void>(`/workflows/${id}`);

// ---- Workflow execution ----
export const executeWorkflow = (id: UUID, data: TriggerWorkflowRequest) =>
  api.post<void>(`/workflows/${id}/execute`, data);

// ---- Workflow runs ----
export const listWorkflowRuns = (params?: { limit?: number; offset?: number; workflow_id?: UUID }) =>
  api.get<PaginatedResponse<WorkflowRun>>('/workflows/runs', { params });

export const getWorkflowRun = (runId: UUID) =>
  api.get<WorkflowRun>(`/workflows/runs/${runId}`);

export const approveWorkflowRun = (runId: UUID) =>
  api.post<void>(`/workflows/runs/${runId}/approve`);

// ---- DLQ ----
export const listDLQ = (params?: { limit?: number; offset?: number }) =>
  api.get<PaginatedResponse<DLQEntry>>('/dlq', { params });

export const replayDLQ = (id: UUID) =>
  api.post<void>(`/dlq/${id}/replay`);

export const deleteDLQ = (id: UUID) =>
  api.delete<void>(`/dlq/${id}`);

// ============================================================================
// React Query hooks
// ============================================================================

// ---- Workflow queries ----
export const useListWorkflows = (
  params?: WorkflowListParams,
  options?: UseQueryOptions<PaginatedResponse<Workflow>>
) =>
  useQuery({
    queryKey: ['spark', 'workflows', params],
    queryFn: () => listWorkflows(params),
    ...options,
  });

export const useGetWorkflow = (
  id: UUID | undefined,
  options?: UseQueryOptions<Workflow>
) =>
  useQuery({
    queryKey: ['spark', 'workflows', id],
    queryFn: () => getWorkflow(id!),
    enabled: !!id && id !== 'new',
    ...options,
  });

// ---- Workflow mutations ----
export const useCreateWorkflow = (
  options?: UseMutationOptions<Workflow, Error, CreateWorkflowRequest>
) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createWorkflow,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spark', 'workflows'] });
    },
    ...options,
  });
};

export const useUpdateWorkflow = (
  options?: UseMutationOptions<
    Workflow,
    Error,
    { id: UUID; data: UpdateWorkflowRequest; version: number }
  >
) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data, version }) => updateWorkflow(id, data, version),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spark', 'workflows'] });
    },
    ...options,
  });
};

export const useDeleteWorkflow = (
  options?: UseMutationOptions<void, Error, UUID>
) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteWorkflow,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spark', 'workflows'] });
    },
    ...options,
  });
};

export const useToggleWorkflow = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_active, version }: { id: UUID; is_active: boolean; version: number }) =>
      updateWorkflow(id, { is_active }, version),
    onMutate: async ({ id, is_active }) => {
      await qc.cancelQueries({ queryKey: ['spark', 'workflows'] });
      const previous = qc.getQueryData<PaginatedResponse<Workflow>>(['spark', 'workflows']);
      qc.setQueryData<PaginatedResponse<Workflow>>(['spark', 'workflows'], (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((w) =>
            w.id === id ? { ...w, is_active } : w
          ),
        };
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(['spark', 'workflows'], ctx.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['spark', 'workflows'] });
    },
  });
};

// ---- Execution ----
export const useExecuteWorkflow = (
  options?: UseMutationOptions<void, Error, { id: UUID; data: TriggerWorkflowRequest }>
) =>
  useMutation({
    mutationFn: ({ id, data }) => executeWorkflow(id, data),
    ...options,
  });

// ---- Runs ----
export const useListWorkflowRuns = (
  params?: { limit?: number; offset?: number; workflow_id?: UUID },
  options?: UseQueryOptions<PaginatedResponse<WorkflowRun>>
) =>
  useQuery({
    queryKey: ['spark', 'runs', params],
    queryFn: () => listWorkflowRuns(params),
    refetchInterval: 10_000,
    ...options,
  });

export const useApproveWorkflowRun = (
  options?: UseMutationOptions<void, Error, UUID>
) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: approveWorkflowRun,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spark', 'runs'] });
    },
    ...options,
  });
};

// ---- DLQ ----
export const useListDLQ = (
  params?: { limit?: number; offset?: number },
  options?: UseQueryOptions<PaginatedResponse<DLQEntry>>
) =>
  useQuery({
    queryKey: ['spark', 'dlq', params],
    queryFn: () => listDLQ(params),
    refetchInterval: 30_000,
    ...options,
  });

export const useReplayDLQ = (
  options?: UseMutationOptions<void, Error, UUID>
) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: replayDLQ,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['spark', 'dlq'] });
      const previous = qc.getQueryData<PaginatedResponse<DLQEntry>>(['spark', 'dlq']);
      qc.setQueryData<PaginatedResponse<DLQEntry>>(['spark', 'dlq'], (old) => {
        if (!old) return old;
        return { ...old, items: old.items.filter((e) => e.id !== id) };
      });
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(['spark', 'dlq'], ctx.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['spark', 'dlq'] });
    },
    ...options,
  });
};

export const useDeleteDLQ = (
  options?: UseMutationOptions<void, Error, UUID>
) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteDLQ,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['spark', 'dlq'] });
      const previous = qc.getQueryData<PaginatedResponse<DLQEntry>>(['spark', 'dlq']);
      qc.setQueryData<PaginatedResponse<DLQEntry>>(['spark', 'dlq'], (old) => {
        if (!old) return old;
        return { ...old, items: old.items.filter((e) => e.id !== id) };
      });
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(['spark', 'dlq'], ctx.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['spark', 'dlq'] });
    },
    ...options,
  });
};
