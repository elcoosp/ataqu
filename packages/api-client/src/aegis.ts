import { UUID } from '@ataqu/types';
import { api } from './client';
import type {
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  MfaVerifyRequest,
  MfaSetupResponse,
  CreateUserRequest,
  UserResponse,
  UpdateRoleRequest,
  UpdatePermissionRequest,
  ApiKeyResponse,
  CreateApiKeyRequest,
  AuditLogEntry,
  AuditLogQuery,
  BulkDeleteRequest,
} from './types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';

// ---- Auth ----
export const login = (data: LoginRequest) =>
  api.post<LoginResponse>('/aegis/login', data);
export const refreshToken = (data: RefreshTokenRequest) =>
  api.post<LoginResponse>('/aegis/refresh', data);
export const logout = () => api.post<void>('/aegis/logout');

export const mfaSetup = () =>
  api.post<MfaSetupResponse>('/aegis/mfa/setup');
export const mfaVerify = (data: MfaVerifyRequest) =>
  api.post<void>('/aegis/mfa/verify', data);

// ---- Users ----
export const listUsers = () => api.get<UserResponse[]>('/aegis/users');
export const createUser = (data: CreateUserRequest) =>
  api.post<UserResponse>('/aegis/users', data);
export const updateUserRole = (userId: UUID, data: UpdateRoleRequest) =>
  api.patch<void>(`/aegis/users/${userId}/role`, data);
export const deactivateUser = (userId: UUID) =>
  api.post<void>(`/aegis/users/${userId}/deactivate`);

// ---- Permissions ----
export const getPermissionMatrix = () =>
  api.get<Array<{ user_id: UUID; user_name?: string; user_email: string; roles: Record<string, string> }>>(
    '/aegis/permission-matrix'
  );
export const updatePermission = (userId: UUID, app: string, data: UpdatePermissionRequest) =>
  api.patch<void>(`/aegis/permissions/${userId}/${app}`, data);

// ---- API Keys ----
export const listApiKeys = () => api.get<ApiKeyResponse[]>('/aegis/api-keys');
export const createApiKey = (data: CreateApiKeyRequest) =>
  api.post<ApiKeyResponse>('/aegis/api-keys', data);
export const deleteApiKey = (id: UUID) => api.delete<void>(`/aegis/api-keys/${id}`);

// ---- Audit Log ----
export const getAuditLog = (params?: AuditLogQuery) =>
  api.get<AuditLogEntry[]>('/aegis/audit-log', { params });

// ---- React Query hooks ----
export const useListUsers = (options?: UseQueryOptions<UserResponse[]>) =>
  useQuery({ queryKey: ['aegis', 'users'], queryFn: listUsers, ...options });
export const useGetPermissionMatrix = (options?: UseQueryOptions<any[]>) =>
  useQuery({ queryKey: ['aegis', 'permissions'], queryFn: getPermissionMatrix, ...options });
export const useListApiKeys = (options?: UseQueryOptions<ApiKeyResponse[]>) =>
  useQuery({ queryKey: ['aegis', 'api-keys'], queryFn: listApiKeys, ...options });
export const useGetAuditLog = (params?: AuditLogQuery, options?: UseQueryOptions<AuditLogEntry[]>) =>
  useQuery({
    queryKey: ['aegis', 'audit', params],
    queryFn: () => getAuditLog(params),
    ...options,
  });

export const useLogin = (options?: UseMutationOptions<LoginResponse, Error, LoginRequest>) =>
  useMutation({ mutationFn: login, ...options });
export const useRefreshToken = (options?: UseMutationOptions<LoginResponse, Error, RefreshTokenRequest>) =>
  useMutation({ mutationFn: refreshToken, ...options });
export const useLogout = (options?: UseMutationOptions<void, Error>) =>
  useMutation({ mutationFn: logout, ...options });

export const useMfaSetup = (options?: UseMutationOptions<MfaSetupResponse, Error>) =>
  useMutation({ mutationFn: mfaSetup, ...options });
export const useMfaVerify = (options?: UseMutationOptions<void, Error, MfaVerifyRequest>) =>
  useMutation({ mutationFn: mfaVerify, ...options });

export const useCreateUser = (options?: UseMutationOptions<UserResponse, Error, CreateUserRequest>) =>
  useMutation({ mutationFn: createUser, ...options });
export const useUpdateUserRole = (options?: UseMutationOptions<void, Error, { userId: UUID; data: UpdateRoleRequest }>) =>
  useMutation({
    mutationFn: ({ userId, data }) => updateUserRole(userId, data),
    ...options,
  });
export const useDeactivateUser = (options?: UseMutationOptions<void, Error, UUID>) =>
  useMutation({ mutationFn: deactivateUser, ...options });

export const useUpdatePermission = (options?: UseMutationOptions<void, Error, { userId: UUID; app: string; data: UpdatePermissionRequest }>) =>
  useMutation({
    mutationFn: ({ userId, app, data }) => updatePermission(userId, app, data),
    ...options,
  });
export const useCreateApiKey = (options?: UseMutationOptions<ApiKeyResponse, Error, CreateApiKeyRequest>) =>
  useMutation({ mutationFn: createApiKey, ...options });
export const useDeleteApiKey = (options?: UseMutationOptions<void, Error, UUID>) =>
  useMutation({ mutationFn: deleteApiKey, ...options });
