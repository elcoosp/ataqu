import type { ApiError } from '@ataqu/types';
export const handleApiError = (error: unknown): string => {
  console.error('API Error:', error);
  return error?.message || 'An unexpected error occurred.';
};
