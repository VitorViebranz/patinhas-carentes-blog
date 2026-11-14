import type { ReactNode } from 'react';
import { Button } from '../button/Button';
import styles from './state-message.module.css';

interface StateMessageProps {
    kind: 'loading' | 'error' | 'empty';
    children: ReactNode;

    onRetry?: () => void;
}

export function StateMessage({ kind, children, onRetry }: StateMessageProps) {
    return (
        <div
            className={`${styles['box']} ${styles[kind]}`}
            role={kind === 'error' ? 'alert' : 'status'}
            aria-live={kind === 'error' ? 'assertive' : 'polite'}
        >
            <p>{children}</p>
            {kind === 'error' && onRetry ? (
                <Button variant="line" size="sm" onClick={onRetry}>
                    Tentar de novo
                </Button>
            ) : null}
        </div>
    );
}
