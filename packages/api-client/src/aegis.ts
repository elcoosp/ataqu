import type { UUID } from "@ataqu/types";
import type {
	UseMutationOptions,
	UseQueryOptions,
} from "@tanstack/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "./client";
import type {
	ApiKeyResponse,
	AuditLogEntry,
	AuditLogQuery,
	CreateApiKeyRequest,
	CreateRoleRequest,
	CreateUserRequest,
	InviteUserRequest,
	InviteUserResponse,
	LoginRequest,
	LoginResponse,
	MfaSetupResponse,
	MfaVerifyRequest,
	PendingApproval,
	RefreshTokenRequest,
	RoleResponse,
	TenantSettings,
	UpdatePermissionRequest,
	UpdateRoleRequest,
	UpdateTenantSettingsRequest,
	UserResponse,
} from "./types";

// ---- Auth ----
export const login = (data: LoginRequest) =>
	api.post<LoginResponse>("/aegis/login", data);
export const refreshToken = (data: RefreshTokenRequest) =>
	api.post<LoginResponse>("/aegis/refresh", data);
export const logout = () => api.post<void>("/aegis/logout");

export const mfaSetup = () => api.post<MfaSetupResponse>("/aegis/mfa/setup");
export const mfaVerify = (data: MfaVerifyRequest) =>
	api.post<void>("/aegis/mfa/verify", data);

// ---- Users ----
export const listUsers = () => api.get<UserResponse[]>("/aegis/users");
export const createUser = (data: CreateUserRequest) =>
	api.post<UserResponse>("/aegis/users", data);
export const updateUserRole = (
	userId: UUID,
	data: UpdateRoleRequest,
	version: number,
) =>
	api.patch<void>(`/aegis/users/${userId}/role`, data, {
		headers: { "If-Match": String(version) },
	});
export const deactivateUser = (userId: UUID) =>
	api.post<void>(`/aegis/users/${userId}/deactivate`);

// ---- Permissions ----
export const getPermissionMatrix = () =>
	api.get<
		Array<{
			user_id: UUID;
			user_name?: string;
			user_email: string;
			roles: Record<string, string>;
		}>
	>("/aegis/permission-matrix");
export const updatePermission = (
	userId: UUID,
	app: string,
	data: UpdatePermissionRequest,
) => api.patch<void>(`/aegis/permissions/${userId}/${app}`, data);

// ---- API Keys ----
export const listApiKeys = () => api.get<ApiKeyResponse[]>("/aegis/api-keys");
export const createApiKey = (data: CreateApiKeyRequest) =>
	api.post<ApiKeyResponse>("/aegis/api-keys", data);
export const deleteApiKey = (id: UUID) =>
	api.delete<void>(`/aegis/api-keys/${id}`);

// ---- Audit Log ----
export const getAuditLog = (params?: AuditLogQuery) =>
	api.get<AuditLogEntry[]>("/aegis/audit-log", { params });

// ---- Roles ----
export const listRoles = () => api.get<RoleResponse[]>("/aegis/roles");
export const createRole = (data: CreateRoleRequest) =>
	api.post<RoleResponse>("/aegis/roles", data);

// ---- Tenant Settings ----
export const getTenantSettings = () =>
	api.get<TenantSettings>("/aegis/tenant/settings");
export const updateTenantSettings = (data: UpdateTenantSettingsRequest) =>
	api.patch<TenantSettings>("/aegis/tenant/settings", data);

// ---- Invite ----
export const inviteUser = (data: InviteUserRequest) =>
	api.post<InviteUserResponse>("/aegis/users/invite", data);

// ---- React Query hooks ----
export const useListUsers = (options?: UseQueryOptions<UserResponse[]>) =>
	useQuery({ queryKey: ["aegis", "users"], queryFn: listUsers, ...options });
export const useGetPermissionMatrix = (options?: UseQueryOptions<any[]>) =>
	useQuery({
		queryKey: ["aegis", "permissions"],
		queryFn: getPermissionMatrix,
		...options,
	});
export const useListApiKeys = (options?: UseQueryOptions<ApiKeyResponse[]>) =>
	useQuery({
		queryKey: ["aegis", "api-keys"],
		queryFn: listApiKeys,
		...options,
	});
export const useGetAuditLog = (
	params?: AuditLogQuery,
	options?: UseQueryOptions<AuditLogEntry[]>,
) =>
	useQuery({
		queryKey: ["aegis", "audit", params],
		queryFn: () => getAuditLog(params),
		...options,
	});

// ---- Signup ----
export const signup = (data: {
	email: string;
	password: string;
	name?: string;
}) =>
	api.post<{ user_id: string; tenant_id: string; email: string }>(
		"/aegis/signup",
		data,
	);

