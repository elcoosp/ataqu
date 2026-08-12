import { UUID } from '@ataqu/types';
import { api } from './client';
import type {
  Employee,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  LeaveRequest,
  CreateLeaveRequestRequest,
  UploadDocumentRequest,
  Document,
  BulkDeleteRequest,
} from './types';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';

// ---- Employees ----
export const listEmployees = (params?: { limit?: number; offset?: number }) =>
  api.get<Employee[]>('/pause/employees', { params });
export const createEmployee = (data: CreateEmployeeRequest) =>
  api.post<Employee>('/pause/employees', data);
export const getEmployee = (id: UUID) => api.get<Employee>(`/pause/employees/${id}`);
export const updateEmployee = (id: UUID, data: UpdateEmployeeRequest) =>
  api.put<Employee>(`/pause/employees/${id}`, data);
export const deactivateEmployee = (id: UUID) =>
  api.post<void>(`/pause/employees/${id}/deactivate`);
export const bulkDeactivateEmployees = (data: BulkDeleteRequest) =>
  api.post<void>('/pause/employees/bulk-deactivate', data);
export const searchEmployees = (params: { q: string; limit?: number }) =>
  api.get<Employee[]>('/pause/employees/search', { params });

// ---- Leave Requests ----
export const listLeaveRequests = (params?: { limit?: number; offset?: number }) =>
  api.get<LeaveRequest[]>('/pause/leave-requests', { params });
export const createLeaveRequest = (data: CreateLeaveRequestRequest) =>
  api.post<LeaveRequest>('/pause/leave-requests', data);
export const approveLeaveRequest = (id: UUID) =>
  api.patch<LeaveRequest>(`/pause/leave-requests/${id}/approve`);
export const rejectLeaveRequest = (id: UUID) =>
  api.patch<LeaveRequest>(`/pause/leave-requests/${id}/reject`);
export const cancelLeaveRequest = (id: UUID) =>
  api.patch<LeaveRequest>(`/pause/leave-requests/${id}/cancel`);

// ---- Documents ----
export const uploadDocument = (employeeId: UUID, data: UploadDocumentRequest) =>
  api.post<Document>(`/pause/employees/${employeeId}/documents`, data);
export const listEmployeeDocuments = (employeeId: UUID, params?: { limit?: number; offset?: number }) =>
  api.get<Document[]>(`/pause/employees/${employeeId}/documents`, { params });

// ---- React Query hooks ----
export const useListEmployees = (params?: { limit?: number; offset?: number }, options?: UseQueryOptions<Employee[]>) =>
  useQuery({ queryKey: ['pause', 'employees', params], queryFn: () => listEmployees(params), ...options });
export const useGetEmployee = (id: UUID, options?: UseQueryOptions<Employee>) =>
  useQuery({ queryKey: ['pause', 'employee', id], queryFn: () => getEmployee(id), ...options });
export const useSearchEmployees = (params: { q: string; limit?: number }, options?: UseQueryOptions<Employee[]>) =>
  useQuery({
    queryKey: ['pause', 'search', params],
    queryFn: () => searchEmployees(params),
    ...options,
  });

export const useListLeaveRequests = (params?: { limit?: number; offset?: number }, options?: UseQueryOptions<LeaveRequest[]>) =>
  useQuery({
    queryKey: ['pause', 'leave-requests', params],
    queryFn: () => listLeaveRequests(params),
    ...options,
  });

export const useCreateEmployee = (options?: UseMutationOptions<Employee, Error, CreateEmployeeRequest>) =>
  useMutation({ mutationFn: createEmployee, ...options });
export const useUpdateEmployee = (options?: UseMutationOptions<Employee, Error, { id: UUID; data: UpdateEmployeeRequest }>) =>
  useMutation({
    mutationFn: ({ id, data }) => updateEmployee(id, data),
    ...options,
  });
export const useDeactivateEmployee = (options?: UseMutationOptions<void, Error, UUID>) =>
  useMutation({ mutationFn: deactivateEmployee, ...options });
export const useBulkDeactivateEmployees = (options?: UseMutationOptions<void, Error, BulkDeleteRequest>) =>
  useMutation({ mutationFn: bulkDeactivateEmployees, ...options });

export const useCreateLeaveRequest = (options?: UseMutationOptions<LeaveRequest, Error, CreateLeaveRequestRequest>) =>
  useMutation({ mutationFn: createLeaveRequest, ...options });
export const useApproveLeaveRequest = (options?: UseMutationOptions<LeaveRequest, Error, UUID>) =>
  useMutation({ mutationFn: approveLeaveRequest, ...options });
export const useRejectLeaveRequest = (options?: UseMutationOptions<LeaveRequest, Error, UUID>) =>
  useMutation({ mutationFn: rejectLeaveRequest, ...options });
export const useCancelLeaveRequest = (options?: UseMutationOptions<LeaveRequest, Error, UUID>) =>
  useMutation({ mutationFn: cancelLeaveRequest, ...options });

export const useUploadDocument = (options?: UseMutationOptions<Document, Error, { employeeId: UUID; data: UploadDocumentRequest }>) =>
  useMutation({
    mutationFn: ({ employeeId, data }) => uploadDocument(employeeId, data),
    ...options,
  });
export const useListEmployeeDocuments = (employeeId: UUID, params?: { limit?: number; offset?: number }, options?: UseQueryOptions<Document[]>) =>
  useQuery({
    queryKey: ['pause', 'documents', employeeId, params],
    queryFn: () => listEmployeeDocuments(employeeId, params),
    ...options,
  });
