import { UUID } from '@ataqu/types';
import { api } from './client';
import { useMutation } from '@tanstack/react-query';
import type { UseMutationOptions } from '@tanstack/react-query';

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
  api.post<WorkflowResult>('/workflows', data);
export const executeWorkflow = (workflowId: string) =>
  api.post<WorkflowResult>(`/workflows/${workflowId}/execute`);

export const useCreateWorkflow = (options?: UseMutationOptions<WorkflowResult, Error, SparkWorkflow>) =>
  useMutation({ mutationFn: createWorkflow, ...options });
export const useExecuteWorkflow = (options?: UseMutationOptions<WorkflowResult, Error, string>) =>
  useMutation({
    mutationFn: executeWorkflow,
    ...options,
  });
