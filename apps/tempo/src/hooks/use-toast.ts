import { useCallback } from 'react';

type ToastVariant = 'default' | 'success' | 'error';

function showToast(message: string, variant: ToastVariant) {
  window.dispatchEvent(new CustomEvent('ataqu:toast', { detail: { message, variant } }));
}

export const toast = {
  success: (message: string) => showToast(message, 'success'),
  error: (message: string) => showToast(message, 'error'),
  info: (message: string) => showToast(message, 'default'),
};

export function useToast() {
  const success = useCallback((msg: string) => toast.success(msg), []);
  const error = useCallback((msg: string) => toast.error(msg), []);
  const info = useCallback((msg: string) => toast.info(msg), []);
  return { success, error, info };
}
