import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import styles from '../admin.module.css';

export interface ToastAction {
    label: string;
    onClick: () => void;
}

type ShowToast = (message: string, action?: ToastAction) => void;

interface ToastState {
    message: string;
    action: ToastAction | undefined;
}

const MESSAGE_MS = 3000;
const ACTION_MS = 7000;

const ToastContext = createContext<ShowToast>(() => undefined);

export function useToast(): ShowToast {
    return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toast, setToast] = useState<ToastState | null>(null);
    const show = useCallback<ShowToast>((message, action) => setToast({ message, action }), []);

    useEffect(() => {
        if (!toast) return undefined;
        const timer = window.setTimeout(
            () => setToast(null),
            toast.action ? ACTION_MS : MESSAGE_MS,
        );
        return () => window.clearTimeout(timer);
    }, [toast]);

    return (
        <ToastContext.Provider value={show}>
            {children}
            <div role="status" aria-live="polite">
                {toast ? (
                    <div className={styles['toast']}>
                        <span>{toast.message}</span>
                        {toast.action ? (
                            <button
                                type="button"
                                className={styles['toastAction']}
                                onClick={() => {
                                    toast.action?.onClick();
                                    setToast(null);
                                }}
                            >
                                {toast.action.label}
                            </button>
                        ) : null}
                    </div>
                ) : null}
            </div>
        </ToastContext.Provider>
    );
}
