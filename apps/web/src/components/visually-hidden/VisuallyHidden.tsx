import type { ElementType, ReactNode } from 'react';
import styles from './visually-hidden.module.css';

interface VisuallyHiddenProps {
    as?: ElementType;
    role?: string;
    children?: ReactNode;
}

export function VisuallyHidden({ as: Tag = 'span', role, children }: VisuallyHiddenProps) {
    return (
        <Tag className={styles['hidden']} role={role}>
            {children}
        </Tag>
    );
}
