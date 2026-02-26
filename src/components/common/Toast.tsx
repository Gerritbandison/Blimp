import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { clsx } from 'clsx';
import { useStore } from '../../store/useStore';

const toastConfig = {
  success: { icon: CheckCircle, bg: 'bg-green-50 border-green-200', text: 'text-green-800', icon_color: 'text-green-500' },
  error:   { icon: XCircle,    bg: 'bg-red-50 border-red-200',     text: 'text-red-800',   icon_color: 'text-red-500' },
  warning: { icon: AlertTriangle, bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-800', icon_color: 'text-yellow-500' },
  info:    { icon: Info,       bg: 'bg-blue-50 border-blue-200',   text: 'text-blue-800',  icon_color: 'text-blue-500' },
};

export function ToastContainer() {
  const { toasts, removeToast } = useStore();

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((toast) => {
        const config = toastConfig[toast.type];
        const Icon = config.icon;
        return (
          <div
            key={toast.id}
            className={clsx(
              'flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg max-w-sm pointer-events-auto animate-in slide-in-from-bottom-2',
              config.bg
            )}
          >
            <Icon size={18} className={config.icon_color} />
            <p className={clsx('text-sm font-medium flex-1', config.text)}>{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss notification"
              className={clsx('hover:opacity-70 transition-opacity', config.text)}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
