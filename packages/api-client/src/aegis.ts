import { api } from './client';
import type {
  LoginRequest,
  LoginResponse,
  MfaSetupRequest,
  MfaSetupResponse,
} from './types';
import { useMutation } from '@tanstack/react-query';
import type { UseMutationOptions } from '@tanstack/react-query';

export const login = (data: LoginRequest) =>
  api.post<LoginResponse>('/auth/login', data);

export const mfaSetup = (data: MfaSetupRequest) =>
  api.post<MfaSetupResponse>('/auth/mfa', data);

export const tokenRefresh = (refreshToken: string) =>
  api.post<{ access_token: string }>('/auth/refresh', { refresh_token: refreshToken });

// ---- React Query hooks ----
export const useLogin = (options?: UseMutationOptions<LoginResponse, Error, LoginRequest>) =>
  useMutation({
    mutationFn: login,
    ...options,
  });

export const useMfaSetup = (options?: UseMutationOptions<MfaSetupResponse, Error, MfaSetupRequest>) =>
  useMutation({
    mutationFn: mfaSetup,
    ...options,
  });

export const useTokenRefresh = (options?: UseMutationOptions<{ access_token: string }, Error, string>) =>
  useMutation({
    mutationFn: tokenRefresh,
    ...options,
  });
