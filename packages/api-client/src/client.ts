// Auto-generated API client
import { useAuthStore } from '@ataqu/shared-stores';
import { generateIdempotencyKey } from '@ataqu/shared-utils';
import type { ApiError } from '@ataqu/types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token;
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.method && ['POST','PUT','PATCH','DELETE'].includes(options.method.toUpperCase())) {
    headers.set('Idempotency-Key', generateIdempotencyKey());
  }
  headers.set('Content-Type', 'application/json');

  const resp = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!resp.ok) {
    const error: ApiError = await resp.json().catch(() => ({ code: resp.status, message: resp.statusText }));
    throw error;
  }
  return resp.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, data?: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(data) }),
  put: <T>(path: string, data?: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(data) }),
  patch: <T>(path: string, data?: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

// Domain exports
export * from './aegis';
export * from './cinq';
// ... etc
