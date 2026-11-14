import type { ReactNode } from 'react';
import { Icon } from '../../components/icon/Icon';
import type { IconName } from '../../components/icon/icon-data';
import styles from '../admin.module.css';

interface EmptyStateProps {
    icon: IconName;
    title: string;
    hint?: string;
    action?: ReactNode;
}

export function EmptyState({ icon, title, hint, action }: EmptyStateProps) {
    return (
        <div className={styles['empty']}>
            <div className={styles['emptyIcon']}>
                <Icon name={icon} />
            </div>
            <h3>{title}</h3>
            {hint ? <p>{hint}</p> : null}
            {action ?? null}
        </div>
    );
}
