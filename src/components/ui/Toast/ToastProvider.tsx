'use client';

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import styles from './Toast.module.css';

export type ToastTone = 'success' | 'error';

export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  /** Shows a transient confirmation. Errors persist longer and interrupt. */
  notify: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DURATION: Record<ToastTone, number> = {
  success: 2600,
  // Failures get longer: the reader has to actually take them in.
  error: 5200,
};

/**
 * Transient confirmations for actions whose result is otherwise invisible —
 * copying a citation, publishing a report, deleting one.
 *
 * Success is announced politely so it never interrupts what a screen reader is
 * saying; a failure uses `alert`, because a silent failure is worse than an
 * interruption. Toasts are advisory only: nothing here is the sole way to learn
 * an action's outcome, so a missed one never loses information.
 */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ReadonlyArray<Toast>>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const notify = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-2), { id, message, tone }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), DURATION[tone]),
      );
    },
    [dismiss],
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.region}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={[styles.toast, toast.tone === 'error' ? styles.error : styles.success]
              .filter(Boolean)
              .join(' ')}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            aria-live={toast.tone === 'error' ? 'assertive' : 'polite'}
          >
            <span className={styles.dot} aria-hidden="true" />
            <span className={styles.message}>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

/**
 * Returns `notify`. Safe to call outside a provider — it becomes a no-op rather
 * than throwing, so a missing provider can never break an action that
 * succeeded.
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  return context ?? { notify: () => undefined };
}
