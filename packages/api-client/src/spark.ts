import type { UseMutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { api } from "./client";

export interface SparkWorkflow {
	id: string;
	name: string;
	steps: string[];
}
export interface WorkflowResult {
	id: string;
	status: string;
}

export const createWorkflow = (data: SparkWorkflow) =>
	api.post<WorkflowResult>("/spark/workflows", data);
export const executeWorkflow = (workflowId: string) =>
	api.post<WorkflowResult>(`/spark/workflows/${workflowId}/execute`);

export const useCreateWorkflow = (
	options?: UseMutationOptions<WorkflowResult, Error, SparkWorkflow>,
) => useMutation({ mutationFn: createWorkflow, ...options });
export const useExecuteWorkflow = (
	options?: UseMutationOptions<WorkflowResult, Error, string>,
) =>
	useMutation({
		mutationFn: executeWorkflow,
		...options,
	});
