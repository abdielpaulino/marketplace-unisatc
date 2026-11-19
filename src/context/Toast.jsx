import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const show = useCallback(
    (message, type = 'success', duration = 4000) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((t) => [...t, { id, message, type }]);
      if (duration) setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const icons = { success: CheckCircle2, error: AlertCircle, info: Info };

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => {
          const Icon = icons[t.type] || Info;
          return (
            <div key={t.id} className={`toast toast-${t.type}`}>
              <Icon size={18} />
              <span>{t.message}</span>
              <button className="icon-btn" onClick={() => dismiss(t.id)} aria-label="Fechar">
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

/** Runs an action and shows its error (or a success message) as a toast. */
export function useAction() {
  const toast = useToast();
  return useCallback(
    async (fn, successMessage) => {
      try {
        const result = await fn();
        if (successMessage) toast(successMessage, 'success');
        return result ?? true;
      } catch (e) {
        toast(e.message || 'Algo deu errado.', 'error', 6000);
        return false;
      }
    },
    [toast],
  );
}
