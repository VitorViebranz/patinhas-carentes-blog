import { daysSince, describeLastPickup, formatKg } from '../../lib/format';
import type { PickupSummary } from '../../services/api/admin-types';
import styles from '../admin.module.css';
import { isStale } from '../pickup-input';

interface PickupStatusProps {
    summary: PickupSummary | undefined;
}

export function PickupStatus({ summary }: PickupStatusProps) {
    if (!summary?.lastPickupOn) {
        return <span className={`${styles['chip']} ${styles['chipGray']}`}>Nunca</span>;
    }
    const tone = isStale(daysSince(summary.lastPickupOn)) ? styles['chipWarn'] : styles['chipOk'];
    return (
        <>
            <span className={`${styles['chip']} ${tone}`}>
                {describeLastPickup(summary.lastPickupOn)}
            </span>
            <br />
            <span className={styles['muted']}>{formatKg(summary.totalKg)} no total</span>
        </>
    );
}
