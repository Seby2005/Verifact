'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import styles from './Toast.module.css';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toast: (item: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const ICON_MAP = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ type, title, message, duration }: Omit<ToastItem, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      const autoDismissDuration =
        duration !== undefined ? duration : type === 'error' ? 0 : 5000;

      const newToast: ToastItem = { id, type, title, message, duration: autoDismissDuration };
      setToasts((prev) => [...prev, newToast]);

      if (autoDismissDuration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, autoDismissDuration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toast, removeToast }}>
      {children}
      <div className={styles.toastContainer} aria-live="polite" aria-atomic="true">
        {toasts.map((item) => {
          const Icon = ICON_MAP[item.type];
          return (
            <div key={item.id} className={`${styles.toast} ${styles[item.type]}`} role="status">
              <Icon className={styles.icon} aria-hidden="true" />
              <div className={styles.content}>
                {item.title ? <h4 className={styles.title}>{item.title}</h4> : null}
                <p className={styles.message}>{item.message}</p>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => removeToast(item.id)}
                aria-label="Închide notificarea"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback for non-provider usage
    return {
      toast: () => {},
      removeToast: () => {},
    };
  }
  return context;
}
