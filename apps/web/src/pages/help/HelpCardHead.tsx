import { Icon } from '../../components/icon/Icon';
import type { IconName } from '../../components/icon/icon-data';
import styles from './help.module.css';

interface HelpCardHeadProps {
    icon: IconName;
    title: string;
}

export function HelpCardHead({ icon, title }: HelpCardHeadProps) {
    return (
        <div className={styles['head']}>
            <span className={styles['bubble']}>
                <Icon name={icon} />
            </span>
            <h2>{title}</h2>
        </div>
    );
}
