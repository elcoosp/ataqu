import { api } from './client';
import type {
  CreateEmployeeRequest,
  EmployeeDto,
  CreateLeaveRequestRequest,
  LeaveRequestDto,
} from './types';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';

export const createEmployee = (data: CreateEmployeeRequest) =>
  api.post<EmployeeDto>('/employees', data);
export const getEmployee = (id: string) =>
  api.get<EmployeeDto>(`/employees/${id}`);
export const createLeaveRequest = (data: CreateLeaveRequestRequest) =>
  api.post<LeaveRequestDto>('/leave-requests', data);
export const approveLeaveRequest = (id: string) =>
  api.patch<LeaveRequestDto>(`/leave-requests/${id}/approve`);

// ---- React Query hooks ----
export const useGetEmployee = (id: string, options?: UseQueryOptions<EmployeeDto>) =>
  useQuery({ queryKey: ['pause', 'employee', id], queryFn: () => getEmployee(id), ...options });

export const useCreateEmployee = (options?: UseMutationOptions<EmployeeDto, Error, CreateEmployeeRequest>) =>
  useMutation({ mutationFn: createEmployee, ...options });
export const useCreateLeaveRequest = (options?: UseMutationOptions<LeaveRequestDto, Error, CreateLeaveRequestRequest>) =>
  useMutation({ mutationFn: createLeaveRequest, ...options });
export const useApproveLeaveRequest = (options?: UseMutationOptions<LeaveRequestDto, Error, string>) =>
  useMutation({
    mutationFn: approveLeaveRequest,
    ...options,
  });
