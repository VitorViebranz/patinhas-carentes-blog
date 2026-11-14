import { Link } from 'react-router-dom';
import { Icon } from '../../components/icon/Icon';
import { formatKg } from '../../lib/format';
import type { LeaderboardEntry } from '../../services/api/types';
import styles from './leaderboard.module.css';

interface PodiumProps {
    entries: LeaderboardEntry[];
}

export function Podium({ entries }: PodiumProps) {
    return (
        <ol className={styles['podium']} aria-label="Os três primeiros">
            {entries.map((entry) => (
                <li key={entry.pointId} className={styles['podiumCard']} data-rank={entry.rank}>
                    <span className={styles['medal']}>{entry.rank}º</span>
                    <Icon name="cap" className={styles['podiumIcon']} />
                    <h3>{entry.name}</h3>
                    <p className={styles['place']}>{entry.neighborhood}</p>
                    <p className={styles['podiumKg']}>{formatKg(entry.totalKg)}</p>
                    <p className={styles['pickups']}>
                        {entry.pickups === 1 ? '1 retirada' : `${entry.pickups} retiradas`}
                    </p>
                    <Link className={styles['certLink']} to={`/certificado/${entry.pointId}`}>
                        Ver certificado
                    </Link>
                </li>
            ))}
        </ol>
    );
}
