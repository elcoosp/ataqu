import { useEffect } from 'react';
import type { VaultToastItem } from './toast-store';
import { useToastStore } from './toast-store';

function ToastCard({ toast }: { toast: VaultToastItem }) {
  const dismiss = useToastStore((state) => state.dismiss);

  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(toast.id), 5000);
    return () => window.clearTimeout(timer);
  }, [dismiss, toast.id]);

  const borderColor =
    toast.variant === 'error'
      ? 'border-destructive'
      : toast.variant === 'success'
        ? 'border-success'
        : 'border-border';

  return (
    <div className={`rounded-lg border bg-card p-4 text-card-foreground shadow-lg ${borderColor}`}>
      <div className="text-sm font-medium">{toast.title}</div>
      {toast.description ? (
        <div className="mt-1 text-xs text-muted-foreground">{toast.description}</div>
      ) : null}
    </div>
  );
}

export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2 px-4 md:px-0"
      role="status"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
