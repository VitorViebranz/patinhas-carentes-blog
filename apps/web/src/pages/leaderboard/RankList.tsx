import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { formatKg } from '../../lib/format';
import type { LeaderboardEntry } from '../../services/api/types';
import styles from './leaderboard.module.css';

interface RankListProps {
    entries: LeaderboardEntry[];
    topKg: number;
}

export function RankList({ entries, topKg }: RankListProps) {
    return (
        <ol className={styles['rank']} aria-label="Demais pontos">
            {entries.map((entry) => (
                <li
                    key={entry.pointId}
                    className={styles['rankRow']}
                    style={
                        {
                            '--share': `${Math.max(4, (entry.totalKg / topKg) * 100)}%`,
                        } as CSSProperties
                    }
                >
                    <span className={styles['rankNum']}>{entry.rank}º</span>
                    <div className={styles['rankInfo']}>
                        <Link to={`/certificado/${entry.pointId}`}>{entry.name}</Link>
                        <span>{entry.neighborhood}</span>
                        <i className={styles['rankBar']} aria-hidden="true" />
                    </div>
                    <b className={styles['rankKg']}>{formatKg(entry.totalKg)}</b>
                </li>
            ))}
        </ol>
    );
}
