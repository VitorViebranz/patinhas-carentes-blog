import {
    useId,
    type InputHTMLAttributes,
    type ReactNode,
    type SelectHTMLAttributes,
    type TextareaHTMLAttributes,
} from 'react';
import styles from '../admin.module.css';

interface Common {
    label: string;
    hint?: ReactNode;
    error?: string | undefined;
}

export function AdminInput({
    label,
    hint,
    error,
    ...rest
}: Common & InputHTMLAttributes<HTMLInputElement>) {
    const id = useId();
    return (
        <div className={styles['fld']}>
            <label htmlFor={id}>{label}</label>
            <input id={id} aria-invalid={error ? true : undefined} {...rest} />
            {hint ? <small>{hint}</small> : null}
            {error ? <span className={styles['fieldError']}>{error}</span> : null}
        </div>
    );
}

export function AdminTextarea({
    label,
    hint,
    error,
    ...rest
}: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
    const id = useId();
    return (
        <div className={styles['fld']}>
            <label htmlFor={id}>{label}</label>
            <textarea id={id} aria-invalid={error ? true : undefined} {...rest} />
            {hint ? <small>{hint}</small> : null}
            {error ? <span className={styles['fieldError']}>{error}</span> : null}
        </div>
    );
}

export function AdminSelect({
    label,
    hint,
    error,
    children,
    ...rest
}: Common & SelectHTMLAttributes<HTMLSelectElement>) {
    const id = useId();
    return (
        <div className={styles['fld']}>
            <label htmlFor={id}>{label}</label>
            <select id={id} aria-invalid={error ? true : undefined} {...rest}>
                {children}
            </select>
            {hint ? <small>{hint}</small> : null}
            {error ? <span className={styles['fieldError']}>{error}</span> : null}
        </div>
    );
}
