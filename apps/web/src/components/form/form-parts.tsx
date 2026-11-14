import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import styles from '../../pages/shared/page.module.css';
import { VisuallyHidden } from '../visually-hidden/VisuallyHidden';

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
    label: string;
    error?: string | undefined;
}

export function TextField({ label, error, ...rest }: TextFieldProps) {
    const id = useId();
    return (
        <div className={styles['field']}>
            <label htmlFor={id}>{label}</label>
            <input
                id={id}
                className={styles['input']}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${id}-error` : undefined}
                {...rest}
            />
            {error ? (
                <span id={`${id}-error`} className={styles['fieldError']}>
                    {error}
                </span>
            ) : null}
        </div>
    );
}

interface ConsentProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    error?: string | undefined;
}

export function ConsentField({ checked, onChange, error }: ConsentProps) {
    const errorId = useId();
    return (
        <div className={styles['field']}>
            <label className={styles['check']}>
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errorId : undefined}
                />
                <span>
                    Concordo em enviar meus dados para a equipe me responder.{' '}
                    <a href="/privacidade" target="_blank" rel="noopener noreferrer">
                        Saiba mais<VisuallyHidden> (abre em outra aba)</VisuallyHidden>
                    </a>
                </span>
            </label>
            {error ? (
                <span id={errorId} className={styles['fieldError']}>
                    {error}
                </span>
            ) : null}
        </div>
    );
}

export function Honeypot({ onChange }: { onChange: (value: string) => void }) {
    return (
        <div className={styles['trap']} aria-hidden="true">
            <label>
                Não preencha este campo
                <input
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    onChange={(e) => onChange(e.target.value)}
                />
            </label>
        </div>
    );
}

export function FormStatus({ error, ok }: { error?: string | undefined; ok?: ReactNode }) {
    if (error) {
        return (
            <p className={styles['formError']} role="alert">
                {error}
            </p>
        );
    }
    if (ok) {
        return (
            <p className={styles['formOk']} role="status">
                {ok}
            </p>
        );
    }
    return null;
}