export const useSignup = (
	options?: UseMutationOptions<
		{ user_id: string; tenant_id: string; email: string },
		Error,
		{ email: string; password: string; name?: string }
	>,
) => useMutation({ mutationFn: signup, ...options });
export const useLogin = (
	options?: UseMutationOptions<LoginResponse, Error, LoginRequest>,
) => useMutation({ mutationFn: login, ...options });
export const useRefreshToken = (
	options?: UseMutationOptions<LoginResponse, Error, RefreshTokenRequest>,
) => useMutation({ mutationFn: refreshToken, ...options });
export const useLogout = (options?: UseMutationOptions<void, Error>) =>
	useMutation({ mutationFn: logout, ...options });

export const useMfaSetup = (
	options?: UseMutationOptions<MfaSetupResponse, Error>,
) => useMutation({ mutationFn: mfaSetup, ...options });
export const useMfaVerify = (
	options?: UseMutationOptions<void, Error, MfaVerifyRequest>,
) => useMutation({ mutationFn: mfaVerify, ...options });

export const useCreateUser = (
	options?: UseMutationOptions<UserResponse, Error, CreateUserRequest>,
) => useMutation({ mutationFn: createUser, ...options });
export const useUpdateUserRole = (
	options?: UseMutationOptions<
		void,
		Error,
		{ userId: UUID; data: UpdateRoleRequest; version: number }
	>,
) =>
	useMutation({
		mutationFn: ({ userId, data, version }) =>
			updateUserRole(userId, data, version),
		...options,
	});
export const useDeactivateUser = (
	options?: UseMutationOptions<void, Error, UUID>,
) => useMutation({ mutationFn: deactivateUser, ...options });

export const useUpdatePermission = (
	options?: UseMutationOptions<
		void,
		Error,
		{ userId: UUID; app: string; data: UpdatePermissionRequest }
	>,
) =>
	useMutation({
		mutationFn: ({ userId, app, data }) => updatePermission(userId, app, data),
		...options,
	});
export const useCreateApiKey = (
	options?: UseMutationOptions<ApiKeyResponse, Error, CreateApiKeyRequest>,
) => useMutation({ mutationFn: createApiKey, ...options });
export const useDeleteApiKey = (
	options?: UseMutationOptions<void, Error, UUID>,
) => useMutation({ mutationFn: deleteApiKey, ...options });

// ---- Roles ----
export const useListRoles = (options?: UseQueryOptions<RoleResponse[]>) =>
	useQuery({
		queryKey: ["aegis", "roles"],
		queryFn: listRoles,
		...options,
	});
export const useCreateRole = (
	options?: UseMutationOptions<RoleResponse, Error, CreateRoleRequest>,
) => useMutation({ mutationFn: createRole, ...options });

// ---- Tenant Settings ----
export const useGetTenantSettings = (
	options?: UseQueryOptions<TenantSettings>,
) =>
	useQuery({
		queryKey: ["aegis", "tenant", "settings"],
		queryFn: getTenantSettings,
		...options,
	});
export const useUpdateTenantSettings = (
	options?: UseMutationOptions<
		TenantSettings,
		Error,
		UpdateTenantSettingsRequest
	>,
) => useMutation({ mutationFn: updateTenantSettings, ...options });

// ---- Invite ----
export const useInviteUser = (
	options?: UseMutationOptions<InviteUserResponse, Error, InviteUserRequest>,
) => useMutation({ mutationFn: inviteUser, ...options });

// ---- Current User ----
export const getCurrentUser = () => api.get<UserResponse>("/aegis/me");

export const useGetCurrentUser = (options?: UseQueryOptions<UserResponse>) =>
	useQuery({ queryKey: ["aegis", "me"], queryFn: getCurrentUser, ...options });

// ---- Approvals (SPARK workflow validation) ----
export const listPendingApprovals = () =>
	api.get<PendingApproval[]>("/aegis/approvals");

export const approveWorkflow = (data: { run_id: UUID }) =>
	api.post<unknown>("/aegis/approvals/approve", data);

export const rejectWorkflow = (data: { run_id: UUID }) =>
	api.post<unknown>("/aegis/approvals/reject", data);

export const useListPendingApprovals = (
	options?: UseQueryOptions<PendingApproval[]>,
) =>
	useQuery({
		queryKey: ["aegis", "approvals"],
		queryFn: listPendingApprovals,
		...options,
	});

export const useApproveWorkflow = (
	options?: UseMutationOptions<unknown, Error, { run_id: UUID }>,
) => useMutation({ mutationFn: approveWorkflow, ...options });

export const useRejectWorkflow = (
	options?: UseMutationOptions<unknown, Error, { run_id: UUID }>,
) => useMutation({ mutationFn: rejectWorkflow, ...options });
