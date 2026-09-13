/**
 * SPARK API wrapper.
 *
 * Calls the SPARK backend directly via the typed api client. The backend
 * exposes full CRUD + runs + DLQ endpoints (see crates/ataqu-api/src/handlers/spark.rs):
 *   - /workflows, /workflows/:id, /workflows/:id/execute
 *   - /workflows/runs (list), /workflows/runs/:id (detail)
 *   - /workflows/runs/:run_id/approve
 *   - /dlq (list), /dlq/:id/replay, /dlq/:id (delete)
 */

import type {
	CreateWorkflowRequest,
	TriggerWorkflowRequest,
	UpdateWorkflowRequest,
	UUID,
	Workflow,
	WorkflowListParams,
	WorkflowRun,
} from "@ataqu/api-client";
import { api } from "@ataqu/api-client";
import type {
	UseMutationOptions,
	UseQueryOptions,
} from "@tanstack/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface PaginatedResponse<T> {
	items: T[];
	total: number;
	limit: number;
	offset: number;
}

export interface DLQEntry {
	id: UUID;
	event_type: string;
	payload: Record<string, unknown>;
	error: string;
	attempts: number;
	created_at: string;
}

// ---- Raw API functions ----
export const listWorkflows = (params?: WorkflowListParams) =>
	api.get<PaginatedResponse<Workflow>>("/workflows", { params });

export const createWorkflow = (data: CreateWorkflowRequest) =>
	api.post<Workflow>("/workflows", data);

export const getWorkflow = (id: UUID) => api.get<Workflow>(`/workflows/${id}`);

export const updateWorkflow = (
	id: UUID,
	data: UpdateWorkflowRequest,
	version: number,
) =>
	api.put<Workflow>(`/workflows/${id}`, data, {
		headers: { "If-Match": `"${version}"` },
	});

export const deleteWorkflow = (id: UUID) =>
	api.delete<void>(`/workflows/${id}`);

export const executeWorkflow = (id: UUID, data: TriggerWorkflowRequest) =>
	api.post<void>(`/workflows/${id}/execute`, data);

export const listWorkflowRuns = (params?: {
	limit?: number;
	offset?: number;
	workflow_id?: UUID;
}) => api.get<PaginatedResponse<WorkflowRun>>("/workflows/runs", { params });

export const getWorkflowRun = (runId: UUID) =>
	api.get<WorkflowRun>(`/workflows/runs/${runId}`);

export const approveWorkflowRun = (runId: UUID) =>
	api.post<void>(`/workflows/runs/${runId}/approve`);

export const listDLQ = (params?: { limit?: number; offset?: number }) =>
	api.get<PaginatedResponse<DLQEntry>>("/dlq", { params });

export const replayDLQ = (id: UUID) => api.post<void>(`/dlq/${id}/replay`);

export const deleteDLQ = (id: UUID) => api.delete<void>(`/dlq/${id}`);

// ---- React Query hooks ----

export const useListWorkflows = (
	params?: WorkflowListParams,
	options?: UseQueryOptions<PaginatedResponse<Workflow>>,
) =>
	useQuery({
		queryKey: ["spark", "workflows", params],
		queryFn: () => listWorkflows(params),
		...options,
	});

export const useGetWorkflow = (
	id: UUID | undefined,
	options?: UseQueryOptions<Workflow>,
) =>
	useQuery({
		queryKey: ["spark", "workflows", id],
		queryFn: () => getWorkflow(id!),
		enabled: !!id && id !== "new",
		...options,
	});

export const useCreateWorkflow = (
	options?: UseMutationOptions<Workflow, Error, CreateWorkflowRequest>,
) => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: createWorkflow,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["spark", "workflows"] });
		},
		...options,
	});
};

export const useUpdateWorkflow = (
	options?: UseMutationOptions<
		Workflow,
		Error,
		{ id: UUID; data: UpdateWorkflowRequest; version: number }
	>,
) => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, data, version }) => updateWorkflow(id, data, version),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["spark", "workflows"] });
		},
		...options,
	});
};

export const useDeleteWorkflow = (
	options?: UseMutationOptions<void, Error, UUID>,
) => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: deleteWorkflow,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["spark", "workflows"] });
		},
		...options,
	});
};

interface ToggleContext {
	previous: PaginatedResponse<Workflow> | undefined;
}

export const useToggleWorkflow = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			id,
			is_active,
			version,
		}: {
			id: UUID;
			is_active: boolean;
			version: number;
		}) => updateWorkflow(id, { is_active }, version),
		onMutate: async ({ id, is_active }): Promise<ToggleContext> => {
			await qc.cancelQueries({ queryKey: ["spark", "workflows"] });
			const previous = qc.getQueryData<PaginatedResponse<Workflow>>([
				"spark",
				"workflows",
			]);
			qc.setQueryData<PaginatedResponse<Workflow>>(
				["spark", "workflows"],
				(old) => {
					if (!old) return old;
					return {
						...old,
						items: old.items.map((w) =>
							w.id === id ? { ...w, is_active } : w,
						),
					};
				},
			);
			return { previous };
		},
		onError: (
			_err: Error,
			_vars: { id: UUID; is_active: boolean; version: number },
			ctx: ToggleContext | undefined,
		) => {
			if (ctx?.previous) {
				qc.setQueryData(["spark", "workflows"], ctx.previous);
			}
		},
		onSettled: () => {
			qc.invalidateQueries({ queryKey: ["spark", "workflows"] });
		},
	});
};

export const useExecuteWorkflow = (
	options?: UseMutationOptions<
		void,
		Error,
		{ id: UUID; data: TriggerWorkflowRequest }
	>,
) =>
	useMutation({
		mutationFn: ({ id, data }) => executeWorkflow(id, data),
		...options,
	});

export const useListWorkflowRuns = (
	params?: { limit?: number; offset?: number; workflow_id?: UUID },
	options?: UseQueryOptions<PaginatedResponse<WorkflowRun>>,
) =>
	useQuery({
		queryKey: ["spark", "runs", params],
		queryFn: () => listWorkflowRuns(params),
		refetchInterval: 10_000,
		...options,
	});

export const useApproveWorkflowRun = (
	options?: UseMutationOptions<void, Error, UUID>,
) => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: approveWorkflowRun,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["spark", "runs"] });
		},
		...options,
	});
};

export const useListDLQ = (
	params?: { limit?: number; offset?: number },
	options?: UseQueryOptions<PaginatedResponse<DLQEntry>>,
) =>
	useQuery({
		queryKey: ["spark", "dlq", params],
		queryFn: () => listDLQ(params),
		refetchInterval: 30_000,
		...options,
	});

export const useReplayDLQ = (
	options?: UseMutationOptions<void, Error, UUID>,
) => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: replayDLQ,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["spark", "dlq"] });
		},
		...options,
	});
};

export const useDeleteDLQ = (
	options?: UseMutationOptions<void, Error, UUID>,
) => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: deleteDLQ,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["spark", "dlq"] });
		},
		...options,
	});
};
