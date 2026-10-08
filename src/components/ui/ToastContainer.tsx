import { useUIStore } from '../../stores/ui-store';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);
  const removeToast = useUIStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => {
        const Icon = toast.type === 'success' ? CheckCircle : toast.type === 'error' ? XCircle : Info;
        const toneClass =
          toast.type === 'success' ? 'gt-toast-success' :
          toast.type === 'error' ? 'gt-toast-error' :
          'gt-toast-info';

        return (
          <div
            key={toast.id}
            className={`gt-toast ${toneClass} flex items-center gap-3 px-4 py-3 min-w-[300px] animate-slide-in`}
            data-ui="toast"
          >
            <Icon size={18} />
            <span className="flex-1 text-sm">{toast.message}</span>
            {toast.actionLabel && toast.onAction && (
              <button
                type="button"
                className="gt-toast-action"
                onClick={() => {
                  removeToast(toast.id);
                  void toast.onAction?.();
                }}
              >
                {toast.actionLabel}
              </button>
            )}
            <button type="button" aria-label="Close" onClick={() => removeToast(toast.id)} className="gt-button-icon min-h-0 w-auto h-auto p-0 opacity-60 hover:opacity-100">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
