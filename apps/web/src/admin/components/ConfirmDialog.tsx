import { useEffect, useId, useRef } from 'react';
import { Icon } from '../../components/icon/Icon';
import styles from '../admin.module.css';

interface ConfirmDialogProps {
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel?: string;
    tone?: 'danger' | 'default';
    pending?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDialog({
    title,
    message,
    confirmLabel,
    cancelLabel = 'Cancelar',
    tone = 'danger',
    pending = false,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const titleId = useId();
    const messageId = useId();

    useEffect(() => {
        const dialog = dialogRef.current;
        if (dialog && !dialog.open) dialog.showModal();
    }, []);

    return (
        <dialog
            ref={dialogRef}
            className={styles['confirm']}
            aria-labelledby={titleId}
            aria-describedby={messageId}
            onCancel={(event) => {
                event.preventDefault();
                onCancel();
            }}
            onClick={(event) => {
                if (event.target === dialogRef.current) onCancel();
            }}
        >
            <div
                className={`${styles['confirmIcon']} ${tone === 'default' ? styles['confirmIconInfo'] : ''}`}
            >
                <Icon name="alert" />
            </div>
            <h2 id={titleId}>{title}</h2>
            <p id={messageId}>{message}</p>
            <div className={styles['confirmActions']}>
                <button
                    type="button"
                    className={`${styles['btn']} ${styles['ghost']}`}
                    onClick={onCancel}
                    autoFocus
                >
                    {cancelLabel}
                </button>
                <button
                    type="button"
                    className={`${styles['btn']} ${tone === 'danger' ? styles['btnDanger'] : ''}`}
                    disabled={pending}
                    onClick={onConfirm}
                >
                    {confirmLabel}
                </button>
            </div>
        </dialog>
    );
}
